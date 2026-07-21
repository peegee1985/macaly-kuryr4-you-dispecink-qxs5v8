import { v } from "convex/values"
import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id, Doc } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { notifyDispatchers } from "./presence"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

function generateRideNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `K${y}${m}${d}-${rand}`
}

// ─── Internal: save new API key ────────────────────────────────────────────────

export const saveApiKey = internalMutation({
  args: {
    customerId: v.id("users"),
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
  },
  returns: v.id("apiKeys"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("apiKeys", {
      customerId: args.customerId,
      name: args.name,
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
      active: true,
    })
  },
})

// ─── Internal: validate a key by its hash (used in HTTP handler) ────────────

export const validateByHash = internalQuery({
  args: { hash: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("apiKeys"),
      customerId: v.id("users"),
      name: v.string(),
      keyHash: v.string(),
      keyPrefix: v.string(),
      active: v.boolean(),
      lastUsedAt: v.optional(v.number()),
      webhookUrl: v.optional(v.string()),
      webhookSecret: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("by_hash", q => q.eq("keyHash", args.hash))
      .first()
    if (!key || !key.active) return null
    return key
  },
})

// ─── Internal: mark key as last-used ──────────────────────────────────────────

export const touchApiKey = internalMutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() })
    return null
  },
})

// ─── Internal: create ride from API ───────────────────────────────────────────

export const createRideFromApi = internalMutation({
  args: {
    customerId: v.id("users"),
    pickupAddress: v.string(),
    pickupContactName: v.string(),
    pickupContactPhone: v.string(),
    deliveryAddress: v.string(),
    deliveryContactName: v.string(),
    deliveryContactPhone: v.string(),
    cargoType: v.union(
      v.literal("envelope"), v.literal("parcel"),
      v.literal("box"), v.literal("pallet"), v.literal("other")
    ),
    cargoDescription: v.string(),
    quantity: v.number(),
    weight: v.optional(v.number()),
    notes: v.optional(v.string()),
    requestedPickupAt: v.number(),
    requestedDeliveryAt: v.number(),
  },
  returns: v.object({ rideId: v.id("rides"), rideNumber: v.string(), trackingToken: v.string() }),
  handler: async (ctx, args) => {
    const rideNumber = generateRideNumber()
    const trackingToken = crypto.randomUUID().replace(/-/g, "")
    const ratingToken = crypto.randomUUID().replace(/-/g, "")

    const rideId = await ctx.db.insert("rides", {
      customerId: args.customerId,
      status: "pending",
      pickupAddress: args.pickupAddress,
      pickupContactName: args.pickupContactName,
      pickupContactPhone: args.pickupContactPhone,
      deliveryAddress: args.deliveryAddress,
      deliveryContactName: args.deliveryContactName,
      deliveryContactPhone: args.deliveryContactPhone,
      cargoType: args.cargoType,
      cargoDescription: args.cargoDescription,
      quantity: args.quantity,
      weight: args.weight,
      notes: args.notes,
      requestedPickupAt: args.requestedPickupAt,
      requestedDeliveryAt: args.requestedDeliveryAt,
      trackingToken,
      rideNumber,
      ratingToken,
      isPaid: true, // corporate = invoice billing
      attachmentIds: [],
      podPhotoIds: [],
    })

    // Dispečink: nová zakázka přes API
    await notifyDispatchers(ctx, {
      title: "Nová zakázka",
      message: `${rideNumber} (API): ${args.pickupAddress} → ${args.deliveryAddress}`,
      type: "ride_status",
      rideId,
    })

    console.log("[apiKeys] created ride from API:", rideNumber, "for customer:", args.customerId)
    return { rideId, rideNumber, trackingToken }
  },
})

// ─── Internal: fire webhooks for a ride status change ─────────────────────────

export const fireWebhook = internalAction({
  args: {
    customerId: v.id("users"),
    rideNumber: v.string(),
    trackingToken: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Look up all active API keys for this customer that have a webhook URL
    const keys = await ctx.runQuery(internal.apiKeys.getWebhookKeys, {
      customerId: args.customerId,
    })

    if (keys.length === 0) return null

    const payload = JSON.stringify({
      event: "status_changed",
      rideNumber: args.rideNumber,
      status: args.status,
      trackingUrl: `https://www.kuryr4you.cz/sledovani/${args.trackingToken}`,
      timestamp: new Date().toISOString(),
    })

    for (const key of keys) {
      if (!key.webhookUrl) continue
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Kuryr4You-Event": "status_changed",
        }
        // Add HMAC signature if webhook secret is set
        if (key.webhookSecret) {
          const enc = new TextEncoder()
          const cryptoKey = await crypto.subtle.importKey(
            "raw",
            enc.encode(key.webhookSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          )
          const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload))
          const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
          headers["X-Kuryr4You-Signature"] = `sha256=${sigHex}`
        }

        const resp = await fetch(key.webhookUrl, {
          method: "POST",
          headers,
          body: payload,
        })
        console.log("[webhook] fired to", key.webhookUrl, "→ HTTP", resp.status, "ride:", args.rideNumber)
      } catch (err) {
        console.error("[webhook] failed for key", key._id, err)
      }
    }
    return null
  },
})

// ─── Internal: get webhook-enabled keys for a customer ────────────────────────

