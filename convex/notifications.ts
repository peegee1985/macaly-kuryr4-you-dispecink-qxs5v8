import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

// Get my notifications
export const getMyNotifications = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("notifications"),
    _creationTime: v.number(),
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    type: v.union(
      v.literal("ride_status"), v.literal("ride_assigned"),
      v.literal("invoice"), v.literal("approval"), v.literal("system"),
    ),
    rideId: v.optional(v.id("rides")),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) return []
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50)
  },
})

// Mark notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Profil nenalezen")
    const notification = await ctx.db.get(args.notificationId)
    if (!notification) throw new Error("Notifikace nenalezena")
    if (notification.userId !== user._id) throw new Error("Přístup odepřen")
    await ctx.db.patch(args.notificationId, { read: true })
    return null
  },
})

// Mark all as read
export const markAllAsRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Profil nenalezen")

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect()

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true })
    }
    return null
  },
})

// Get unread count
export const getUnreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return 0
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) return 0
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("read", false))
      .take(100)
    return unread.length
  },
})
