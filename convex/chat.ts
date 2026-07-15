import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

function makeConversationKey(a: string, b: string): string {
  return [a, b].sort().join("_")
}

// List all conversations for current user (latest message per partner)
export const getMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) return []

    // Fetch last 200 messages involving me
    const sent = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation")
      .filter(q => q.or(
        q.eq(q.field("senderId"), me._id),
        q.eq(q.field("receiverId"), me._id),
      ))
      .order("desc")
      .take(200)

    // Group by partner, keep latest message per partner
    const seenKeys = new Set<string>()
    const conversations: {
      partnerId: Id<"users">
      partnerName: string
      partnerRole: string
      lastMessage: string
      lastAt: number
      unread: number
    }[] = []

    const partnerUnread: Record<string, number> = {}
    // Count unread first
    for (const msg of sent) {
      if (msg.receiverId === me._id && !msg.read) {
        partnerUnread[msg.senderId] = (partnerUnread[msg.senderId] ?? 0) + 1
      }
    }

    for (const msg of sent) {
      const partnerId = msg.senderId === me._id ? msg.receiverId : msg.senderId
      if (seenKeys.has(partnerId)) continue
      seenKeys.add(partnerId)
      const partner = await ctx.db.get(partnerId)
      if (!partner) continue
      conversations.push({
        partnerId,
        partnerName: partner.name ?? partner.email,
        partnerRole: partner.role,
        lastMessage: msg.text,
        lastAt: msg._creationTime,
        unread: partnerUnread[partnerId] ?? 0,
      })
    }

    return conversations
  },
})

// Get messages in a conversation (last 30 days only)
export const getMessages = query({
  args: { partnerId: v.id("users") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) return []

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const key = makeConversationKey(me._id, args.partnerId)
    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", q => q.eq("conversationKey", key))
      .order("asc")
      .take(500)
    return all.filter(m => m._creationTime >= cutoff)
  },
})

// Get archived messages older than 30 days (paginated, newest first)
export const getArchivedMessages = query({
  args: {
    partnerId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) return []

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const key = makeConversationKey(me._id, args.partnerId)
    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", q => q.eq("conversationKey", key))
      .order("desc")
      .take(1000)
    const archived = all.filter(m => m._creationTime < cutoff)
    const limit = args.limit ?? 100
    return archived.slice(0, limit).reverse()
  },
})

// Count archived messages (older than 30 days)
export const getArchivedMessageCount = query({
  args: { partnerId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return 0
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) return 0

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const key = makeConversationKey(me._id, args.partnerId)
    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", q => q.eq("conversationKey", key))
      .collect()
    return all.filter(m => m._creationTime < cutoff).length
  },
})

// Send a message
export const sendMessage = mutation({
  args: {
    receiverId: v.id("users"),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) throw new Error("Profil nenalezen")
    // Customers are not allowed to use chat
    if (me.role === "customer") throw new Error("Zákazníci nemají přístup k chatu")

    const key = makeConversationKey(me._id, args.receiverId)
    await ctx.db.insert("chatMessages", {
      senderId: me._id,
      receiverId: args.receiverId,
      conversationKey: key,
      text: args.text.trim(),
      read: false,
    })
    console.log(`Chat: ${me.name ?? me.email} → ${args.receiverId}: ${args.text.substring(0, 50)}`)

    // Push notifikace příjemci
    const senderName = me.name ?? me.email ?? "Neznámý"
    const receiverRole = (await ctx.db.get(args.receiverId))?.role ?? "dispatcher"
    const targetUrl = receiverRole === "driver" ? "/ridic" : "/dispatcer"
    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendPushToUser, {
      userId: args.receiverId,
      title: `💬 ${senderName}`,
      body: args.text.trim().substring(0, 100),
      url: targetUrl,
      tag: `chat-${me._id}`,
    })

    return null
  },
})

// Mark all messages from a partner as read
export const markConversationRead = mutation({
  args: { partnerId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) throw new Error("Profil nenalezen")

    const unread = await ctx.db
      .query("chatMessages")
      .withIndex("by_receiver_unread", q => q.eq("receiverId", me._id).eq("read", false))
      .filter(q => q.eq(q.field("senderId"), args.partnerId))
      .collect()

    for (const msg of unread) {
      await ctx.db.patch(msg._id, { read: true })
    }
    return null
  },
})

// Get total unread chat count for current user
export const getUnreadChatCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return 0
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) return 0
    const unread = await ctx.db
      .query("chatMessages")
      .withIndex("by_receiver_unread", q => q.eq("receiverId", me._id).eq("read", false))
      .take(100)
    return unread.length
  },
})

// List all drivers + dispatchers (for dispatcher to start a chat)
export const getChatUsers = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) return []

    const users = await ctx.db
      .query("users")
      .filter(q => q.neq(q.field("_id"), me._id))
      .filter(q => q.or(
        q.eq(q.field("role"), "driver"),
        q.eq(q.field("role"), "dispatcher"),
      ))
      .collect()

    return users
      .filter(u => u.status === "active")
      .map(u => ({ _id: u._id, name: u.name ?? u.email, role: u.role, email: u.email }))
  },
})