export const getWebhookKeys = internalQuery({
  args: { customerId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("apiKeys"),
    webhookUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_customer", q => q.eq("customerId", args.customerId))
      .filter(q => q.eq(q.field("active"), true))
      .collect()
    return keys
      .filter(k => k.webhookUrl)
      .map(k => ({ _id: k._id, webhookUrl: k.webhookUrl, webhookSecret: k.webhookSecret }))
  },
})

// ─── Public: create API key (action — needs crypto.subtle for hashing) ────────

export const createApiKey = action({
  args: {
    customerId: v.id("users"),
    name: v.string(),
  },
  returns: v.object({ keyId: v.id("apiKeys"), plainKey: v.string(), prefix: v.string() }),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.runQuery(internal.apiKeys.getSelf, { userId: authId as Id<"users"> })
    if (!user || user.role !== "dispatcher") throw new Error("Pouze dispečer může vytvářet API klíče")

    // Check target customer exists
    const customer = await ctx.runQuery(internal.apiKeys.getSelf, { userId: args.customerId })
    if (!customer || customer.role !== "customer") throw new Error("Zákazník nenalezen")

    // Generate key: k4y_ + 32 random hex chars
    const raw1 = crypto.randomUUID().replace(/-/g, "")
    const raw2 = crypto.randomUUID().replace(/-/g, "")
    const plainKey = `k4y_${(raw1 + raw2).slice(0, 32)}`
    const prefix = plainKey.slice(0, 12) + "..."

    const keyHash = await hashKey(plainKey)

    const keyId = await ctx.runMutation(internal.apiKeys.saveApiKey, {
      customerId: args.customerId,
      name: args.name,
      keyHash,
      keyPrefix: prefix,
    })

    console.log("[apiKeys] created key for customer:", args.customerId, "prefix:", prefix)
    return { keyId, plainKey, prefix }
  },
})

// ─── Internal: getSelf helper ─────────────────────────────────────────────────

export const getSelf = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      role: v.union(v.literal("dispatcher"), v.literal("driver"), v.literal("customer"), v.literal("vending_supervisor"), v.literal("service_driver")),
      email: v.string(),
      name: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const u = await ctx.db.get(args.userId)
    if (!u) return null
    return { _id: u._id, role: u.role, email: u.email, name: u.name }
  },
})

// ─── Public: list API keys for a customer (dispatcher or own customer) ────────

export const listApiKeys = query({
  args: { customerId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("apiKeys"),
    name: v.string(),
    keyPrefix: v.string(),
    active: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    webhookUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    _creationTime: v.number(),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Uživatel nenalezen")
    if (user.role !== "dispatcher" && authId !== args.customerId) {
      throw new Error("Nemáte oprávnění")
    }

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_customer", q => q.eq("customerId", args.customerId))
      .collect()

    return keys.map(k => ({
      _id: k._id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      active: k.active,
      lastUsedAt: k.lastUsedAt,
      webhookUrl: k.webhookUrl,
      webhookSecret: k.webhookSecret,
      _creationTime: k._creationTime,
    }))
  },
})

// ─── Public: revoke an API key ────────────────────────────────────────────────

export const revokeApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Uživatel nenalezen")

    const key = await ctx.db.get(args.keyId)
    if (!key) throw new Error("API klíč nenalezen")

    if (user.role !== "dispatcher" && authId !== key.customerId) {
      throw new Error("Nemáte oprávnění")
    }

    await ctx.db.patch(args.keyId, { active: false })
    console.log("[apiKeys] revoked key:", args.keyId)
    return null
  },
})

// ─── Internal: get ride for API status endpoint ───────────────────────────────

export const getRideForApi = internalQuery({
  args: { token: v.string(), rideNumber: v.string() },
  returns: v.union(
    v.object({
      rideNumber: v.string(),
      status: v.string(),
      trackingToken: v.string(),
      pickupAddress: v.string(),
      deliveryAddress: v.string(),
      requestedPickupAt: v.number(),
      requestedDeliveryAt: v.number(),
      podDeliveredAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    let ride: Doc<"rides"> | null = null
    if (args.token) {
      ride = await ctx.db
        .query("rides")
        .withIndex("by_tracking_token", q => q.eq("trackingToken", args.token))
        .first()
    }
    if (!ride && args.rideNumber) {
      ride = await ctx.db
        .query("rides")
        .withIndex("by_ride_number", q => q.eq("rideNumber", args.rideNumber))
        .first()
    }
    if (!ride) return null
    return {
      rideNumber: ride.rideNumber,
      status: ride.status,
      trackingToken: ride.trackingToken,
      pickupAddress: ride.pickupAddress,
      deliveryAddress: ride.deliveryAddress,
      requestedPickupAt: ride.requestedPickupAt,
      requestedDeliveryAt: ride.requestedDeliveryAt,
      podDeliveredAt: ride.podDeliveredAt,
    }
  },
})

// ─── Public: update webhook URL & secret ──────────────────────────────────────

export const updateWebhook = mutation({
  args: {
    keyId: v.id("apiKeys"),
    webhookUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Uživatel nenalezen")

    const key = await ctx.db.get(args.keyId)
    if (!key) throw new Error("API klíč nenalezen")

    if (user.role !== "dispatcher" && authId !== key.customerId) {
      throw new Error("Nemáte oprávnění")
    }

    await ctx.db.patch(args.keyId, {
      webhookUrl: args.webhookUrl,
      webhookSecret: args.webhookSecret,
    })
    return null
  },
})
