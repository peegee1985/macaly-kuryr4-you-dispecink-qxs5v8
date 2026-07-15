import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

// Save push subscription for the current user
export const saveSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const userId = authId as Id<"users">

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent,
      })
    } else {
      await ctx.db.insert("pushSubscriptions", {
        userId,
        endpoint: args.endpoint,
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent,
      })
    }
    return null
  },
})

// Remove push subscription
export const removeSubscription = mutation({
  args: { endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const userId = authId as Id<"users">

    const sub = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique()

    if (sub && sub.userId === userId) {
      await ctx.db.delete(sub._id)
    }
    return null
  },
})

// Check if current user has any push subscriptions
export const hasSubscription = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return false
    const userId = authId as Id<"users">

    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1)

    return subs.length > 0
  },
})

// Internal: get all subscriptions for a user
export const getSubscriptionsForUser = internalMutation({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("pushSubscriptions"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  })),
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()
    return subs.map(s => ({ _id: s._id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }))
  },
})

// Internal: delete a stale subscription by id
export const deleteSubscription = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId)
    return null
  },
})
