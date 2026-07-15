import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { auth } from "./auth"

const http = httpRouter()

auth.addHttpRoutes(http)

// ─── Helper: hash API key ──────────────────────────────────────────────────────

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

// ─── Stripe webhook endpoint ───────────────────────────────────────────────────

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signature = req.headers.get("stripe-signature")!
    const mode = (req.headers.get("x-stripe-mode") ?? "test") as "test" | "live"
    const payload = await req.text()

    console.log("[stripe/webhook] received, mode:", mode)

    const result = await ctx.runAction(internal.stripe.handleWebhook, {
      payload,
      signature,
      mode,
    })

    return new Response(JSON.stringify({ received: true }), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    })
  }),
})

// ─── API v1: CORS preflight ────────────────────────────────────────────────────

http.route({
  path: "/api/v1/order",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    })
  }),
})

http.route({
  path: "/api/v1/status",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    })
  }),
})

// ─── API v1: POST /api/v1/order — create order via API key ────────────────────

http.route({
  path: "/api/v1/order",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    console.log("[api/v1/order] incoming request")

    // 1. Extract Bearer token
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || ""
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResp({ error: "Chybí API klíč. Použijte: Authorization: Bearer k4y_..." }, 401)
    }
    const rawKey = authHeader.slice(7).trim()
    if (!rawKey.startsWith("k4y_")) {
      return jsonResp({ error: "Neplatný formát API klíče" }, 401)
    }

    // 2. Hash key and look up
    const hash = await hashApiKey(rawKey)
    const apiKey = await ctx.runQuery(internal.apiKeys.validateByHash, { hash })
    if (!apiKey) {
      console.log("[api/v1/order] invalid or revoked API key")
      return jsonResp({ error: "Neplatný nebo zrušený API klíč" }, 401)
    }

    // 3. Touch last-used
    await ctx.runMutation(internal.apiKeys.touchApiKey, { keyId: apiKey._id })

    // 4. Parse body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResp({ error: "Neplatný JSON v těle požadavku" }, 400)
    }

    // 5. Validate required fields
    const pickup = typeof body.pickup === "string" ? body.pickup : ""
    const delivery = typeof body.delivery === "string" ? body.delivery : ""
    if (!pickup || !delivery) {
      return jsonResp({ error: "Pole 'pickup' a 'delivery' jsou povinná" }, 400)
    }

    const cargoTypeRaw = typeof body.cargoType === "string" ? body.cargoType : "parcel"
    const validCargo = ["envelope", "parcel", "box", "pallet", "other"]
    const cargoType = validCargo.includes(cargoTypeRaw) ? cargoTypeRaw as "envelope" | "parcel" | "box" | "pallet" | "other" : "parcel"

    const now = Date.now()
    const requestedPickupAt = typeof body.requestedPickupAt === "number" ? body.requestedPickupAt : now + 3600_000
    const requestedDeliveryAt = typeof body.requestedDeliveryAt === "number" ? body.requestedDeliveryAt : now + 7200_000

    // 6. Create the ride
    const result = await ctx.runMutation(internal.apiKeys.createRideFromApi, {
      customerId: apiKey.customerId,
      pickupAddress: pickup,
      pickupContactName: typeof body.pickupContactName === "string" ? body.pickupContactName : "",
      pickupContactPhone: typeof body.pickupContactPhone === "string" ? body.pickupContactPhone : "",
      deliveryAddress: delivery,
      deliveryContactName: typeof body.deliveryContactName === "string" ? body.deliveryContactName : "",
      deliveryContactPhone: typeof body.deliveryContactPhone === "string" ? body.deliveryContactPhone : "",
      cargoType,
      cargoDescription: typeof body.cargoDescription === "string" ? body.cargoDescription : "API zásilka",
      quantity: typeof body.quantity === "number" ? body.quantity : 1,
      weight: typeof body.weight === "number" ? body.weight : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      requestedPickupAt,
      requestedDeliveryAt,
    })

    console.log("[api/v1/order] created ride:", result.rideNumber)
    return jsonResp({
      success: true,
      rideNumber: result.rideNumber,
      trackingToken: result.trackingToken,
      trackingUrl: `https://www.kuryr4you.cz/sledovani/${result.trackingToken}`,
    }, 201)
  }),
})

// ─── API v1: GET /api/v1/status?token=xxx — get order status ──────────────────

