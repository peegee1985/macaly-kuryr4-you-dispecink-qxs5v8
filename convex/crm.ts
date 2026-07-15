import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

// ── Queries ────────────────────────────────────────────────────────────────

export const listContacts = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    return await ctx.db
      .query("crmContacts")
      .order("desc")
      .take(500)
  },
})

export const getContact = query({
  args: { contactId: v.id("crmContacts") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return null

    return await ctx.db.get(args.contactId)
  },
})

export const getContactNotes = query({
  args: { contactId: v.id("crmContacts") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    return await ctx.db
      .query("crmNotes")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .collect()
  },
})

export const getContactActivities = query({
  args: { contactId: v.id("crmContacts") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    return await ctx.db
      .query("crmActivities")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .collect()
  },
})

export const getContactStats = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return { total: 0, active: 0, leads: 0, inactive: 0 }
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return { total: 0, active: 0, leads: 0, inactive: 0 }

    const all = await ctx.db.query("crmContacts").collect()
    const total = all.length
    const active = all.filter((c) => c.status === "active").length
    const leads = all.filter((c) => c.status === "lead").length
    const inactive = all.filter((c) => c.status === "inactive").length

    return { total, active, leads, inactive }
  },
})

// ── Mutations ──────────────────────────────────────────────────────────────

export const createContact = mutation({
  args: {
    type: v.union(v.literal("company"), v.literal("person")),
    name: v.string(),
    companyName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    ico: v.optional(v.string()),
    dic: v.optional(v.string()),
    tags: v.array(v.string()),
    status: v.union(v.literal("lead"), v.literal("active"), v.literal("inactive")),
    linkedUserId: v.optional(v.id("users")),
    assignedTo: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const contactId = await ctx.db.insert("crmContacts", {
      ...args,
      createdBy: caller._id,
    })

    await ctx.db.insert("crmActivities", {
      contactId,
      authorId: caller._id,
      action: "Kontakt vytvořen",
      detail: args.name,
    })

    return contactId
  },
})

export const updateContact = mutation({
  args: {
    contactId: v.id("crmContacts"),
    type: v.optional(v.union(v.literal("company"), v.literal("person"))),
    name: v.optional(v.string()),
    companyName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    ico: v.optional(v.string()),
    dic: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("lead"), v.literal("active"), v.literal("inactive"))),
    linkedUserId: v.optional(v.id("users")),
    assignedTo: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const { contactId, ...fields } = args
    // Only patch defined fields
    const patch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value
      }
    }

    await ctx.db.patch(contactId, patch)

    await ctx.db.insert("crmActivities", {
      contactId,
      authorId: caller._id,
      action: "Kontakt upraven",
      detail: args.name ?? undefined,
    })
  },
})

export const deleteContact = mutation({
  args: { contactId: v.id("crmContacts") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    // Delete related notes
    const notes = await ctx.db
      .query("crmNotes")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect()
    for (const note of notes) {
      await ctx.db.delete(note._id)
    }

    // Delete related activities
    const activities = await ctx.db
      .query("crmActivities")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect()
    for (const activity of activities) {
      await ctx.db.delete(activity._id)
    }

    await ctx.db.delete(args.contactId)
  },
})

export const addNote = mutation({
  args: {
    contactId: v.id("crmContacts"),
    text: v.string(),
    type: v.union(v.literal("note"), v.literal("call"), v.literal("email"), v.literal("meeting")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    await ctx.db.insert("crmNotes", {
      contactId: args.contactId,
      authorId: caller._id,
      text: args.text,
      type: args.type,
    })

    const actionLabels: Record<string, string> = {
      note: "Přidána poznámka",
      call: "Zalogován hovor",
      email: "Zalogován e-mail",
      meeting: "Zalogována schůzka",
    }

    await ctx.db.insert("crmActivities", {
      contactId: args.contactId,
      authorId: caller._id,
      action: actionLabels[args.type],
      detail: args.text.substring(0, 100),
    })
  },
})

export const deleteNote = mutation({
  args: { noteId: v.id("crmNotes") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    await ctx.db.delete(args.noteId)
  },
})

// ── Import / Export ────────────────────────────────────────────────────────

export const listDriversForCrmImport = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    const contacts = await ctx.db.query("crmContacts").collect()
    const linkedIds = new Set(
      contacts.filter((c) => c.linkedUserId != null).map((c) => c.linkedUserId as string)
    )

    const drivers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "driver"))
      .collect()

    return drivers
      .filter((u) => !linkedIds.has(u._id))
      .map((u) => ({ _id: u._id, name: u.name, email: u.email, phone: u.phone }))
  },
})

export const importDriverAsCrmContact = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("lead"), v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const user = await ctx.db.get(args.userId)
    if (!user) throw new Error("Uživatel nenalezen")

    const existing = await ctx.db
      .query("crmContacts")
      .withIndex("by_linked_user", (q) => q.eq("linkedUserId", args.userId))
      .first()
    if (existing) throw new Error("Uživatel je již v CRM")

    const contactId = await ctx.db.insert("crmContacts", {
      type: "person",
      name: user.name ?? user.email ?? "Neznámý",
      email: user.email,
      phone: user.phone,
      tags: ["řidič"],
      status: args.status,
      linkedUserId: args.userId,
      createdBy: caller._id,
    })

    await ctx.db.insert("crmActivities", {
      contactId,
      authorId: caller._id,
      action: "Kontakt importován",
      detail: "Importováno z modulu Řidiči",
    })

    return contactId
  },
})

export const exportContacts = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    return await ctx.db.query("crmContacts").order("desc").take(2000)
  },
})
