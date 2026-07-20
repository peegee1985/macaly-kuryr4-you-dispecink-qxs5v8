import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

function makeConversationKey(a: string, b: string): string {
  return [a, b].sort().join("_")
}

function canUseChat(role: string): boolean {
  return role === "driver" || role === "dispatcher"
}

// List all conversations for current user (latest message per partner)
export const getMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) return []
    if (!canUseChat(me.role)) return []

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
        lastMessage: msg.text || (msg.imageStorageId ? "📷 Fotografie" : "Zpráva"),
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
    if (!canUseChat(me.role)) return []

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const key = makeConversationKey(me._id, args.partnerId)
    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", q => q.eq("conversationKey", key))
      .order("asc")
      .take(500)
    const recent = all.filter(m => m._creationTime >= cutoff)
    return await Promise.all(recent.map(async (message) => ({
      ...message,
      imageUrl: message.imageStorageId
        ? await ctx.storage.getUrl(message.imageStorageId)
        : null,
    })))
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
    if (!canUseChat(me.role)) return []

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const key = makeConversationKey(me._id, args.partnerId)
    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", q => q.eq("conversationKey", key))
      .order("desc")
      .take(1000)
    const archived = all.filter(m => m._creationTime < cutoff)
    const limit = args.limit ?? 100
    return await Promise.all(archived.slice(0, limit).reverse().map(async (message) => ({
      ...message,
      imageUrl: message.imageStorageId
        ? await ctx.storage.getUrl(message.imageStorageId)
        : null,
    })))
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
    if (!canUseChat(me.role)) return 0

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const key = makeConversationKey(me._id, args.partnerId)
    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", q => q.eq("conversationKey", key))
      .collect()
    return all.filter(m => m._creationTime < cutoff).length
  },
})

// Generate a short-lived upload URL for a chat image. Only chat-enabled roles
// can create one; the image itself is only exposed through participant queries.
export const generateImageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || !canUseChat(me.role)) throw new Error("Nemáte oprávnění používat chat")
    return await ctx.storage.generateUploadUrl()
  },
})

// Send a text message, an image, or both.
export const sendMessage = mutation({
  args: {
    receiverId: v.id("users"),
    text: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    imageMimeType: v.optional(v.string()),
    imageName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) throw new Error("Profil nenalezen")
    if (!canUseChat(me.role)) throw new Error("Zákaznické účty nemají přístup k chatu")
    const receiver = await ctx.db.get(args.receiverId)
    if (!receiver || receiver.status !== "active") throw new Error("Příjemce není dostupný")
    if (!canUseChat(receiver.role)) throw new Error("Tomuto účtu nelze poslat zprávu")
    if (receiver._id === me._id) throw new Error("Nelze poslat zprávu sám sobě")

    const text = args.text?.trim() ?? ""
    if (!text && !args.imageStorageId) throw new Error("Zpráva je prázdná")
    if (text.length > 2000) throw new Error("Zpráva je příliš dlouhá")

    let imageMimeType: string | undefined
    let imageName: string | undefined
    if (args.imageStorageId) {
      const metadata = await ctx.storage.getMetadata(args.imageStorageId)
      if (!metadata) throw new Error("Fotografie nebyla nalezena")
      imageMimeType = metadata.contentType ?? args.imageMimeType
      if (!imageMimeType?.startsWith("image/")) throw new Error("Příloha musí být obrázek")
      if (metadata.size > 12 * 1024 * 1024) throw new Error("Fotografie může mít nejvýše 12 MB")
      imageName = args.imageName?.trim().slice(0, 200) || undefined
    }

    const key = makeConversationKey(me._id, args.receiverId)
    await ctx.db.insert("chatMessages", {
      senderId: me._id,
      receiverId: args.receiverId,
      conversationKey: key,
      text,
      imageStorageId: args.imageStorageId,
      imageMimeType,
      imageName,
      read: false,
    })
    const notificationText = text || "📷 Fotografie"
    console.log(`Chat: ${me.name ?? me.email} → ${args.receiverId}: ${notificationText.substring(0, 50)}`)

    // Push notifikace příjemci
    const senderName = me.name ?? me.email ?? "Neznámý"
    const targetUrl = receiver.role === "driver"
      ? "/ridic"
      : "/dispatcer"
    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendPushToUser, {
      userId: args.receiverId,
      title: `💬 ${senderName}`,
      body: notificationText.substring(0, 100),
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
    if (!canUseChat(me.role)) throw new Error("Zákaznické účty nemají přístup k chatu")

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
    if (!canUseChat(me.role)) return 0
    const unread = await ctx.db
      .query("chatMessages")
      .withIndex("by_receiver_unread", q => q.eq("receiverId", me._id).eq("read", false))
      .take(100)
    return unread.length
  },
})

// List users the current role is allowed to contact.
export const getChatUsers = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me) return []
    if (!canUseChat(me.role)) return []

    const users = await ctx.db
      .query("users")
      .filter(q => q.neq(q.field("_id"), me._id))
      .collect()

    return users
      .filter(u => {
        if (u.status !== "active") return false
        if (me.role === "dispatcher") return ["driver", "dispatcher"].includes(u.role)
        if (me.role === "driver") return u.role === "dispatcher" || u.role === "driver"
        return false
      })
      .map(u => ({ _id: u._id, name: u.name ?? u.email, role: u.role, email: u.email }))
  },
})