http.route({
  path: "/api/v1/status",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url)
    const token = url.searchParams.get("token") || ""
    const rideNumber = url.searchParams.get("rideNumber") || ""

    if (!token && !rideNumber) {
      return jsonResp({ error: "Parametr 'token' nebo 'rideNumber' je povinný" }, 400)
    }

    const ride = await ctx.runQuery(internal.apiKeys.getRideForApi, { token, rideNumber })
    if (!ride) {
      return jsonResp({ error: "Zásilka nenalezena" }, 404)
    }

    return jsonResp({
      rideNumber: ride.rideNumber,
      status: ride.status,
      trackingUrl: `https://www.kuryr4you.cz/sledovani/${ride.trackingToken}`,
      pickupAddress: ride.pickupAddress,
      deliveryAddress: ride.deliveryAddress,
      requestedPickupAt: ride.requestedPickupAt,
      requestedDeliveryAt: ride.requestedDeliveryAt,
      podDeliveredAt: ride.podDeliveredAt,
    })
  }),
})

// ─── API v1 / DISPATCH: CORS preflight ────────────────────────────────────────

const dispatchCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
}

const dispatchPaths = [
  "/api/v1/dispatch/summary",
  "/api/v1/dispatch/orders",
  "/api/v1/dispatch/drivers",
  "/api/v1/dispatch/crm",
]

for (const path of dispatchPaths) {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async () => {
      return new Response(null, { status: 204, headers: dispatchCorsHeaders })
    }),
  })
}

// ─── Helper: authenticate dispatcher AI key ────────────────────────────────

async function authDispatchKey(ctx: { runQuery: Function; runMutation: Function }, req: Request) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || ""
  if (!authHeader.startsWith("Bearer ")) return null
  const rawKey = authHeader.slice(7).trim()
  if (!rawKey.startsWith("k4ai_")) return null
  const hash = await hashApiKey(rawKey)
  const apiKey = await ctx.runQuery(internal.aiAccess.validateAiKey, { hash })
  if (!apiKey) return null
  await ctx.runMutation(internal.aiAccess.touchAiKey, { keyId: apiKey._id })
  return apiKey
}

// ─── GET /api/v1/dispatch/summary ─────────────────────────────────────────────

http.route({
  path: "/api/v1/dispatch/summary",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const key = await authDispatchKey(ctx, req)
    if (!key) return jsonResp({ error: "Neplatný nebo chybějící API klíč (k4ai_...)" }, 401)

    const data = await ctx.runQuery(internal.aiAccess.getSummaryForAi, {})
    return jsonResp(data)
  }),
})

// ─── GET /api/v1/dispatch/orders ──────────────────────────────────────────────

http.route({
  path: "/api/v1/dispatch/orders",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const key = await authDispatchKey(ctx, req)
    if (!key) return jsonResp({ error: "Neplatný nebo chybějící API klíč (k4ai_...)" }, 401)

    const url = new URL(req.url)
    const status = url.searchParams.get("status") || "all"
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200)
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0)

    const data = await ctx.runQuery(internal.aiAccess.getOrdersForAi, { status, limit, offset })
    return jsonResp({ orders: data, limit, offset, count: data.length })
  }),
})

// ─── GET /api/v1/dispatch/drivers ─────────────────────────────────────────────

http.route({
  path: "/api/v1/dispatch/drivers",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const key = await authDispatchKey(ctx, req)
    if (!key) return jsonResp({ error: "Neplatný nebo chybějící API klíč (k4ai_...)" }, 401)

    const data = await ctx.runQuery(internal.aiAccess.getDriversForAi, {})
    return jsonResp({ drivers: data, count: data.length })
  }),
})

// ─── GET /api/v1/dispatch/crm ─────────────────────────────────────────────────

http.route({
  path: "/api/v1/dispatch/crm",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const key = await authDispatchKey(ctx, req)
    if (!key) return jsonResp({ error: "Neplatný nebo chybějící API klíč (k4ai_...)" }, 401)

    const url = new URL(req.url)
    const status = url.searchParams.get("status") || "all"
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200)
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0)

    const data = await ctx.runQuery(internal.aiAccess.getCrmForAi, { status, limit, offset })
    return jsonResp({ contacts: data, limit, offset, count: data.length })
  }),
})

export default http
