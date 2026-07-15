import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

const invoiceValidator = v.object({
  _id: v.id("invoices"),
  _creationTime: v.number(),
  customerId: v.id("users"),
  periodStart: v.number(),
  periodEnd: v.number(),
  totalAmount: v.number(),
  currency: v.string(),
  status: v.union(
    v.literal("draft"), v.literal("sent"), v.literal("paid"), v.literal("overdue"),
  ),
  dueDate: v.number(),
  notes: v.optional(v.string()),
  invoiceNumber: v.string(),
})

function generateInvoiceNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `FAK-${y}${m}-${rand}`
}

// Dispatcher: create invoice for corporate customer
export const createInvoice = mutation({
  args: {
    customerId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    rideIds: v.array(v.id("rides")),
    notes: v.optional(v.string()),
    dueDays: v.optional(v.number()),
  },
  returns: v.id("invoices"),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    // Sum up prices from rides
    let totalAmount = 0
    for (const rideId of args.rideIds) {
      const ride = await ctx.db.get(rideId)
      if (ride?.price) totalAmount += ride.price
    }

    const dueDate = Date.now() + ((args.dueDays ?? 14) * 24 * 60 * 60 * 1000)
    const invoiceNumber = generateInvoiceNumber()

    const invoiceId = await ctx.db.insert("invoices", {
      customerId: args.customerId,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      totalAmount,
      currency: "CZK",
      status: "draft",
      dueDate,
      notes: args.notes,
      invoiceNumber,
    })

    // Link rides to invoice
    for (const rideId of args.rideIds) {
      await ctx.db.patch(rideId, { invoiceId })
    }

    await ctx.db.insert("notifications", {
      userId: args.customerId,
      title: "Nová faktura",
      message: `Byla vystavena faktura ${invoiceNumber} na ${totalAmount.toLocaleString("cs-CZ")} CZK.`,
      read: false,
      type: "invoice",
    })

    console.log(`Invoice created: ${invoiceId}`)
    return invoiceId
  },
})

// Dispatcher: get all invoices
export const getAllInvoices = query({
  args: {},
  returns: v.array(invoiceValidator),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []
    return await ctx.db.query("invoices").order("desc").take(200)
  },
})

// Customer: get own invoices
export const getMyInvoices = query({
  args: {},
  returns: v.array(invoiceValidator),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "customer") return []
    return await ctx.db
      .query("invoices")
      .withIndex("by_customer", (q) => q.eq("customerId", user._id))
      .order("desc")
      .take(50)
  },
})

// Dispatcher: update invoice status
export const updateInvoiceStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: v.union(
      v.literal("draft"), v.literal("sent"), v.literal("paid"), v.literal("overdue"),
    ),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const updates: any = { status: args.status }
    if (args.notes !== undefined) updates.notes = args.notes

    await ctx.db.patch(args.invoiceId, updates)

    if (args.status === "paid") {
      const invoice = await ctx.db.get(args.invoiceId)
      if (invoice) {
        // Mark rides as paid
        const rides = await ctx.db
          .query("rides")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
          .collect()
        for (const ride of rides) {
          await ctx.db.patch(ride._id, { isPaid: true })
        }

        await ctx.db.insert("notifications", {
          userId: invoice.customerId,
          title: "Faktura uhrazena",
          message: `Faktura ${invoice.invoiceNumber} byla označena jako uhrazena.`,
          read: false,
          type: "invoice",
        })
      }
    }
    return null
  },
})

// Get rides for an invoice
export const getRidesForInvoice = query({
  args: { invoiceId: v.id("invoices") },
  returns: v.array(v.object({
    _id: v.id("rides"),
    rideNumber: v.string(),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    requestedPickupAt: v.number(),
    price: v.optional(v.number()),
    status: v.union(
      v.literal("pending"), v.literal("approved"), v.literal("assigned"),
      v.literal("pickup"), v.literal("transit"), v.literal("delivered"), v.literal("cancelled"), v.literal("failed"),
    ),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) return []
    // Only dispatcher can see all invoices; customers can only see their own
    if (user.role !== "dispatcher") {
      const invoice = await ctx.db.get(args.invoiceId)
      if (!invoice || invoice.customerId !== user._id) return []
    }

    return await ctx.db
      .query("rides")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect()
      .then(rides => rides.map(r => ({
        _id: r._id,
        rideNumber: r.rideNumber,
        pickupAddress: r.pickupAddress,
        deliveryAddress: r.deliveryAddress,
        requestedPickupAt: r.requestedPickupAt,
        price: r.price,
        status: r.status,
      })))
  },
})

// Dispatcher: generate invoice for a period (auto-collects unbilled rides)
export const generateInvoiceForPeriod = mutation({
  args: {
    customerId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    dueDays: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.union(v.id("invoices"), v.null()),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    // Find delivered, unpaid, uninvoiced rides for this customer in the period
    const rides = await ctx.db
      .query("rides")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect()

    const eligibleRides = rides.filter(
      (r) =>
        r.status === "delivered" &&
        !r.isPaid &&
        r.invoiceId === undefined &&
        r.requestedPickupAt >= args.periodStart &&
        r.requestedPickupAt <= args.periodEnd,
    )

    if (eligibleRides.length === 0) return null

    let totalAmount = 0
    for (const ride of eligibleRides) {
      if (ride.price) totalAmount += ride.price
    }

    const dueDate = Date.now() + ((args.dueDays ?? 14) * 24 * 60 * 60 * 1000)
    const invoiceNumber = generateInvoiceNumber()

    const invoiceId = await ctx.db.insert("invoices", {
      customerId: args.customerId,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      totalAmount,
      currency: "CZK",
      status: "draft",
      dueDate,
      notes: args.notes,
      invoiceNumber,
    })

    for (const ride of eligibleRides) {
      await ctx.db.patch(ride._id, { invoiceId })
    }

    await ctx.db.insert("notifications", {
      userId: args.customerId,
      title: "Nová faktura",
      message: `Byla vystavena faktura ${invoiceNumber} na ${totalAmount.toLocaleString("cs-CZ")} CZK.`,
      read: false,
      type: "invoice",
    })

    console.log(`Invoice generated: ${invoiceId} for ${eligibleRides.length} rides`)
    return invoiceId
  },
})

// Get unbilled rides for a corporate customer
export const getUnbilledRides = query({
  args: { customerId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("rides"),
    rideNumber: v.string(),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    requestedPickupAt: v.number(),
    price: v.optional(v.number()),
    status: v.union(
      v.literal("pending"), v.literal("approved"), v.literal("assigned"),
      v.literal("pickup"), v.literal("transit"), v.literal("delivered"), v.literal("cancelled"), v.literal("failed"),
    ),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    const rides = await ctx.db
      .query("rides")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("invoiceId"), undefined))
      .collect()

    return rides
      .filter(r => r.status === "delivered" && !r.isPaid)
      .map(r => ({
        _id: r._id,
        rideNumber: r.rideNumber,
        pickupAddress: r.pickupAddress,
        deliveryAddress: r.deliveryAddress,
        requestedPickupAt: r.requestedPickupAt,
        price: r.price,
        status: r.status,
      }))
  },
})
