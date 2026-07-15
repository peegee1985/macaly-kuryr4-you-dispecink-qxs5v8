import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

const availabilityValidator = v.object({
  _id: v.id("driverAvailability"),
  _creationTime: v.number(),
  driverId: v.id("users"),
  date: v.string(),
  available: v.boolean(),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  notes: v.optional(v.string()),
})

// Driver: set availability for a date
export const setAvailability = mutation({
  args: {
    date: v.string(),
    available: v.boolean(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") throw new Error("Pouze řidiči mohou nastavovat dostupnost")

    const existing = await ctx.db
      .query("driverAvailability")
      .withIndex("by_driver_date", (q) => q.eq("driverId", user._id).eq("date", args.date))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        available: args.available,
        startTime: args.startTime,
        endTime: args.endTime,
        notes: args.notes,
      })
    } else {
      await ctx.db.insert("driverAvailability", {
        driverId: user._id,
        date: args.date,
        available: args.available,
        startTime: args.startTime,
        endTime: args.endTime,
        notes: args.notes,
      })
    }
    return null
  },
})

// Get availability for a date range (all drivers)
export const getAvailabilityForRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("driverAvailability"),
    _creationTime: v.number(),
    driverId: v.id("users"),
    driverName: v.optional(v.string()),
    date: v.string(),
    available: v.boolean(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    notes: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    // Only dispatchers and drivers can see driver availability
    if (!caller || caller.role === "customer") return []

    const entries = await ctx.db
      .query("driverAvailability")
      .withIndex("by_date")
      .filter((q) => q.and(
        q.gte(q.field("date"), args.startDate),
        q.lte(q.field("date"), args.endDate),
      ))
      .collect()

    // Enrich with driver names
    const result = await Promise.all(
      entries.map(async (entry) => {
        const driver = await ctx.db.get(entry.driverId)
        return {
          ...entry,
          driverName: driver?.name,
        }
      })
    )
    return result
  },
})

// Get availability of team members for the current driver
export const getTeamAvailability = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("driverAvailability"),
    _creationTime: v.number(),
    driverId: v.id("users"),
    driverName: v.optional(v.string()),
    teamName: v.optional(v.string()),
    teamColor: v.optional(v.string()),
    date: v.string(),
    available: v.boolean(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    notes: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return []

    // Find all teams this driver belongs to
    const myMemberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_driver", (q) => q.eq("driverId", user._id))
      .collect()

    const teammateIds = new Set<Id<"users">>()
    const teammateTeam = new Map<string, { teamName: string; teamColor?: string }>()

    for (const membership of myMemberships) {
      const team = await ctx.db.get(membership.teamId)
      if (!team) continue
      const allMembers = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", membership.teamId))
        .collect()
      for (const m of allMembers) {
        if (m.driverId === user._id) continue
        teammateIds.add(m.driverId)
        if (!teammateTeam.has(m.driverId)) {
          teammateTeam.set(m.driverId, { teamName: team.name, teamColor: team.color })
        }
      }
    }

    if (teammateIds.size === 0) return []

    // Fetch availability for all teammates in the date range
    const allEntries = await ctx.db
      .query("driverAvailability")
      .withIndex("by_date")
      .filter((q) => q.and(
        q.gte(q.field("date"), args.startDate),
        q.lte(q.field("date"), args.endDate),
      ))
      .collect()

    const filtered = allEntries.filter((e) => teammateIds.has(e.driverId))

    return await Promise.all(filtered.map(async (entry) => {
      const driver = await ctx.db.get(entry.driverId)
      const team = teammateTeam.get(entry.driverId)
      return {
        ...entry,
        driverName: driver?.name || driver?.email || undefined,
        teamName: team?.teamName,
        teamColor: team?.teamColor,
      }
    }))
  },
})

// Get own availability (driver)
export const getMyAvailability = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(availabilityValidator),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return []

    return await ctx.db
      .query("driverAvailability")
      .withIndex("by_driver", (q) => q.eq("driverId", user._id))
      .filter((q) => q.and(
        q.gte(q.field("date"), args.startDate),
        q.lte(q.field("date"), args.endDate),
      ))
      .collect()
  },
})
