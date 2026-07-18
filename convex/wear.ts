import { v } from "convex/values"
import { internalMutation, internalQuery, mutation } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"
import { rejectRideCore, selfAssignRideCore, updateRideStatusCore } from "./rides"

const PAIRING_TTL_MS = 10 * 60 * 1000

// ─── Párování (volá řidič z telefonní aplikace) ─────────────────────────────

export const createWearPairingCode = mutation({
  args: {},
  returns: v.object({ code: v.string(), expiresAt: v.number() }),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || (user.role !== "driver" && user.role !== "service_driver")) {
      throw new Error("Párování hodinek je dostupné jen pro řidiče")
    }

    // Zrušit případné starší nevyužité kódy
    const old = await ctx.db
      .query("wearPairings")
      .withIndex("by_driver", (q) => q.eq("driverId", user._id))
      .collect()
    for (const p of old) await ctx.db.delete(p._id)

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = Date.now() + PAIRING_TTL_MS
    await ctx.db.insert("wearPairings", { driverId: user._id, code, expiresAt })
    return { code, expiresAt }
  },
})

// ─── Interní funkce pro HTTP endpointy (http.ts) ────────────────────────────

export const redeemPairingCode = internalMutation({
  args: { code: v.string(), tokenHash: v.string() },
  returns: v.union(v.null(), v.object({ driverId: v.string(), name: v.string() })),
  handler: async (ctx, args) => {
    const pairing = await ctx.db
      .query("wearPairings")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()
    if (!pairing) return null
    await ctx.db.delete(pairing._id)
    if (pairing.expiresAt < Date.now()) return null

    const user = await ctx.db.get(pairing.driverId)
    if (!user) return null

    await ctx.db.insert("wearTokens", {
      driverId: pairing.driverId,
      tokenHash: args.tokenHash,
      createdAt: Date.now(),
    })
    return { driverId: pairing.driverId as string, name: user.name ?? user.email }
  },
})

export const validateWearToken = internalQuery({
  args: { hash: v.string() },
  returns: v.union(v.null(), v.object({ driverId: v.string(), name: v.string() })),
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("wearTokens")
      .withIndex("by_hash", (q) => q.eq("tokenHash", args.hash))
      .first()
    if (!token) return null
    const user = await ctx.db.get(token.driverId)
    if (!user) return null
    return { driverId: token.driverId as string, name: user.name ?? user.email }
  },
})

export const touchWearToken = internalMutation({
  args: { hash: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("wearTokens")
      .withIndex("by_hash", (q) => q.eq("tokenHash", args.hash))
      .first()
    if (token) await ctx.db.patch(token._id, { lastUsedAt: Date.now() })
    return null
  },
})

const ACTIVE_STATUSES = new Set(["assigned", "pickup", "transit"])

export const getWearRides = internalQuery({
  args: { driverId: v.id("users") },
  handler: async (ctx, args) => {
    const rides = await ctx.db
      .query("rides")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .order("desc")
      .take(100)

    return rides
      .filter((r) => ACTIVE_STATUSES.has(r.status))
      .map((r) => ({
        rideId: r._id as string,
        rideNumber: r.rideNumber,
        status: r.status,
        pickupAddress: r.pickupAddress,
        pickupContactPhone: r.pickupContactPhone,
        deliveryAddress: r.deliveryAddress,
        deliveryContactPhone: r.deliveryContactPhone,
        requestedPickupAt: r.requestedPickupAt,
        requestedDeliveryAt: r.requestedDeliveryAt,
        notes: r.notes,
      }))
  },
})

export const getWearAvailable = internalQuery({
  args: { driverId: v.id("users") },
  handler: async (ctx, args) => {
    const approved = await ctx.db
      .query("rides")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("asc")
      .take(50)

    const rejections = await ctx.db
      .query("rideRejections")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .collect()
    const rejectedIds = new Set(rejections.map((r) => r.rideId))

    const cutoff = Date.now() - 3600000
    return approved
      .filter((r) => !r.driverId && r.requestedPickupAt > cutoff && !rejectedIds.has(r._id))
      .map((r) => ({
        rideId: r._id as string,
        rideNumber: r.rideNumber,
        pickupAddress: r.pickupAddress,
        deliveryAddress: r.deliveryAddress,
        requestedPickupAt: r.requestedPickupAt,
        requestedDeliveryAt: r.requestedDeliveryAt,
        cargoDescription: r.cargoDescription,
        notes: r.notes,
      }))
  },
})

export const wearSelfAssign = internalMutation({
  args: { driverId: v.id("users"), rideId: v.id("rides") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.driverId)
    if (!user || (user.role !== "driver" && user.role !== "service_driver")) {
      throw new Error("Neplatný řidič")
    }
    await selfAssignRideCore(ctx, user, args.rideId)
    return null
  },
})

export const wearReject = internalMutation({
  args: { driverId: v.id("users"), rideId: v.id("rides") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.driverId)
    if (!user || (user.role !== "driver" && user.role !== "service_driver")) {
      throw new Error("Neplatný řidič")
    }
    await rejectRideCore(ctx, user, args.rideId)
    return null
  },
})

export const wearSetStatus = internalMutation({
  args: {
    driverId: v.id("users"),
    rideId: v.id("rides"),
    status: v.union(v.literal("pickup"), v.literal("transit")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.driverId)
    if (!user || (user.role !== "driver" && user.role !== "service_driver")) {
      throw new Error("Neplatný řidič")
    }
    await updateRideStatusCore(ctx, user, { rideId: args.rideId, status: args.status })
    return null
  },
})
