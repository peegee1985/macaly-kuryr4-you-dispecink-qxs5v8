import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

const rideTemplateValidator = v.object({
  pickupAddress: v.string(),
  pickupContactName: v.string(),
  pickupContactPhone: v.string(),
  deliveryAddress: v.string(),
  deliveryContactName: v.string(),
  deliveryContactPhone: v.string(),
  cargoType: v.union(
    v.literal("envelope"), v.literal("parcel"), v.literal("box"),
    v.literal("pallet"), v.literal("other"),
  ),
  cargoDescription: v.string(),
  weight: v.optional(v.number()),
  quantity: v.number(),
  notes: v.optional(v.string()),
  codEnabled: v.optional(v.boolean()),
  codAmount: v.optional(v.number()),
})

// Customer: list my templates
export const listMyTemplates = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("recurringRides"),
    _creationTime: v.number(),
    title: v.string(),
    frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("custom")),
    active: v.boolean(),
    rideTemplate: rideTemplateValidator,
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "customer") return []

    const templates = await ctx.db
      .query("recurringRides")
      .withIndex("by_customer", (q) => q.eq("customerId", authId as Id<"users">))
      .order("desc")
      .collect()

    return templates.map(t => ({
      _id: t._id,
      _creationTime: t._creationTime,
      title: t.title,
      frequency: t.frequency,
      active: t.active,
      rideTemplate: t.rideTemplate,
    }))
  },
})

// Customer: save a new template
export const saveTemplate = mutation({
  args: {
    title: v.string(),
    rideTemplate: rideTemplateValidator,
  },
  returns: v.id("recurringRides"),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "customer") throw new Error("Nemáte oprávnění")

    const id = await ctx.db.insert("recurringRides", {
      customerId: authId as Id<"users">,
      title: args.title,
      frequency: "custom",
      active: true,
      nextOccurrenceAt: Date.now(),
      rideTemplate: args.rideTemplate,
      createdBy: authId as Id<"users">,
    })
    console.log(`Template saved: ${args.title} by ${user.email}`)
    return id
  },
})

// Customer: toggle template active/inactive
export const toggleTemplate = mutation({
  args: { templateId: v.id("recurringRides"), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const template = await ctx.db.get(args.templateId)
    if (!template || template.customerId !== (authId as Id<"users">)) throw new Error("Šablona nenalezena")
    await ctx.db.patch(args.templateId, { active: args.active })
    return null
  },
})

// Customer: delete template
export const deleteTemplate = mutation({
  args: { templateId: v.id("recurringRides") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const template = await ctx.db.get(args.templateId)
    if (!template || template.customerId !== (authId as Id<"users">)) throw new Error("Šablona nenalezena")
    await ctx.db.delete(args.templateId)
    console.log(`Template deleted: ${args.templateId}`)
    return null
  },
})
