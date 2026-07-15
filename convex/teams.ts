import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

// ── Queries ────────────────────────────────────────────────────────────────

// List all teams with member count (dispatcher only)
export const listTeams = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("teams"),
    _creationTime: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    color: v.optional(v.string()),
    memberCount: v.number(),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    const teams = await ctx.db.query("teams").collect()
    return await Promise.all(teams.map(async (team) => {
      const members = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect()
      return { ...team, memberCount: members.length }
    }))
  },
})

// Get one team with full member list (dispatcher only)
export const getTeamWithMembers = query({
  args: { teamId: v.id("teams") },
  returns: v.union(v.null(), v.object({
    _id: v.id("teams"),
    _creationTime: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    color: v.optional(v.string()),
    members: v.array(v.object({
      memberId: v.id("teamMembers"),
      driverId: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
      vehicleType: v.optional(v.string()),
      vehiclePlate: v.optional(v.string()),
    })),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return null

    const team = await ctx.db.get(args.teamId)
    if (!team) return null

    const memberRows = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect()

    const members = await Promise.all(memberRows.map(async (row) => {
      const driver = await ctx.db.get(row.driverId)
      return {
        memberId: row._id,
        driverId: row.driverId,
        name: driver?.name,
        email: driver?.email ?? "",
        vehicleType: driver?.vehicleType,
        vehiclePlate: driver?.vehiclePlate,
      }
    }))

    return { ...team, members }
  },
})

// Get the team(s) the current driver belongs to
export const getMyTeams = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("teams"),
    name: v.string(),
    color: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return []

    const rows = await ctx.db
      .query("teamMembers")
      .withIndex("by_driver", (q) => q.eq("driverId", user._id))
      .collect()

    const teams = await Promise.all(rows.map(async (row) => {
      const team = await ctx.db.get(row.teamId)
      if (!team) return null
      return { _id: team._id, name: team.name, color: team.color }
    }))
    return teams.filter(Boolean) as { _id: Id<"teams">; name: string; color?: string }[]
  },
})

// Get teammates of the current driver (for availability view)
export const getMyTeammates = query({
  args: {},
  returns: v.array(v.object({
    driverId: v.id("users"),
    name: v.optional(v.string()),
    email: v.string(),
    teamId: v.id("teams"),
    teamName: v.string(),
    teamColor: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return []

    // Find all teams this driver belongs to
    const myMemberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_driver", (q) => q.eq("driverId", user._id))
      .collect()

    const teammates: { driverId: Id<"users">; name?: string; email: string; teamId: Id<"teams">; teamName: string; teamColor?: string }[] = []
    const seen = new Set<string>()

    for (const membership of myMemberships) {
      const team = await ctx.db.get(membership.teamId)
      if (!team) continue

      const allMembers = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", membership.teamId))
        .collect()

      for (const member of allMembers) {
        // Skip self
        if (member.driverId === user._id) continue
        const key = member.driverId
        if (seen.has(key)) continue
        seen.add(key)

        const driver = await ctx.db.get(member.driverId)
        teammates.push({
          driverId: member.driverId,
          name: driver?.name || undefined,
          email: driver?.email ?? "",
          teamId: team._id,
          teamName: team.name,
          teamColor: team.color,
        })
      }
    }
    return teammates
  },
})

// ── Mutations ──────────────────────────────────────────────────────────────

export const createTeam = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    return await ctx.db.insert("teams", {
      name: args.name,
      description: args.description,
      color: args.color,
      createdBy: caller._id,
    })
  },
})

export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    await ctx.db.patch(args.teamId, {
      name: args.name,
      description: args.description,
      color: args.color,
    })
    return null
  },
})

export const deleteTeam = mutation({
  args: { teamId: v.id("teams") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    // Remove all memberships first
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect()
    await Promise.all(members.map((m) => ctx.db.delete(m._id)))

    await ctx.db.delete(args.teamId)
    return null
  },
})

export const addMember = mutation({
  args: {
    teamId: v.id("teams"),
    driverId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    // Check driver exists
    const driver = await ctx.db.get(args.driverId)
    if (!driver || driver.role !== "driver") throw new Error("Řidič nenalezen")

    // Check not already a member
    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_driver", (q) => q.eq("teamId", args.teamId).eq("driverId", args.driverId))
      .first()
    if (existing) return null // already a member, silently ok

    await ctx.db.insert("teamMembers", {
      teamId: args.teamId,
      driverId: args.driverId,
    })
    return null
  },
})

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    driverId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const row = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_driver", (q) => q.eq("teamId", args.teamId).eq("driverId", args.driverId))
      .first()
    if (row) await ctx.db.delete(row._id)
    return null
  },
})
