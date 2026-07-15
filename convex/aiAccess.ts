import { v } from "convex/values"
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id, Doc } from "./_generated/dataModel"
import { internal } from "./_generated/api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

// ─── Internal: validate dispatcher-scoped AI key ───────────────────────────

export const validateAiKey = internalQuery({
  args: { hash: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("apiKeys"),
      customerId: v.id("users"),
      name: v.string(),
      scope: v.optional(v.union(v.literal("customer"), v.literal("dispatcher"))),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("by_hash", q => q.eq("keyHash", args.hash))
      .first()
    if (!key || !key.active) return null
    if (key.scope !== "dispatcher") return null
    return { _id: key._id, customerId: key.customerId, name: key.name, scope: key.scope }
  },
})

// ─── Internal: touch AI key last-used ─────────────────────────────────────

export const touchAiKey = internalMutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() })
    return null
  },
})

// ─── Internal: GET /dispatch/summary ──────────────────────────────────────

export const getSummaryForAi = internalQuery({
  args: {},
  returns: v.object({
    total: v.number(),
    byStatus: v.object({
      pending: v.number(),
      approved: v.number(),
      assigned: v.number(),
      pickup: v.number(),
      transit: v.number(),
      delivered: v.number(),
      cancelled: v.number(),
      failed: v.number(),
    }),
    activeDrivers: v.number(),
    todayDelivered: v.number(),
  }),
  handler: async (ctx) => {
    const allRides = await ctx.db.query("rides").collect()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTs = today.getTime()

    const byStatus = {
      pending: 0, approved: 0, assigned: 0, pickup: 0,
      transit: 0, delivered: 0, cancelled: 0, failed: 0,
    } as Record<string, number>
    let todayDelivered = 0

    for (const r of allRides) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
      if (r.status === "delivered" && r.podDeliveredAt && r.podDeliveredAt >= todayTs) {
        todayDelivered++
      }
    }

    const gpsRecords = await ctx.db.query("gpsLocations").collect()
    const fiveMin = Date.now() - 5 * 60 * 1000
    const activeDrivers = gpsRecords.filter(g => g.isTracking && g.updatedAt > fiveMin).length

    return {
      total: allRides.length,
      byStatus: {
        pending: byStatus.pending ?? 0,
        approved: byStatus.approved ?? 0,
        assigned: byStatus.assigned ?? 0,
        pickup: byStatus.pickup ?? 0,
        transit: byStatus.transit ?? 0,
        delivered: byStatus.delivered ?? 0,
        cancelled: byStatus.cancelled ?? 0,
        failed: byStatus.failed ?? 0,
      },
      activeDrivers,
      todayDelivered,
    }
  },
})

// ─── Internal: GET /dispatch/orders ───────────────────────────────────────

