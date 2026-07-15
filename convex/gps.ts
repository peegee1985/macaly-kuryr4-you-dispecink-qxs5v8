import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

// Driver: update GPS location
export const updateLocation = mutation({
  args: {
    lat: v.number(),
    lng: v.number(),
    accuracy: v.optional(v.number()),
    speed: v.optional(v.number()),
    heading: v.optional(v.number()),
    isTracking: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") throw new Error("Pouze řidiči mohou sdílet polohu")

    const existing = await ctx.db
      .query("gpsLocations")
      .withIndex("by_driver", (q) => q.eq("driverId", user._id))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        lat: args.lat,
        lng: args.lng,
        accuracy: args.accuracy,
        speed: args.speed,
        heading: args.heading,
        isTracking: args.isTracking,
        updatedAt: Date.now(),
        adminStopRequested: false, // clear any admin stop flag on each update
      })
    } else {
      await ctx.db.insert("gpsLocations", {
        driverId: user._id,
        lat: args.lat,
        lng: args.lng,
        accuracy: args.accuracy,
        speed: args.speed,
        heading: args.heading,
        isTracking: args.isTracking,
        updatedAt: Date.now(),
      })
    }
    return null
  },
})

// Dispatcher: get all active driver locations
export const getAllDriverLocations = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("gpsLocations"),
    driverId: v.id("users"),
    driverName: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    accuracy: v.optional(v.number()),
    speed: v.optional(v.number()),
    heading: v.optional(v.number()),
    isTracking: v.boolean(),
    updatedAt: v.number(),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    const locations = await ctx.db.query("gpsLocations").collect()
    const result = await Promise.all(
      locations.map(async (loc) => {
        const driver = await ctx.db.get(loc.driverId)
        return {
          _id: loc._id,
          driverId: loc.driverId,
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
          speed: loc.speed,
          heading: loc.heading,
          isTracking: loc.isTracking,
          updatedAt: loc.updatedAt,
          driverName: driver?.name,
          vehiclePlate: driver?.vehiclePlate,
        }
      })
    )
    return result
  },
})

// Driver: get own GPS status (incl. adminStopRequested flag)
export const getMyGPSStatus = query({
  args: {},
  returns: v.union(
    v.object({
      isTracking: v.boolean(),
      adminStopRequested: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return null
    const loc = await ctx.db
      .query("gpsLocations")
      .withIndex("by_driver", (q) => q.eq("driverId", user._id))
      .first()
    if (!loc) return null
    return { isTracking: loc.isTracking, adminStopRequested: loc.adminStopRequested }
  },
})

// Dispatcher: force-stop a driver's GPS
export const forceStopDriverGPS = mutation({
  args: { driverId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Pouze dispečer může zastavit GPS")
    const loc = await ctx.db
      .query("gpsLocations")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .first()
    if (loc) {
      await ctx.db.patch(loc._id, {
        isTracking: false,
        adminStopRequested: true,
        updatedAt: Date.now(),
      })
    }
    console.log(`Dispatcher ${caller.name} force-stopped GPS for driver ${args.driverId}`)
    return null
  },
})

// Get single driver location (for customer tracking)
export const getDriverLocation = query({
  args: { driverId: v.id("users") },
  returns: v.union(
    v.object({
      lat: v.number(),
      lng: v.number(),
      isTracking: v.boolean(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller) return null
    // Dispatcher can see all drivers; drivers can only see their own location; customers blocked
    if (caller.role !== "dispatcher" && caller._id !== args.driverId) return null
    const loc = await ctx.db
      .query("gpsLocations")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .first()
    if (!loc) return null
    return { lat: loc.lat, lng: loc.lng, isTracking: loc.isTracking, updatedAt: loc.updatedAt }
  },
})
