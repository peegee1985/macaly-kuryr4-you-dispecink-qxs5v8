import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "")
}

function generateRideNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `K${y}${m}${d}-${rand}`
}

export const createPendingOrder = internalMutation({
  args: {
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.string(),
    pickupAddress: v.string(),
    pickupContactName: v.string(),
    pickupContactPhone: v.string(),
    requestedPickupAt: v.number(),
    deliveryAddress: v.string(),
    deliveryContactName: v.string(),
    deliveryContactPhone: v.string(),
    requestedDeliveryAt: v.number(),
    cargoType: v.union(
      v.literal("envelope"), v.literal("parcel"), v.literal("box"),
      v.literal("pallet"), v.literal("other"),
    ),
    cargoDescription: v.string(),
    weight: v.optional(v.number()),
    quantity: v.number(),
    notes: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
    aiVehicle: v.optional(v.string()),
    aiDistance: v.optional(v.string()),
    aiUrgency: v.optional(v.string()),
  },
  returns: v.object({ id: v.id("pendingGuestOrders"), rideNumber: v.string() }),
  handler: async (ctx, args) => {
    const rideNumber = generateRideNumber()
    const id = await ctx.db.insert("pendingGuestOrders", {
      ...args,
      status: "pending_payment",
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    })
    console.log(`[guestOrders] Created pending order ${id} rideNumber=${rideNumber}`)
    return { id, rideNumber }
  },
})

export const setStripeSession = internalMutation({
  args: { id: v.id("pendingGuestOrders"), stripeSessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stripeSessionId: args.stripeSessionId })
    return null
  },
})

export const getPendingOrderBySession = internalQuery({
  args: { stripeSessionId: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingGuestOrders")
      .withIndex("by_stripe_session", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .first()
  },
})

export const findOrCreateGuestUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first()
    if (existing) {
      console.log(`[guestOrders] Found existing user ${existing._id} for ${args.email}`)
      return existing._id
    }
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      phone: args.phone,
      role: "customer",
      status: "active",
      corporateStatus: "none",
    })
    console.log(`[guestOrders] Created guest user ${userId} for ${args.email}`)
    return userId
  },
})

export const fulfillGuestOrder = internalMutation({
  args: {
    pendingOrderId: v.id("pendingGuestOrders"),
    customerId: v.id("users"),
    stripeSessionId: v.string(),
    rideNumber: v.string(),
    amountPaid: v.number(),
    currency: v.string(),
  },
  returns: v.object({ rideId: v.id("rides"), trackingToken: v.string() }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.pendingOrderId)
    if (!order) throw new Error("Pending order not found")

    const trackingToken = generateToken()

    const rideId = await ctx.db.insert("rides", {
      customerId: args.customerId,
      status: "approved",
      pickupAddress: order.pickupAddress,
      pickupContactName: order.pickupContactName,
      pickupContactPhone: order.pickupContactPhone,
      requestedPickupAt: order.requestedPickupAt,
      deliveryAddress: order.deliveryAddress,
      deliveryContactName: order.deliveryContactName,
      deliveryContactPhone: order.deliveryContactPhone,
      requestedDeliveryAt: order.requestedDeliveryAt,
      cargoType: order.cargoType,
      cargoDescription: order.cargoDescription,
      weight: order.weight,
      quantity: order.quantity,
      notes: order.notes,
      attachmentIds: [],
      podPhotoIds: [],
      trackingToken,
      isPaid: true,
      stripeSessionId: args.stripeSessionId,
      price: args.amountPaid,
      currency: args.currency,
      rideNumber: args.rideNumber,
    })

    await ctx.db.patch(args.pendingOrderId, { status: "paid" })

    console.log(`[guestOrders] Fulfilled ride ${rideId} (${args.rideNumber})`)
    return { rideId, trackingToken }
  },
})