export const getOrdersForAi = internalQuery({
  args: {
    status: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  returns: v.array(v.object({
    rideNumber: v.string(),
    status: v.string(),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    cargoType: v.string(),
    cargoDescription: v.string(),
    weight: v.optional(v.number()),
    quantity: v.number(),
    requestedPickupAt: v.number(),
    requestedDeliveryAt: v.number(),
    podDeliveredAt: v.optional(v.number()),
    driverId: v.optional(v.string()),
    notes: v.optional(v.string()),
    trackingUrl: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    let rides: Doc<"rides">[]
    if (args.status && args.status !== "all") {
      rides = await ctx.db
        .query("rides")
        .withIndex("by_status", q => q.eq("status", args.status as Doc<"rides">["status"]))
        .order("desc")
        .collect()
    } else {
      rides = await ctx.db.query("rides").order("desc").collect()
    }

    const sliced = rides.slice(args.offset, args.offset + args.limit)

    return sliced.map(r => ({
      rideNumber: r.rideNumber,
      status: r.status,
      pickupAddress: r.pickupAddress,
      deliveryAddress: r.deliveryAddress,
      cargoType: r.cargoType,
      cargoDescription: r.cargoDescription,
      weight: r.weight,
      quantity: r.quantity,
      requestedPickupAt: r.requestedPickupAt,
      requestedDeliveryAt: r.requestedDeliveryAt,
      podDeliveredAt: r.podDeliveredAt,
      driverId: r.driverId ?? undefined,
      notes: r.notes,
      trackingUrl: `https://www.kuryr4you.cz/sledovani/${r.trackingToken}`,
      createdAt: r._creationTime,
    }))
  },
})

// ─── Internal: GET /dispatch/drivers ──────────────────────────────────────

export const getDriversForAi = internalQuery({
  args: {},
  returns: v.array(v.object({
    driverId: v.string(),
    name: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    isTracking: v.boolean(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    speed: v.optional(v.number()),
    lastSeen: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const drivers = await ctx.db
      .query("users")
      .withIndex("by_role", q => q.eq("role", "driver"))
      .collect()
    const serviceDrivers = await ctx.db
      .query("users")
      .withIndex("by_role", q => q.eq("role", "service_driver"))
      .collect()
    const allDrivers = [...drivers, ...serviceDrivers]

    const gpsMap = new Map<string, Doc<"gpsLocations">>()
    const gpsRecords = await ctx.db.query("gpsLocations").collect()
    for (const g of gpsRecords) {
      gpsMap.set(g.driverId, g)
    }

    return allDrivers.map(d => {
      const gps = gpsMap.get(d._id)
      return {
        driverId: d._id as string,
        name: d.name,
        email: d.email,
        phone: d.phone,
        isTracking: gps?.isTracking ?? false,
        lat: gps?.lat,
        lng: gps?.lng,
        speed: gps?.speed != null ? Math.round(gps.speed * 3.6) : undefined, // km/h
        lastSeen: gps?.updatedAt,
      }
    })
  },
})

// ─── Internal: GET /dispatch/crm ──────────────────────────────────────────

export const getCrmForAi = internalQuery({
  args: {
    status: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  returns: v.array(v.object({
    id: v.string(),
    type: v.string(),
    name: v.string(),
    companyName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    ico: v.optional(v.string()),
    tags: v.array(v.string()),
    status: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    let contacts: Doc<"crmContacts">[]
    if (args.status && args.status !== "all") {
      contacts = await ctx.db
        .query("crmContacts")
        .withIndex("by_status", q => q.eq("status", args.status as Doc<"crmContacts">["status"]))
        .collect()
    } else {
      contacts = await ctx.db.query("crmContacts").collect()
    }

    const sliced = contacts.slice(args.offset, args.offset + args.limit)

    return sliced.map(c => ({
      id: c._id as string,
      type: c.type,
      name: c.name,
      companyName: c.companyName,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      ico: c.ico,
      tags: c.tags,
      status: c.status,
      notes: c.notes,
      createdAt: c._creationTime,
    }))
  },
})

// ─── Public: create dispatcher AI key ─────────────────────────────────────

export const createAiKey = action({
  args: { name: v.string() },
  returns: v.object({ keyId: v.id("apiKeys"), plainKey: v.string(), prefix: v.string() }),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.runQuery(internal.aiAccess.getUser, { userId: authId as Id<"users"> })
    if (!user || user.role !== "dispatcher") throw new Error("Pouze dispečer může vytvářet AI klíče")

    const raw1 = crypto.randomUUID().replace(/-/g, "")
    const raw2 = crypto.randomUUID().replace(/-/g, "")
    const plainKey = `k4ai_${(raw1 + raw2).slice(0, 32)}`
    const prefix = plainKey.slice(0, 13) + "..."
    const keyHash = await hashKey(plainKey)

    const keyId = await ctx.runMutation(internal.aiAccess.saveAiKey, {
      dispatcherId: authId as Id<"users">,
      name: args.name,
      keyHash,
      keyPrefix: prefix,
    })

    console.log("[aiAccess] created AI key:", prefix, "by dispatcher:", authId)
    return { keyId, plainKey, prefix }
  },
})

// ─── Public: list AI keys (dispatcher only) ────────────────────────────────

export const listAiKeys = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("apiKeys"),
    name: v.string(),
    keyPrefix: v.string(),
    active: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    _creationTime: v.number(),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_customer", q => q.eq("customerId", authId as Id<"users">))
      .collect()

    return keys
      .filter(k => k.scope === "dispatcher")
      .map(k => ({
        _id: k._id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        active: k.active,
        lastUsedAt: k.lastUsedAt,
        _creationTime: k._creationTime,
      }))
  },
})

// ─── Public: revoke AI key ─────────────────────────────────────────────────

export const revokeAiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Pouze dispečer")

    const key = await ctx.db.get(args.keyId)
    if (!key || key.customerId !== authId) throw new Error("Klíč nenalezen")

    await ctx.db.patch(args.keyId, { active: false })
    console.log("[aiAccess] revoked AI key:", args.keyId)
    return null
  },
})

// ─── Internal: save AI key ────────────────────────────────────────────────

export const saveAiKey = internalMutation({
  args: {
    dispatcherId: v.id("users"),
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
  },
  returns: v.id("apiKeys"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("apiKeys", {
      customerId: args.dispatcherId,
      name: args.name,
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
      active: true,
      scope: "dispatcher",
    })
  },
})

// ─── Internal: get user ────────────────────────────────────────────────────

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      role: v.union(
        v.literal("dispatcher"), v.literal("driver"), v.literal("customer"),
        v.literal("vending_supervisor"), v.literal("service_driver")
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const u = await ctx.db.get(args.userId)
    if (!u) return null
    return { _id: u._id, role: u.role }
  },
})
