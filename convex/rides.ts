import { v } from "convex/values"
import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"

async function notifyActiveDispatchers(
  ctx: MutationCtx,
  title: string,
  message: string,
  rideId: Id<"rides">,
) {
  const dispatchers = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "dispatcher"))
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect()
  for (const dispatcher of dispatchers) {
    await ctx.db.insert("notifications", {
      userId: dispatcher._id,
      title,
      message,
      read: false,
      type: "ride_status",
      rideId,
    })
  }
}

// ─── Rating ────────────────────────────────────────────────────────────────

// Public: get ride info by rating token (for rating page)
export const getRideByRatingToken = query({
  args: { ratingToken: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("rides"),
      rideNumber: v.string(),
      pickupAddress: v.string(),
      deliveryAddress: v.string(),
      status: v.string(),
      rating: v.optional(v.number()),
      ratingComment: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_tracking_token", (q) => q.eq("trackingToken", args.ratingToken))
      .first()
    // Try rating token index fallback via full scan (ratingToken not indexed)
    const found = ride ?? (await ctx.db.query("rides").filter(q => q.eq(q.field("ratingToken"), args.ratingToken)).first())
    if (!found) return null
    return {
      _id: found._id,
      rideNumber: found.rideNumber,
      pickupAddress: found.pickupAddress,
      deliveryAddress: found.deliveryAddress,
      status: found.status,
      rating: found.rating,
      ratingComment: found.ratingComment,
    }
  },
})

// Public: submit a rating for a delivered ride
export const rateRide = mutation({
  args: {
    ratingToken: v.string(),
    rating: v.number(), // 1–5
    ratingComment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) throw new Error("Hodnocení musí být mezi 1 a 5.")
    const ride = await ctx.db.query("rides").filter(q => q.eq(q.field("ratingToken"), args.ratingToken)).first()
    if (!ride) throw new Error("Zásilka nenalezena.")
    if (ride.status !== "delivered") throw new Error("Hodnotit lze pouze doručené zásilky.")
    if (ride.rating !== undefined) throw new Error("Zásilka již byla ohodnocena.")
    await ctx.db.patch(ride._id, {
      rating: args.rating,
      ratingComment: args.ratingComment,
    })
    console.log(`Ride ${ride.rideNumber} rated ${args.rating}/5`)
    return null
  },
})

// ─── Recent Activity Feed ───────────────────────────────────────────────────

// Dispatcher: get last 20 ride events for activity feed
export const getRecentActivity = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("rides"),
    _creationTime: v.number(),
    rideNumber: v.string(),
    status: v.string(),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    driverName: v.optional(v.string()),
    customerName: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    const rides = await ctx.db.query("rides").order("desc").take(20)
    const result: Array<{
      _id: Id<"rides">; _creationTime: number; rideNumber: string; status: string;
      pickupAddress: string; deliveryAddress: string; driverName?: string; customerName?: string; updatedAt: number;
    }> = []
    for (const ride of rides) {
      const driver = ride.driverId ? await ctx.db.get(ride.driverId) : null
      const customer = await ctx.db.get(ride.customerId)
      result.push({
        _id: ride._id,
        _creationTime: ride._creationTime,
        rideNumber: ride.rideNumber,
        status: ride.status,
        pickupAddress: ride.pickupAddress,
        deliveryAddress: ride.deliveryAddress,
        driverName: driver?.name ?? driver?.email ?? undefined,
        customerName: customer?.name ?? customer?.email ?? undefined,
        updatedAt: ride.podDeliveredAt ?? ride.failedAt ?? ride._creationTime,
      })
    }
    return result
  },
})

// ─── Global Search ──────────────────────────────────────────────────────────

// Dispatcher: search rides and customers by query string
export const globalSearch = query({
  args: { q: v.string() },
  returns: v.object({
    rides: v.array(v.object({
      _id: v.id("rides"),
      rideNumber: v.string(),
      status: v.string(),
      pickupAddress: v.string(),
      deliveryAddress: v.string(),
    })),
    customers: v.array(v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      companyName: v.optional(v.string()),
    })),
  }),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return { rides: [], customers: [] }
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return { rides: [], customers: [] }

    const q = args.q.toLowerCase().trim()
    if (q.length < 2) return { rides: [], customers: [] }

    const allRides = await ctx.db.query("rides").order("desc").take(500)
    const matchedRides = allRides.filter(r =>
      r.rideNumber.toLowerCase().includes(q) ||
      r.pickupAddress.toLowerCase().includes(q) ||
      r.deliveryAddress.toLowerCase().includes(q) ||
      (r.pickupContactName ?? "").toLowerCase().includes(q) ||
      (r.deliveryContactName ?? "").toLowerCase().includes(q)
    ).slice(0, 8).map(r => ({
      _id: r._id,
      rideNumber: r.rideNumber,
      status: r.status,
      pickupAddress: r.pickupAddress,
      deliveryAddress: r.deliveryAddress,
    }))

    const allUsers = await ctx.db.query("users").filter(q2 => q2.eq(q2.field("role"), "customer")).take(200)
    const matchedCustomers = allUsers.filter(u =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.companyName ?? "").toLowerCase().includes(q)
    ).slice(0, 5).map(u => ({
      _id: u._id,
      name: u.name ?? undefined,
      email: u.email ?? undefined,
      companyName: u.companyName ?? undefined,
    }))

    return { rides: matchedRides, customers: matchedCustomers }
  },
})

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function generateRideNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `K${y}${m}${d}-${rand}`
}

const rideValidator = v.object({
  _id: v.id("rides"),
  _creationTime: v.number(),
  customerId: v.id("users"),
  driverId: v.optional(v.id("users")),
  status: v.union(
    v.literal("pending"), v.literal("approved"), v.literal("assigned"),
    v.literal("pickup"), v.literal("transit"), v.literal("delivered"),
    v.literal("cancelled"), v.literal("failed"),
  ),
  pickupAddress: v.string(),
  pickupLat: v.optional(v.number()),
  pickupLng: v.optional(v.number()),
  pickupContactName: v.string(),
  pickupContactPhone: v.string(),
  requestedPickupAt: v.number(),
  deliveryAddress: v.string(),
  deliveryLat: v.optional(v.number()),
  deliveryLng: v.optional(v.number()),
  deliveryContactName: v.string(),
  deliveryContactPhone: v.string(),
  requestedDeliveryAt: v.number(),
  estimatedDeliveryAt: v.optional(v.number()),
  cargoType: v.union(
    v.literal("envelope"), v.literal("parcel"), v.literal("box"),
    v.literal("pallet"), v.literal("other"),
  ),
  cargoDescription: v.string(),
  weight: v.optional(v.number()),
  quantity: v.number(),
  price: v.optional(v.number()),
  currency: v.optional(v.string()),
  notes: v.optional(v.string()),
  attachmentIds: v.array(v.id("_storage")),
  trackingToken: v.string(),
  podPhotoIds: v.array(v.id("_storage")),
  podSignatureId: v.optional(v.id("_storage")),
  podDeliveredAt: v.optional(v.number()),
  podRecipientName: v.optional(v.string()),
  invoiceId: v.optional(v.id("invoices")),
  isPaid: v.boolean(),
  stripeSessionId: v.optional(v.string()),
  stripePaymentUrl: v.optional(v.string()),
  rideNumber: v.string(),
  dispatcherNotes: v.optional(v.string()),
  isMultiStop: v.optional(v.boolean()),
  stops: v.optional(v.array(v.object({
    address: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    contactName: v.string(),
    contactPhone: v.string(),
    notes: v.optional(v.string()),
    order: v.number(),
  }))),
  originalRideId: v.optional(v.id("rides")),
  codEnabled: v.optional(v.boolean()),
  codAmount: v.optional(v.number()),
  codCollected: v.optional(v.boolean()),
  dimensionLength: v.optional(v.number()),
  dimensionWidth: v.optional(v.number()),
  dimensionHeight: v.optional(v.number()),
  isFragile: v.optional(v.boolean()),
  isRefrigerated: v.optional(v.boolean()),
  failedReason: v.optional(v.string()),
  failedPhotoIds: v.optional(v.array(v.id("_storage"))),
  failedAt: v.optional(v.number()),
  rescheduledTo: v.optional(v.id("rides")),
  rating: v.optional(v.number()),
  ratingComment: v.optional(v.string()),
  ratingToken: v.optional(v.string()),
  recurringRideId: v.optional(v.id("recurringRides")),
})

// Customer creates a ride
export const createRide = mutation({
  args: {
    pickupAddress: v.string(),
    pickupLat: v.optional(v.number()),
    pickupLng: v.optional(v.number()),
    pickupContactName: v.string(),
    pickupContactPhone: v.string(),
    requestedPickupAt: v.number(),
    deliveryAddress: v.string(),
    deliveryLat: v.optional(v.number()),
    deliveryLng: v.optional(v.number()),
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
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("rides"),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Profil nenalezen")
    if (user.role !== "customer") throw new Error("Pouze zákazníci mohou vytvářet zakázky")
    if (user.status !== "active") throw new Error("Váš účet není aktivní")

    const rideId = await ctx.db.insert("rides", {
      customerId: user._id,
      status: "pending",
      pickupAddress: args.pickupAddress,
      pickupLat: args.pickupLat,
      pickupLng: args.pickupLng,
      pickupContactName: args.pickupContactName,
      pickupContactPhone: args.pickupContactPhone,
      requestedPickupAt: args.requestedPickupAt,
      deliveryAddress: args.deliveryAddress,
      deliveryLat: args.deliveryLat,
      deliveryLng: args.deliveryLng,
      deliveryContactName: args.deliveryContactName,
      deliveryContactPhone: args.deliveryContactPhone,
      requestedDeliveryAt: args.requestedDeliveryAt,
      cargoType: args.cargoType,
      cargoDescription: args.cargoDescription,
      weight: args.weight,
      quantity: args.quantity,
      notes: args.notes,
      attachmentIds: args.attachmentIds ?? [],
      trackingToken: generateToken(),
      podPhotoIds: [],
      isPaid: false,
      rideNumber: generateRideNumber(),
    })

    console.log(`Ride created: ${rideId}`)

    const createdRide = await ctx.db.get(rideId)
    await notifyActiveDispatchers(
      ctx,
      `Nová zakázka ${createdRide?.rideNumber ?? rideId}`,
      `${user.name ?? user.email}: ${args.pickupAddress} → ${args.deliveryAddress}`,
      rideId,
    )

    // Notify admin about new order
    const adminEmail = process.env.RECIPIENT_EMAIL
    if (adminEmail) {
      const cargoLabels: Record<string, string> = {
        envelope: "Obálka",
        parcel: "Balík",
        box: "Krabice",
        pallet: "Paleta",
        other: "Jiné",
      }
      const pickupDate = new Date(args.requestedPickupAt).toLocaleString("cs-CZ")
      const deliveryDate = new Date(args.requestedDeliveryAt).toLocaleString("cs-CZ")
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: adminEmail,
        subject: `Kuryr4You – Nová zakázka od ${user.name ?? user.email}`,
        message: [
          `Byla vytvořena nová zakázka.`,
          ``,
          `Zákazník: ${user.name ?? user.email}`,
          `Typ zásilky: ${cargoLabels[args.cargoType] ?? args.cargoType}`,
          `Popis: ${args.cargoDescription}`,
          args.weight ? `Hmotnost: ${args.weight} kg` : "",
          `Množství: ${args.quantity} ks`,
          ``,
          `Vyzvednutí: ${args.pickupAddress}`,
          `Kontakt: ${args.pickupContactName} (${args.pickupContactPhone})`,
          `Požadovaný čas vyzvednutí: ${pickupDate}`,
          ``,
          `Doručení: ${args.deliveryAddress}`,
          `Kontakt: ${args.deliveryContactName} (${args.deliveryContactPhone})`,
          `Požadovaný čas doručení: ${deliveryDate}`,
          args.notes ? `\nPoznámka: ${args.notes}` : "",
          ``,
          `Kuryr4You Dispečink`,
        ].filter(line => line !== undefined).join("\n"),
      })
    }

    return rideId
  },
})

// Customer: get own rides
export const getMyRides = query({
  args: {},
  returns: v.array(rideValidator),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "customer") return []
    return await ctx.db
      .query("rides")
      .withIndex("by_customer", (q) => q.eq("customerId", user._id))
      .order("desc")
      .take(100)
  },
})

// Driver: get assigned rides
export const getDriverRides = query({
  args: {},
  returns: v.array(rideValidator),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return []
    return await ctx.db
      .query("rides")
      .withIndex("by_driver", (q) => q.eq("driverId", user._id))
      .order("desc")
      .take(100)
  },
})

// Dispatcher: get all rides
export const getAllRides = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"), v.literal("approved"), v.literal("assigned"),
      v.literal("pickup"), v.literal("transit"), v.literal("delivered"), v.literal("cancelled"),
    )),
  },
  returns: v.array(rideValidator),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    if (args.status) {
      return await ctx.db
        .query("rides")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(200)
    }
    return await ctx.db.query("rides").order("desc").take(200)
  },
})

// Get ride by tracking token (public)
export const getRideByTrackingToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("rides"),
      rideNumber: v.string(),
      status: v.union(
        v.literal("pending"), v.literal("approved"), v.literal("assigned"),
        v.literal("pickup"), v.literal("transit"), v.literal("delivered"), v.literal("cancelled"), v.literal("failed"),
      ),
      pickupAddress: v.string(),
      deliveryAddress: v.string(),
      requestedPickupAt: v.number(),
      requestedDeliveryAt: v.number(),
      estimatedDeliveryAt: v.optional(v.number()),
      cargoType: v.union(
        v.literal("envelope"), v.literal("parcel"), v.literal("box"),
        v.literal("pallet"), v.literal("other"),
      ),
      podDeliveredAt: v.optional(v.number()),
      driverName: v.optional(v.string()),
      driverLat: v.optional(v.number()),
      driverLng: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_tracking_token", (q) => q.eq("trackingToken", args.token))
      .first()
    if (!ride) return null

    let driverName: string | undefined
    let driverLat: number | undefined
    let driverLng: number | undefined

    if (ride.driverId) {
      const driver = await ctx.db.get(ride.driverId)
      driverName = driver?.name
      if (ride.status === "pickup" || ride.status === "transit") {
        const gps = await ctx.db
          .query("gpsLocations")
          .withIndex("by_driver", (q) => q.eq("driverId", ride.driverId!))
          .first()
        if (gps?.isTracking) {
          driverLat = gps.lat
          driverLng = gps.lng
        }
      }
    }

    return {
      _id: ride._id,
      rideNumber: ride.rideNumber,
      status: ride.status,
      pickupAddress: ride.pickupAddress,
      deliveryAddress: ride.deliveryAddress,
      requestedPickupAt: ride.requestedPickupAt,
      requestedDeliveryAt: ride.requestedDeliveryAt,
      estimatedDeliveryAt: ride.estimatedDeliveryAt,
      cargoType: ride.cargoType,
      podDeliveredAt: ride.podDeliveredAt,
      driverName,
      driverLat,
      driverLng,
    }
  },
})

// Get single ride (auth check)
export const getRide = query({
  args: { rideId: v.id("rides") },
  returns: v.union(rideValidator, v.null()),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) return null

    const ride = await ctx.db.get(args.rideId)
    if (!ride) return null

    if (user.role === "dispatcher") return ride
    if (user.role === "customer" && ride.customerId === user._id) return ride
    if (user.role === "driver" && ride.driverId === user._id) return ride
    return null
  },
})

// Dispatcher: approve and price ride
export const approveRide = mutation({
  args: {
    rideId: v.id("rides"),
    price: v.number(),
    currency: v.optional(v.string()),
    estimatedDeliveryAt: v.optional(v.number()),
    dispatcherNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zakázka nenalezena")

    await ctx.db.patch(args.rideId, {
      status: "approved",
      price: args.price,
      currency: args.currency ?? "CZK",
      estimatedDeliveryAt: args.estimatedDeliveryAt,
      dispatcherNotes: args.dispatcherNotes,
    })

    const customer = await ctx.db.get(ride.customerId)
    await ctx.db.insert("notifications", {
      userId: ride.customerId,
      title: "Zakázka schválena",
      message: `Vaše zakázka ${ride.rideNumber} byla schválena. Cena: ${args.price} ${args.currency ?? "CZK"}.`,
      read: false,
      type: "ride_status",
      rideId: ride._id,
    })

    // Send email notification to customer
    if (customer?.email) {
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: customer.email,
        subject: `Kuryr4You – Zakázka ${ride.rideNumber} schválena`,
        message: `Dobrý den,\n\nVaše zakázka ${ride.rideNumber} byla schválena.\nCena: ${args.price} ${args.currency ?? "CZK"}\nVyzvednutí: ${ride.pickupAddress}\nDoručení: ${ride.deliveryAddress}\n${args.dispatcherNotes ? `\nPoznámka dispečera: ${args.dispatcherNotes}` : ""}\n\nKuryr4You Dispečink`,
      })
    }

    // Broadcast to active drivers about new available order
    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.broadcastAvailableOrder, {
      rideId: args.rideId,
      rideNumber: ride.rideNumber,
    })

    return null
  },
})

// Dispatcher: assign driver
export const assignDriver = mutation({
  args: {
    rideId: v.id("rides"),
    driverId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zakázka nenalezena")
    const driver = await ctx.db.get(args.driverId)
    if (!driver || driver.role !== "driver") throw new Error("Řidič nenalezen")

    await ctx.db.patch(args.rideId, {
      driverId: args.driverId,
      status: "assigned",
    })

    // Notify driver
    await ctx.db.insert("notifications", {
      userId: args.driverId,
      title: "Nová zakázka přiřazena",
      message: `Zakázka ${ride.rideNumber}: ${ride.pickupAddress} → ${ride.deliveryAddress}`,
      read: false,
      type: "ride_assigned",
      rideId: ride._id,
    })

    // Notify customer
    const customer = await ctx.db.get(ride.customerId)
    await ctx.db.insert("notifications", {
      userId: ride.customerId,
      title: "Řidič přiřazen",
      message: `K vaší zakázce ${ride.rideNumber} byl přiřazen řidič: ${driver.name ?? driver.email}.`,
      read: false,
      type: "ride_status",
      rideId: ride._id,
    })

    // Push: notify driver (respect preference, default = on)
    if (driver.driverPushAssigned !== false) {
      await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendPushToUser, {
        userId: args.driverId,
        title: "🚚 Nová zakázka přiřazena",
        body: `${ride.rideNumber}: ${ride.pickupAddress} → ${ride.deliveryAddress}`,
        url: "/ridic/zakazky",
        tag: `ride-assigned-${ride._id}`,
      })
    }

    // Push: notify customer
    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendPushToUser, {
      userId: ride.customerId,
      title: "✅ Řidič přiřazen",
      body: `Zakázka ${ride.rideNumber} – řidič: ${driver.name ?? driver.email}`,
      url: "/zakaznik/zasilky",
      tag: `driver-assigned-${ride._id}`,
    })

    // Email driver (respect preference, default = on)
    if (driver.driverEmailAssigned !== false && driver.email) {
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: driver.email,
        subject: `Kuryr4You – Nová zakázka ${ride.rideNumber}`,
        message: `Dobrý den ${driver.name ?? ""},\n\nByla vám přiřazena nová zakázka.\n\nZakázka: ${ride.rideNumber}\nVyzvednutí: ${ride.pickupAddress}\nKontakt (vyzvednutí): ${ride.pickupContactName}, ${ride.pickupContactPhone}\nDoručení: ${ride.deliveryAddress}\nKontakt (doručení): ${ride.deliveryContactName}, ${ride.deliveryContactPhone}\nPožadovaný čas vyzvednutí: ${new Date(ride.requestedPickupAt).toLocaleString("cs-CZ")}\n${ride.notes ? `\nPoznámka: ${ride.notes}` : ""}\n\nKuryr4You Dispečink`,
      })
    }

    // Email customer
    if (customer?.email) {
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: customer.email,
        subject: `Kuryr4You – K zakázce ${ride.rideNumber} přiřazen řidič`,
        message: `Dobrý den,\n\nK vaší zakázce ${ride.rideNumber} byl přiřazen řidič: ${driver.name ?? driver.email}.\n\nVyzvednutí: ${ride.pickupAddress}\nDoručení: ${ride.deliveryAddress}\n\nStav zásilky můžete sledovat pomocí odkazu:\nhttps://www.kuryr4you.cz/sledovani/${ride.trackingToken}\n\nKuryr4You Dispečink`,
      })
    }
    return null
  },
})

// Driver: update ride status
export const updateRideStatus = mutation({
  args: {
    rideId: v.id("rides"),
    status: v.union(
      v.literal("pickup"), v.literal("transit"), v.literal("delivered"), v.literal("cancelled"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Profil nenalezen")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zakázka nenalezena")

    if (user.role === "driver" && ride.driverId !== user._id) throw new Error("Nemáte oprávnění")
    if (user.role === "customer") throw new Error("Nemáte oprávnění")

    // Drivers must use submitPOD to mark as delivered (requires photo + signature)
    if (user.role === "driver" && args.status === "delivered") {
      throw new Error("Pro potvrzení doručení použijte formulář s dokladem (POD).")
    }

    const updates: any = { status: args.status }
    if (args.status === "delivered") {
      updates.podDeliveredAt = Date.now()
    }

    await ctx.db.patch(args.rideId, updates)

    const statusLabels: Record<string, string> = {
      pickup: "Zásilka vyzvedávána",
      transit: "Zásilka na cestě",
      delivered: "Zásilka doručena",
      cancelled: "Zakázka zrušena",
    }

    if (user.role === "driver") {
      await notifyActiveDispatchers(
        ctx,
        `Řidič změnil stav ${ride.rideNumber}`,
        `${user.name ?? user.email}: ${statusLabels[args.status] ?? args.status}`,
        ride._id,
      )
    }

    const customer = await ctx.db.get(ride.customerId)
    await ctx.db.insert("notifications", {
      userId: ride.customerId,
      title: statusLabels[args.status] ?? "Stav zakázky změněn",
      message: `Zakázka ${ride.rideNumber}: ${statusLabels[args.status] ?? args.status}`,
      read: false,
      type: "ride_status",
      rideId: ride._id,
    })

    // Push: notify customer about status change
    const pushTitles: Record<string, string> = {
      pickup: "📦 Zásilka vyzvedávána",
      transit: "🚚 Zásilka na cestě",
      delivered: "✅ Zásilka doručena",
      cancelled: "❌ Zakázka zrušena",
    }
    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendPushToUser, {
      userId: ride.customerId,
      title: pushTitles[args.status] ?? "Stav zakázky změněn",
      body: `Zakázka ${ride.rideNumber}`,
      url: "/zakaznik/zasilky",
      tag: `status-${ride._id}`,
    })

    // Email customer about status change
    if (customer?.email) {
      const statusMessages: Record<string, string> = {
        pickup: `Dobrý den,\n\nVaše zásilka ${ride.rideNumber} je nyní vyzvedávána řidičem.\n\nSledovat zásilku: https://www.kuryr4you.cz/sledovani/${ride.trackingToken}\n\nKuryr4You Dispečink`,
        transit: `Dobrý den,\n\nVaše zásilka ${ride.rideNumber} je na cestě k příjemci.\n\nSledovat zásilku: https://www.kuryr4you.cz/sledovani/${ride.trackingToken}\n\nKuryr4You Dispečink`,
        delivered: `Dobrý den,\n\nVaše zásilka ${ride.rideNumber} byla úspěšně doručena ${new Date().toLocaleString("cs-CZ")}.\n\nKuryr4You Dispečink`,
        cancelled: `Dobrý den,\n\nZakázka ${ride.rideNumber} byla zrušena.\n\nV případě dotazů nás kontaktujte.\n\nKuryr4You Dispečink`,
      }
      if (statusMessages[args.status]) {
        await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
          toEmail: customer.email,
          subject: `Kuryr4You – ${statusLabels[args.status] ?? "Stav zakázky"} (${ride.rideNumber})`,
          message: statusMessages[args.status],
        })
      }
    }

    // Generate receipt when delivered
    if (args.status === 'delivered') {
      await ctx.scheduler.runAfter(500, internal.receipts.generateReceiptInternal, {
        rideId: ride._id,
      })
    }

    // Fire webhooks for API-integrated customers
    await ctx.scheduler.runAfter(0, internal.apiKeys.fireWebhook, {
      customerId: ride.customerId,
      rideNumber: ride.rideNumber,
      trackingToken: ride.trackingToken,
      status: args.status,
    })

    return null
  },
})

// Dispatcher: update ride details
export const updateRide = mutation({
  args: {
    rideId: v.id("rides"),
    pickupAddress: v.optional(v.string()),
    pickupContactName: v.optional(v.string()),
    pickupContactPhone: v.optional(v.string()),
    requestedPickupAt: v.optional(v.number()),
    deliveryAddress: v.optional(v.string()),
    deliveryContactName: v.optional(v.string()),
    deliveryContactPhone: v.optional(v.string()),
    requestedDeliveryAt: v.optional(v.number()),
    estimatedDeliveryAt: v.optional(v.number()),
    cargoType: v.optional(v.union(
      v.literal("envelope"), v.literal("parcel"), v.literal("box"),
      v.literal("pallet"), v.literal("other"),
    )),
    cargoDescription: v.optional(v.string()),
    weight: v.optional(v.number()),
    quantity: v.optional(v.number()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
    dispatcherNotes: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"), v.literal("approved"), v.literal("assigned"),
      v.literal("pickup"), v.literal("transit"), v.literal("delivered"),
      v.literal("cancelled"), v.literal("failed"),
    )),
    codEnabled: v.optional(v.boolean()),
    codAmount: v.optional(v.number()),
    codCollected: v.optional(v.boolean()),
    dimensionLength: v.optional(v.number()),
    dimensionWidth: v.optional(v.number()),
    dimensionHeight: v.optional(v.number()),
    isFragile: v.optional(v.boolean()),
    isRefrigerated: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const { rideId, ...rest } = args
    const updates: any = {}
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) updates[k] = v
    }
    // When status is set back to "approved", clear any assigned driver
    // so the ride reappears in drivers' "volné zákazky" list
    if (args.status === "approved") {
      updates.driverId = undefined
    }
    await ctx.db.patch(rideId, updates)
    return null
  },
})

// Dispatcher: cancel ride
export const cancelRide = mutation({
  args: { rideId: v.id("rides") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zakázka nenalezena")

    await ctx.db.patch(args.rideId, { status: "cancelled" })

    await ctx.db.insert("notifications", {
      userId: ride.customerId,
      title: "Zakázka zrušena",
      message: `Vaše zakázka ${ride.rideNumber} byla zrušena dispečerem.`,
      read: false,
      type: "ride_status",
      rideId: ride._id,
    })
    return null
  },
})

// Dispatcher: remove assigned driver from a ride (returns it to "volné zákazky")
export const unassignDriver = mutation({
  args: { rideId: v.id("rides") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zakázka nenalezena")

    // Replace the full document with driverId removed to ensure the field is cleared
    const { driverId: _removed, ...rideWithoutDriver } = ride
    await ctx.db.replace(args.rideId, { ...rideWithoutDriver, status: "approved" })

    // Broadcast to active drivers that this ride is available again
    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.broadcastAvailableOrder, {
      rideId: args.rideId,
      rideNumber: ride.rideNumber,
    })

    return null
  },
})

// Driver or Dispatcher: submit proof of delivery
export const submitPOD = mutation({
  args: {
    rideId: v.id("rides"),
    photoIds: v.array(v.id("_storage")),
    signatureId: v.optional(v.id("_storage")),
    recipientName: v.optional(v.string()),
    codCollected: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || (user.role !== "driver" && user.role !== "dispatcher")) throw new Error("Nemáte oprávnění")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zakázka nenalezena")
    // Drivers can only submit POD for their own assigned rides
    if (user.role === "driver" && ride.driverId !== user._id) throw new Error("Zakázka nenalezena")

    await ctx.db.patch(args.rideId, {
      podPhotoIds: args.photoIds,
      podSignatureId: args.signatureId,
      podDeliveredAt: Date.now(),
      podRecipientName: args.recipientName,
      status: "delivered",
      codCollected: args.codCollected ?? false,
    })

    await ctx.db.insert("notifications", {
      userId: ride.customerId,
      title: "Zásilka doručena",
      message: `Vaše zásilka ${ride.rideNumber} byla úspěšně doručena.`,
      read: false,
      type: "ride_status",
      rideId: ride._id,
    })

    if (user.role === "driver") {
      await notifyActiveDispatchers(
        ctx,
        `Zakázka ${ride.rideNumber} doručena`,
        `${user.name ?? user.email} odeslal doklad o doručení.`,
        ride._id,
      )
    }

    // Send delivery confirmation email with rating link
    const customer = await ctx.db.get(ride.customerId)
    if (customer?.email && ride.ratingToken) {
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: customer.email,
        subject: `Kuryr4You – Zásilka ${ride.rideNumber} doručena ✓`,
        message: `Dobrý den,\n\nVaše zásilka ${ride.rideNumber} byla úspěšně doručena.\n\nVyzvednutí: ${ride.pickupAddress}\nDoručení: ${ride.deliveryAddress}\n\nOhodnoťte prosím doručení (1–5 hvězd):\nhttps://www.kuryr4you.cz/hodnoceni/${ride.ratingToken}\n\nDěkujeme za Vaši důvěru!\nKuryr4You Dispečink`,
      })
    }
    return null
  },
})

// Driver: report failed delivery
export const submitFailedDelivery = mutation({
  args: {
    rideId: v.id("rides"),
    failedReason: v.string(),
    failedPhotoIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || (user.role !== "driver" && user.role !== "dispatcher")) throw new Error("Nemáte oprávnění")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zakázka nenalezena")
    if (user.role === "driver" && ride.driverId !== user._id) throw new Error("Zakázka nenalezena")

    await ctx.db.patch(args.rideId, {
      status: "failed",
      failedReason: args.failedReason,
      failedPhotoIds: args.failedPhotoIds ?? [],
      failedAt: Date.now(),
    })

    await ctx.db.insert("notifications", {
      userId: ride.customerId,
      title: "Zásilka nedoručena",
      message: `Zásilka ${ride.rideNumber} nebyla doručena. Důvod: ${args.failedReason}`,
      read: false,
      type: "ride_status",
      rideId: ride._id,
    })

    if (user.role === "driver") {
      await notifyActiveDispatchers(
        ctx,
        `Zakázka ${ride.rideNumber} nebyla doručena`,
        `${user.name ?? user.email}: ${args.failedReason}`,
        ride._id,
      )
    }

    // Push notification to customer
    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendPushToUser, {
      userId: ride.customerId,
      title: "❌ Zásilka nedoručena",
      body: `Zásilka ${ride.rideNumber}: ${args.failedReason}`,
      url: "/zakaznik/zasilky",
      tag: `status-${ride._id}`,
    })

    // Email customer
    const customer = await ctx.db.get(ride.customerId)
    if (customer?.email) {
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: customer.email,
        subject: `Kuryr4You – Zásilka ${ride.rideNumber} nebyla doručena`,
        message: `Dobrý den,\n\nVaše zásilka ${ride.rideNumber} bohužel nebyla doručena.\n\nDůvod: ${args.failedReason}\n\nPro přeplánování doručení nás prosím kontaktujte.\n\nKuryr4You Dispečink`,
      })
    }

    console.log(`Failed delivery reported for ride ${args.rideId} by ${user._id}`)
    return null
  },
})

// Get upload URL for attachments
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    return await ctx.storage.generateUploadUrl()
  },
})

// Dispatcher: create ride on behalf of a customer (with optional multi-stop)
export const createRideAsDispatcher = mutation({
  args: {
    customerId: v.id("users"),
    pickupAddress: v.string(),
    pickupLat: v.optional(v.number()),
    pickupLng: v.optional(v.number()),
    pickupContactName: v.string(),
    pickupContactPhone: v.string(),
    requestedPickupAt: v.number(),
    deliveryAddress: v.string(),
    deliveryLat: v.optional(v.number()),
    deliveryLng: v.optional(v.number()),
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
    price: v.optional(v.number()),
    notes: v.optional(v.string()),
    dispatcherNotes: v.optional(v.string()),
    driverId: v.optional(v.id("users")),
    isMultiStop: v.optional(v.boolean()),
    stops: v.optional(v.array(v.object({
      address: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      contactName: v.string(),
      contactPhone: v.string(),
      notes: v.optional(v.string()),
      order: v.number(),
    }))),
    codEnabled: v.optional(v.boolean()),
    codAmount: v.optional(v.number()),
    dimensionLength: v.optional(v.number()),
    dimensionWidth: v.optional(v.number()),
    dimensionHeight: v.optional(v.number()),
    isFragile: v.optional(v.boolean()),
    isRefrigerated: v.optional(v.boolean()),
  },
  returns: v.id("rides"),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const customer = await ctx.db.get(args.customerId)
    if (!customer || customer.role !== "customer") throw new Error("Zákazník nenalezen")

    let driverValid = false
    if (args.driverId) {
      const driver = await ctx.db.get(args.driverId)
      if (driver && driver.role === "driver") driverValid = true
    }

    const status = args.driverId && driverValid ? "assigned" : "approved"

    const rideId = await ctx.db.insert("rides", {
      customerId: args.customerId,
      driverId: args.driverId && driverValid ? args.driverId : undefined,
      status,
      pickupAddress: args.pickupAddress,
      pickupLat: args.pickupLat,
      pickupLng: args.pickupLng,
      pickupContactName: args.pickupContactName,
      pickupContactPhone: args.pickupContactPhone,
      requestedPickupAt: args.requestedPickupAt,
      deliveryAddress: args.deliveryAddress,
      deliveryLat: args.deliveryLat,
      deliveryLng: args.deliveryLng,
      deliveryContactName: args.deliveryContactName,
      deliveryContactPhone: args.deliveryContactPhone,
      requestedDeliveryAt: args.requestedDeliveryAt,
      cargoType: args.cargoType,
      cargoDescription: args.cargoDescription,
      weight: args.weight,
      quantity: args.quantity,
      price: args.price,
      currency: "CZK",
      notes: args.notes,
      dispatcherNotes: args.dispatcherNotes,
      attachmentIds: [],
      trackingToken: generateToken(),
      podPhotoIds: [],
      isPaid: false,
      rideNumber: generateRideNumber(),
      isMultiStop: args.isMultiStop,
      stops: args.stops,
      codEnabled: args.codEnabled,
      codAmount: args.codAmount,
      dimensionLength: args.dimensionLength,
      dimensionWidth: args.dimensionWidth,
      dimensionHeight: args.dimensionHeight,
      isFragile: args.isFragile,
      isRefrigerated: args.isRefrigerated,
    })

    const rideDoc = await ctx.db.get(rideId)

    // Notify customer (in-app)
    await ctx.db.insert("notifications", {
      userId: args.customerId,
      title: "Nová zakázka vytvořena",
      message: `Dispečer vytvořil novou zakázku: ${args.pickupAddress} → ${args.deliveryAddress}`,
      read: false,
      type: "ride_status",
      rideId,
    })

    // Email customer
    if (customer.email) {
      const baseUrl = process.env.SITE_URL?.replace(/\/+$/, "") ?? "https://www.kuryr4you.cz"
      const trackingUrl = `${baseUrl}/sledovani/${rideDoc?.trackingToken ?? ""}`
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: customer.email,
        subject: `Kuryr4You – Nová zakázka ${rideDoc?.rideNumber}`,
        message: [
          `Dobrý den,`,
          ``,
          `Dispečer vytvořil pro vás novou zakázku ${rideDoc?.rideNumber}.`,
          ``,
          `Vyzvednutí: ${args.pickupAddress}`,
          `Doručení: ${args.deliveryAddress}`,
          args.price ? `Cena: ${args.price} CZK` : "",
          args.notes ? `\nPoznámka: ${args.notes}` : "",
          ``,
          `Sledovat zásilku: ${trackingUrl}`,
          ``,
          `Kuryr4You Dispečink`,
        ].filter(Boolean).join("\n"),
      })
    }

    // Notify driver if assigned (in-app + email)
    if (args.driverId && driverValid) {
      await ctx.db.insert("notifications", {
        userId: args.driverId,
        title: "Nová zakázka přiřazena",
        message: `Zakázka ${rideDoc?.rideNumber}: ${args.pickupAddress} → ${args.deliveryAddress}`,
        read: false,
        type: "ride_assigned",
        rideId,
      })
      const driver = await ctx.db.get(args.driverId)
      if (driver?.email) {
        const pickupDate = new Date(args.requestedPickupAt).toLocaleString("cs-CZ")
        await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
          toEmail: driver.email,
          subject: `Kuryr4You – Nová zakázka ${rideDoc?.rideNumber} pro vás`,
          message: [
            `Dobrý den ${driver.name ?? ""},`,
            ``,
            `Byla vám přiřazena nová zakázka.`,
            ``,
            `Číslo zakázky: ${rideDoc?.rideNumber}`,
            `Vyzvednutí: ${args.pickupAddress}`,
            `Kontakt: ${args.pickupContactName} (${args.pickupContactPhone})`,
            `Čas vyzvednutí: ${pickupDate}`,
            ``,
            `Doručení: ${args.deliveryAddress}`,
            `Kontakt: ${args.deliveryContactName} (${args.deliveryContactPhone})`,
            ``,
            `Kuryr4You Dispečink`,
          ].filter(Boolean).join("\n"),
        })
      }
    }

    // Broadcast to active drivers if ride has no driver (i.e. it's immediately available)
    if (!args.driverId || !driverValid) {
      await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.broadcastAvailableOrder, {
        rideId,
        rideNumber: rideDoc?.rideNumber ?? rideId,
      })
    }

    console.log(`Dispatcher created ride ${rideId} for customer ${args.customerId}`)
    return rideId
  },
})

// Dispatcher: copy a ride to multiple future dates
export const copyRideToDates = mutation({
  args: {
    rideId: v.id("rides"),
    targetDates: v.array(v.number()), // array of timestamps (midnight of target date)
  },
  returns: v.array(v.id("rides")),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const source = await ctx.db.get(args.rideId)
    if (!source) throw new Error("Zakázka nenalezena")
    if (args.targetDates.length === 0) throw new Error("Vyberte alespoň jeden den")
    if (args.targetDates.length > 31) throw new Error("Maximálně 31 dnů najednou")

    const created: Id<"rides">[] = []

    // Calculate the time offset between original pickup and delivery
    const pickupDeliveryDiff = source.requestedDeliveryAt - source.requestedPickupAt

    for (const dateTs of args.targetDates) {
      // Preserve the time-of-day from the original ride
      const origPickup = new Date(source.requestedPickupAt)
      const newPickupDate = new Date(dateTs)
      newPickupDate.setHours(origPickup.getHours(), origPickup.getMinutes(), origPickup.getSeconds(), 0)
      const newPickupAt = newPickupDate.getTime()
      const newDeliveryAt = newPickupAt + pickupDeliveryDiff

      const newId = await ctx.db.insert("rides", {
        customerId: source.customerId,
        status: "approved",
        pickupAddress: source.pickupAddress,
        pickupContactName: source.pickupContactName,
        pickupContactPhone: source.pickupContactPhone,
        requestedPickupAt: newPickupAt,
        deliveryAddress: source.deliveryAddress,
        deliveryContactName: source.deliveryContactName,
        deliveryContactPhone: source.deliveryContactPhone,
        requestedDeliveryAt: newDeliveryAt,
        cargoType: source.cargoType,
        cargoDescription: source.cargoDescription,
        weight: source.weight,
        quantity: source.quantity,
        price: source.price,
        currency: source.currency ?? "CZK",
        notes: source.notes,
        dispatcherNotes: source.dispatcherNotes,
        attachmentIds: [],
        trackingToken: generateToken(),
        podPhotoIds: [],
        isPaid: false,
        rideNumber: generateRideNumber(),
        isMultiStop: source.isMultiStop,
        stops: source.stops,
        originalRideId: source._id,
      })
      created.push(newId)
    }

    console.log(`Dispatcher copied ride ${args.rideId} to ${created.length} dates`)
    return created
  },
})

// Get file URL
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    return await ctx.storage.getUrl(args.storageId)
  },
})

// Dispatcher: get active rides with coordinates for map
export const getActiveRidesForMap = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("rides"),
    rideNumber: v.string(),
    status: v.union(
      v.literal("pending"), v.literal("approved"), v.literal("assigned"),
      v.literal("pickup"), v.literal("transit"), v.literal("delivered"), v.literal("cancelled"), v.literal("failed"),
    ),
    pickupAddress: v.string(),
    pickupLat: v.optional(v.number()),
    pickupLng: v.optional(v.number()),
    deliveryAddress: v.string(),
    deliveryLat: v.optional(v.number()),
    deliveryLng: v.optional(v.number()),
    driverName: v.optional(v.string()),
    isMultiStop: v.optional(v.boolean()),
    stops: v.optional(v.array(v.object({
      address: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      contactName: v.string(),
      contactPhone: v.string(),
      notes: v.optional(v.string()),
      order: v.number(),
    }))),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    const statusList = ["pending", "approved", "assigned", "pickup", "transit"] as const
    type RideDoc = Awaited<ReturnType<typeof ctx.db.get<"rides">>> extends infer T ? NonNullable<T> : never
    const results: RideDoc[] = []
    for (const status of statusList) {
      const rides = await ctx.db
        .query("rides")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(50)
      results.push(...rides)
    }

    return await Promise.all(results.map(async (ride) => {
      let driverName: string | undefined
      if (ride.driverId) {
        const driver = await ctx.db.get(ride.driverId)
        driverName = driver?.name ?? driver?.email
      }
      return {
        _id: ride._id,
        rideNumber: ride.rideNumber,
        status: ride.status,
        pickupAddress: ride.pickupAddress,
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        deliveryAddress: ride.deliveryAddress,
        deliveryLat: ride.deliveryLat,
        deliveryLng: ride.deliveryLng,
        driverName,
        isMultiStop: ride.isMultiStop,
        stops: ride.stops,
      }
    }))
  },
})

// Dispatcher: force set any status on any ride
export const forceStatusUpdate = mutation({
  args: {
    rideId: v.id("rides"),
    status: v.union(
      v.literal("pending"), v.literal("approved"), v.literal("assigned"),
      v.literal("pickup"), v.literal("transit"), v.literal("delivered"), v.literal("cancelled"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zakázka nenalezena")

    const patch: Record<string, any> = { status: args.status }
    if (args.status === "delivered" && !ride.podDeliveredAt) {
      patch.podDeliveredAt = Date.now()
    }
    // Při vrácení na "approved" odebrat přiřazeného řidiče,
    // aby se zakázka znovu zobrazila ve "volné zákazky" u řidičů
    if (args.status === "approved") {
      patch.driverId = undefined
    }
    await ctx.db.patch(args.rideId, patch)

    const statusLabels: Record<string, string> = {
      pending: "Čeká na schválení", approved: "Schváleno", assigned: "Přiřazeno řidiči",
      pickup: "Vyzvedávání", transit: "Na cestě", delivered: "Doručeno", cancelled: "Zrušeno",
    }
    await ctx.db.insert("notifications", {
      userId: ride.customerId,
      title: `Zakázka ${ride.rideNumber} – stav změněn`,
      message: `Dispečer změnil stav na: ${statusLabels[args.status] ?? args.status}`,
      read: false,
      type: "ride_status",
      rideId: ride._id,
    })

    const customer = await ctx.db.get(ride.customerId)
    if (customer?.email && ["delivered", "cancelled"].includes(args.status)) {
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: customer.email,
        subject: `Kuryr4You – Zakázka ${ride.rideNumber}: ${statusLabels[args.status]}`,
        message: `Dobrý den,\n\nStav vaší zakázky ${ride.rideNumber} byl změněn dispečerem.\nNový stav: ${statusLabels[args.status]}\n\nKuryr4You Dispečink`,
      })
    }

    // Generate receipt when delivered
    if (args.status === 'delivered') {
      await ctx.scheduler.runAfter(500, internal.receipts.generateReceiptInternal, {
        rideId: ride._id,
      })
    }

    console.log(`Dispatcher force-updated ride ${args.rideId} to ${args.status}`)
    return null
  },
})

// Driver: get upcoming approved unassigned rides (read-only visibility)
export const getAvailableRides = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("rides"),
    rideNumber: v.string(),
    status: v.union(
      v.literal("pending"), v.literal("approved"), v.literal("assigned"),
      v.literal("pickup"), v.literal("transit"), v.literal("delivered"), v.literal("cancelled"),
    ),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    requestedPickupAt: v.number(),
    requestedDeliveryAt: v.number(),
    cargoType: v.union(
      v.literal("envelope"), v.literal("parcel"), v.literal("box"),
      v.literal("pallet"), v.literal("other"),
    ),
    cargoDescription: v.string(),
    quantity: v.number(),
    weight: v.optional(v.number()),
    price: v.optional(v.number()),
    notes: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return []

    const approved = await ctx.db
      .query("rides")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("asc")
      .take(50)

    // Get IDs of rides this driver has rejected
    const rejections = await ctx.db
      .query("rideRejections")
      .withIndex("by_driver", (q) => q.eq("driverId", authId as Id<"users">))
      .collect()
    const rejectedIds = new Set(rejections.map(r => r.rideId))

    const cutoff = Date.now() - 3600000 // include rides up to 1h in the past
    return approved
      .filter(r => !r.driverId && r.requestedPickupAt > cutoff && !rejectedIds.has(r._id))
      .map(r => ({
        _id: r._id,
        rideNumber: r.rideNumber,
        status: r.status as any,
        pickupAddress: r.pickupAddress,
        deliveryAddress: r.deliveryAddress,
        requestedPickupAt: r.requestedPickupAt,
        requestedDeliveryAt: r.requestedDeliveryAt,
        cargoType: r.cargoType,
        cargoDescription: r.cargoDescription,
        quantity: r.quantity,
        weight: r.weight,
        price: r.price,
        notes: r.notes,
      }))
  },
})

// Driver: self-assign an approved unassigned ride
export const selfAssignRide = mutation({
  args: { rideId: v.id("rides") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") throw new Error("Pouze řidiči mohou přijímat zákazky")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zákazka nenalezena")
    if (ride.status !== "approved") throw new Error("Zákazka není ve stavu k přijetí")
    if (ride.driverId) throw new Error("Zákazka už má přiřazeného řidiče")

    await ctx.db.patch(args.rideId, {
      driverId: authId as Id<"users">,
      status: "assigned",
    })

    // Remove rejection record if driver previously rejected this ride
    const rejection = await ctx.db
      .query("rideRejections")
      .withIndex("by_driver_ride", (q) =>
        q.eq("driverId", authId as Id<"users">).eq("rideId", args.rideId)
      )
      .first()
    if (rejection) await ctx.db.delete(rejection._id)

    // Notify customer
    if (ride.customerId) {
      const customer = await ctx.db.get(ride.customerId)
      if (customer?.email) {
        await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
          toEmail: customer.email,
          subject: `Kuryr4You – Zakázka ${ride.rideNumber}: Přiřazen řidič`,
          message: `Dobrý den,\n\nVašemu zásilce ${ride.rideNumber} byl přiřazen řidič.\nBudeme vás informovat o dalším průběhu.\n\nKuryr4You Dispečink`,
        })
      }
    }

    console.log(`Driver ${user.name} self-assigned ride ${ride.rideNumber}`)
    return null
  },
})

// Driver: reject a ride (hide from Volné, store in Odmítnuté)
export const rejectRide = mutation({
  args: { rideId: v.id("rides") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") throw new Error("Pouze řidiči mohou odmítat zákazky")

    // Check ride still available
    const ride = await ctx.db.get(args.rideId)
    if (!ride || ride.status !== "approved") throw new Error("Zákazka není dostupná")

    // Prevent duplicate
    const existing = await ctx.db
      .query("rideRejections")
      .withIndex("by_driver_ride", (q) =>
        q.eq("driverId", authId as Id<"users">).eq("rideId", args.rideId)
      )
      .first()
    if (existing) return null

    await ctx.db.insert("rideRejections", {
      driverId: authId as Id<"users">,
      rideId: args.rideId,
      rejectedAt: Date.now(),
    })
    console.log(`Driver ${user.name} rejected ride ${ride.rideNumber}`)
    return null
  },
})

// Driver: un-reject a ride (take from Odmítnuté back to Volné or self-assign)
export const unRejectRide = mutation({
  args: { rideId: v.id("rides") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const rejection = await ctx.db
      .query("rideRejections")
      .withIndex("by_driver_ride", (q) =>
        q.eq("driverId", authId as Id<"users">).eq("rideId", args.rideId)
      )
      .first()
    if (rejection) await ctx.db.delete(rejection._id)
    return null
  },
})

// Driver: get rides this driver has rejected that are still available
export const getRejectedRides = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return []

    const rejections = await ctx.db
      .query("rideRejections")
      .withIndex("by_driver", (q) => q.eq("driverId", authId as Id<"users">))
      .order("desc")
      .collect()

    const results: Array<{
      _id: Id<"rides">
      rideNumber: string
      status: "approved"
      pickupAddress: string
      deliveryAddress: string
      requestedPickupAt: number
      requestedDeliveryAt: number
      cargoType: "envelope" | "parcel" | "box" | "pallet" | "other"
      cargoDescription?: string
      quantity?: number
      weight?: number
      price?: number
      notes?: string
      rejectedAt: number
    }> = []
    for (const rej of rejections) {
      const ride = await ctx.db.get(rej.rideId)
      // Only show rides still available (approved, no driver)
      if (!ride || ride.status !== "approved" || ride.driverId) continue
      results.push({
        _id: ride._id,
        rideNumber: ride.rideNumber,
        status: ride.status as any,
        pickupAddress: ride.pickupAddress,
        deliveryAddress: ride.deliveryAddress,
        requestedPickupAt: ride.requestedPickupAt,
        requestedDeliveryAt: ride.requestedDeliveryAt,
        cargoType: ride.cargoType,
        cargoDescription: ride.cargoDescription,
        quantity: ride.quantity,
        weight: ride.weight,
        price: ride.price,
        notes: ride.notes,
        rejectedAt: rej.rejectedAt,
      })
    }
    return results
  },
})

// ─── Stripe payment mutations ─────────────────────────────────────────────────

/**
 * Dispatcher: update the price on a ride
 */
export const updateRidePrice = mutation({
  args: {
    rideId: v.id("rides"),
    price: v.number(),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(userId)
    if (!user || user.role !== "dispatcher") throw new Error("Nedostatečná oprávnění")

    await ctx.db.patch(args.rideId, {
      price: args.price,
      currency: args.currency ?? "CZK",
    })
    console.log("[rides] updateRidePrice", args.rideId, args.price)
  },
})

/**
 * Dispatcher: trigger Stripe payment link creation and email to customer
 */
export const sendPaymentLink = action({
  args: {
    rideId: v.id("rides"),
  },
  returns: v.object({ success: v.boolean(), url: v.optional(v.string()), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Nepřihlášen")

    // Load data via runQuery since actions can't access ctx.db directly
    const data = await ctx.runQuery(internal.rides.getPaymentLinkData, {
      rideId: args.rideId,
      userId,
    })
    if (!data) throw new Error("Zásilka nebo zákazník nenalezeni")
    const { ride, customer, userRole } = data

    if (userRole !== "dispatcher") throw new Error("Nedostatečná oprávnění")
    if (!ride.price || ride.price <= 0) throw new Error("Zásilka nemá nastavenou cenu")

    console.log("[rides] sendPaymentLink", ride.rideNumber, "to", customer.email)

    const result = await ctx.runAction(internal.stripe.createPaymentLink, {
      rideId: args.rideId,
      rideNumber: ride.rideNumber,
      price: ride.price!,
      currency: ride.currency ?? "CZK",
      customerEmail: customer.email,
      customerName: customer.name ?? customer.email,
      pickupAddress: ride.pickupAddress,
      deliveryAddress: ride.deliveryAddress,
    })

    if (!result.success) throw new Error(result.error ?? "Nepodařilo se vytvořit platební odkaz")
    return result
  },
})

/**
 * Internal query: fetch ride + customer data for the sendPaymentLink action
 */
export const getPaymentLinkData = internalQuery({
  args: { rideId: v.id("rides"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    const ride = await ctx.db.get(args.rideId)
    if (!ride || !user) return null
    const customer = await ctx.db.get(ride.customerId)
    if (!customer) return null
    return { ride, customer, userRole: user.role }
  },
})

/**
 * Internal: store Stripe session ID and payment URL on a ride (called from stripe.ts)
 */
export const setStripeSession = internalMutation({
  args: {
    rideId: v.id("rides"),
    stripeSessionId: v.string(),
    stripePaymentUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.rideId, {
      stripeSessionId: args.stripeSessionId,
      stripePaymentUrl: args.stripePaymentUrl,
    })
    console.log("[rides] setStripeSession", args.rideId, args.stripeSessionId)
  },
})

/**
 * Internal: mark ride as paid (called from webhook)
 */
export const markRideAsPaid = internalMutation({
  args: {
    rideId: v.id("rides"),
    rideNumber: v.string(),
    customerEmail: v.string(),
    amountPaid: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId)
    if (!ride) {
      console.warn("[rides] markRideAsPaid: ride not found", args.rideId)
      return
    }

    await ctx.db.patch(args.rideId, { isPaid: true })
    console.log("[rides] markRideAsPaid", args.rideId, args.amountPaid, args.currency)

    // If ride is already delivered, trigger receipt generation now (both conditions met)
    if (ride.status === "delivered") {
      await ctx.scheduler.runAfter(500, internal.receipts.generateReceiptInternal, {
        rideId: args.rideId,
      })
    }

    // In-app notification for customer
    await ctx.db.insert("notifications", {
      userId: ride.customerId,
      title: "Platba přijata",
      message: `Platba za zásilku ${args.rideNumber} ve výši ${args.amountPaid.toFixed(2)} ${args.currency.toUpperCase()} byla úspěšně zpracována.`,
      read: false,
      type: "ride_status",
      rideId: args.rideId,
    })

    // Email confirmation
    if (args.customerEmail) {
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: args.customerEmail,
        subject: `Kuryr4You – Platba přijata – zásilka ${args.rideNumber}`,
        message: `Dobrý den,\n\nVaše platba za zásilku ${args.rideNumber} ve výši ${args.amountPaid.toFixed(2)} ${args.currency.toUpperCase()} byla úspěšně přijata.\n\nDěkujeme za platbu!\n\nKuryr4You Dispečink`,
      })
    }
  },
})

// Dispatcher: manually mark ride as paid (cash / bank transfer)
export const markRideAsPaidByDispatcher = mutation({
  args: { rideId: v.id("rides"), isPaid: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zakázka nenalezena")

    const newIsPaid = args.isPaid !== undefined ? args.isPaid : true
    await ctx.db.patch(args.rideId, { isPaid: newIsPaid })
    console.log("[rides] markRideAsPaidByDispatcher", args.rideId, "isPaid:", newIsPaid)

    // If marking as paid and already delivered, trigger receipt generation
    if (newIsPaid && ride.status === "delivered") {
      await ctx.scheduler.runAfter(500, internal.receipts.generateReceiptInternal, {
        rideId: args.rideId,
      })
    }

    if (newIsPaid) {
      await ctx.db.insert("notifications", {
        userId: ride.customerId,
        title: "Platba potvrzena",
        message: `Platba za zásilku ${ride.rideNumber} byla potvrzena dispečerem.`,
        read: false,
        type: "ride_status",
        rideId: ride._id,
      })
    }

    return null
  },
})

export const bulkMarkAsPaid = mutation({
  args: { rideIds: v.array(v.id("rides")), isPaid: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    for (const rideId of args.rideIds) {
      const ride = await ctx.db.get(rideId)
      if (!ride || ride.status === "cancelled") continue
      await ctx.db.patch(rideId, { isPaid: args.isPaid })
      if (args.isPaid && ride.status === "delivered") {
        await ctx.scheduler.runAfter(500, internal.receipts.generateReceiptInternal, { rideId })
      }
    }
    console.log("[rides] bulkMarkAsPaid", args.rideIds.length, "rides, isPaid:", args.isPaid)
    return null
  },
})

// Get POD data with signed storage URLs (for display on tracking page, dispatcher, etc.)
export const getPODData = query({
  args: { rideId: v.id("rides") },
  returns: v.union(
    v.object({
      podDeliveredAt: v.optional(v.number()),
      podRecipientName: v.optional(v.string()),
      signatureUrl: v.optional(v.string()),
      photoUrls: v.array(v.string()),
      rideNumber: v.string(),
      deliveryAddress: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId)
    if (!ride) return null

    const signatureUrl = ride.podSignatureId
      ? await ctx.storage.getUrl(ride.podSignatureId)
      : undefined

    const photoUrls: string[] = []
    for (const photoId of ride.podPhotoIds) {
      const url = await ctx.storage.getUrl(photoId)
      if (url) photoUrls.push(url)
    }

    return {
      podDeliveredAt: ride.podDeliveredAt,
      podRecipientName: ride.podRecipientName,
      signatureUrl: signatureUrl ?? undefined,
      photoUrls,
      rideNumber: ride.rideNumber,
      deliveryAddress: ride.deliveryAddress,
    }
  },
})

export const bulkCancelRides = mutation({
  args: { rideIds: v.array(v.id("rides")) },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nedostatečná oprávnění")
    let count = 0
    for (const rideId of args.rideIds) {
      const ride = await ctx.db.get(rideId)
      if (ride && !["delivered", "cancelled"].includes(ride.status)) {
        await ctx.db.patch(rideId, { status: "cancelled" })
        count++
      }
    }
    console.log(`Dispatcher bulk-cancelled ${count} rides`)
    return null
  },
})

export const deleteRide = mutation({
  args: { rideId: v.id("rides") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nedostatečná oprávnění")
    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zásilka nenalezena")
    await ctx.db.delete(args.rideId)
    console.log(`Dispatcher deleted ride ${ride.rideNumber}`)
    return null
  },
})

export const bulkDeleteRides = mutation({
  args: { rideIds: v.array(v.id("rides")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nedostatečná oprávnění")
    let count = 0
    for (const rideId of args.rideIds) {
      const ride = await ctx.db.get(rideId)
      if (ride) {
        await ctx.db.delete(rideId)
        count++
      }
    }
    console.log(`Dispatcher bulk-deleted ${count} rides`)
    return null
  },
})

// ── Route optimization: reorder stops ──────────────────────────────────────────
export const reorderStops = mutation({
  args: {
    rideId: v.id("rides"),
    stops: v.array(v.object({
      address: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      contactName: v.string(),
      contactPhone: v.string(),
      notes: v.optional(v.string()),
      order: v.number(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || !["dispatcher", "driver"].includes(user.role)) throw new Error("Nedostatečná oprávnění")
    const ride = await ctx.db.get(args.rideId)
    if (!ride) throw new Error("Zásilka nenalezena")
    if (!ride.isMultiStop) throw new Error("Zásilka není multi-stop")
    // Drivers can only reorder their own assigned rides
    if (user.role === "driver" && ride.driverId !== authId) throw new Error("Nedostatečná oprávnění")
    await ctx.db.patch(args.rideId, { stops: args.stops })
    console.log(`Stops reordered for ride ${ride.rideNumber} by ${user.role} ${user.email}`)
    return null
  },
})

// ── Admin statistics ──────────────────────────────────────────────────────────
export const getAdminStats = query({
  args: {},
  returns: v.object({
    totalRides: v.number(),
    deliveredRides: v.number(),
    cancelledRides: v.number(),
    activeRides: v.number(),
    pendingRides: v.number(),
    totalRevenue: v.number(),
    avgDeliveryTimeMinutes: v.number(),
    onTimeRate: v.number(),
    multiStopCount: v.number(),
    last30Days: v.array(v.object({
      date: v.string(),
      count: v.number(),
      revenue: v.number(),
      delivered: v.number(),
    })),
    driverStats: v.array(v.object({
      driverId: v.string(),
      driverName: v.string(),
      totalAssigned: v.number(),
      delivered: v.number(),
      cancelled: v.number(),
      activeNow: v.number(),
      totalRevenue: v.number(),
    })),
    topCustomers: v.array(v.object({
      customerId: v.string(),
      customerName: v.string(),
      totalOrders: v.number(),
      totalSpent: v.number(),
    })),
    cargoBreakdown: v.array(v.object({
      type: v.string(),
      count: v.number(),
    })),
    statusBreakdown: v.array(v.object({
      status: v.string(),
      count: v.number(),
    })),
  }),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nedostatečná oprávnění")

    const allRides = await ctx.db.query("rides").collect()
    const allUsers = await ctx.db.query("users").collect()

    const userMap = new Map(allUsers.map(u => [u._id as string, u]))

    const totalRides = allRides.length
    const deliveredRides = allRides.filter(r => r.status === "delivered").length
    const cancelledRides = allRides.filter(r => r.status === "cancelled").length
    const activeRides = allRides.filter(r => ["assigned", "pickup", "transit"].includes(r.status)).length
    const pendingRides = allRides.filter(r => r.status === "pending").length
    const multiStopCount = allRides.filter(r => r.isMultiStop).length

    const totalRevenue = allRides
      .filter(r => r.isPaid && r.price)
      .reduce((sum, r) => sum + (r.price ?? 0), 0)

    // Average delivery time (from _creationTime to podDeliveredAt)
    const deliveredWithTime = allRides.filter(r => r.status === "delivered" && r.podDeliveredAt && r._creationTime)
    const avgDeliveryTimeMinutes = deliveredWithTime.length > 0
      ? deliveredWithTime.reduce((sum, r) => sum + ((r.podDeliveredAt! - r._creationTime) / 60000), 0) / deliveredWithTime.length
      : 0

    // On-time rate: delivered before or on requestedDeliveryAt
    const onTimeDeliveries = allRides.filter(r =>
      r.status === "delivered" && r.podDeliveredAt && r.requestedDeliveryAt &&
      r.podDeliveredAt <= r.requestedDeliveryAt
    ).length
    const onTimeRate = deliveredRides > 0 ? (onTimeDeliveries / deliveredRides) * 100 : 0

    // Last 30 days daily breakdown
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const last30Days: Record<string, { count: number; revenue: number; delivered: number }> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split("T")[0]
      last30Days[key] = { count: 0, revenue: 0, delivered: 0 }
    }
    for (const ride of allRides) {
      if (ride._creationTime >= thirtyDaysAgo) {
        const key = new Date(ride._creationTime).toISOString().split("T")[0]
        if (last30Days[key]) {
          last30Days[key].count++
          if (ride.isPaid && ride.price) last30Days[key].revenue += ride.price
          if (ride.status === "delivered") last30Days[key].delivered++
        }
      }
    }
    const last30DaysArr = Object.entries(last30Days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }))

    // Driver stats
    const drivers = allUsers.filter(u => u.role === "driver")
    const driverStats = drivers.map(driver => {
      const assigned = allRides.filter(r => r.driverId === driver._id)
      const delivered = assigned.filter(r => r.status === "delivered").length
      const cancelled = assigned.filter(r => r.status === "cancelled").length
      const activeNow = assigned.filter(r => ["assigned", "pickup", "transit"].includes(r.status)).length
      const totalRevenue = assigned.filter(r => r.isPaid && r.price).reduce((s, r) => s + (r.price ?? 0), 0)
      return {
        driverId: driver._id as string,
        driverName: driver.name || driver.email,
        totalAssigned: assigned.length,
        delivered,
        cancelled,
        activeNow,
        totalRevenue,
      }
    }).sort((a, b) => b.delivered - a.delivered)

    // Top customers
    const customers = allUsers.filter(u => u.role === "customer")
    const topCustomers = customers.map(customer => {
      const orders = allRides.filter(r => r.customerId === customer._id)
      const totalSpent = orders.filter(r => r.isPaid && r.price).reduce((s, r) => s + (r.price ?? 0), 0)
      return {
        customerId: customer._id as string,
        customerName: customer.name || customer.email,
        totalOrders: orders.length,
        totalSpent,
      }
    }).sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 10)

    // Cargo breakdown
    const cargoCounts: Record<string, number> = {}
    for (const ride of allRides) {
      cargoCounts[ride.cargoType] = (cargoCounts[ride.cargoType] ?? 0) + 1
    }
    const cargoBreakdown = Object.entries(cargoCounts).map(([type, count]) => ({ type, count }))

    // Status breakdown
    const statusCounts: Record<string, number> = {}
    for (const ride of allRides) {
      statusCounts[ride.status] = (statusCounts[ride.status] ?? 0) + 1
    }
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

    return {
      totalRides,
      deliveredRides,
      cancelledRides,
      activeRides,
      pendingRides,
      totalRevenue,
      avgDeliveryTimeMinutes,
      onTimeRate,
      multiStopCount,
      last30Days: last30DaysArr,
      driverStats,
      topCustomers,
      cargoBreakdown,
      statusBreakdown,
    }
  },
})

// ─── Archive of completed/cancelled/failed rides ────────────────────────────

export const getArchivedRides = query({
  args: {
    statuses: v.optional(v.array(v.union(
      v.literal("delivered"), v.literal("cancelled"), v.literal("failed")
    ))),
    dateFrom: v.optional(v.number()), // ms timestamp
    dateTo: v.optional(v.number()),   // ms timestamp
    driverId: v.optional(v.id("users")),
    customerId: v.optional(v.id("users")),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("rides"),
    _creationTime: v.number(),
    rideNumber: v.string(),
    status: v.union(
      v.literal("delivered"), v.literal("cancelled"), v.literal("failed")
    ),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    pickupContactName: v.string(),
    deliveryContactName: v.string(),
    requestedPickupAt: v.number(),
    requestedDeliveryAt: v.number(),
    podDeliveredAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    cargoType: v.string(),
    cargoDescription: v.string(),
    weight: v.optional(v.number()),
    quantity: v.number(),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    isPaid: v.boolean(),
    codEnabled: v.optional(v.boolean()),
    codAmount: v.optional(v.number()),
    codCollected: v.optional(v.boolean()),
    rating: v.optional(v.number()),
    failedReason: v.optional(v.string()),
    driverId: v.optional(v.id("users")),
    driverName: v.optional(v.string()),
    customerId: v.id("users"),
    customerName: v.optional(v.string()),
    customerCompany: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    const statuses: Array<"delivered" | "cancelled" | "failed"> =
      args.statuses?.length ? args.statuses : ["delivered", "cancelled", "failed"]

    // Fetch all matching rides by each status
    let rides: any[] = []
    for (const st of statuses) {
      const batch = await ctx.db
        .query("rides")
        .withIndex("by_status", q => q.eq("status", st as any))
        .order("desc")
        .take(2000)
      rides.push(...batch)
    }

    // Sort by most recent first
    rides.sort((a, b) => b._creationTime - a._creationTime)

    // Apply date filters
    if (args.dateFrom) rides = rides.filter(r => r._creationTime >= args.dateFrom!)
    if (args.dateTo)   rides = rides.filter(r => r._creationTime <= args.dateTo!)
    if (args.driverId) rides = rides.filter(r => r.driverId === args.driverId)
    if (args.customerId) rides = rides.filter(r => r.customerId === args.customerId)

    // Apply search
    if (args.search?.trim()) {
      const q = args.search.toLowerCase().trim()
      rides = rides.filter(r =>
        r.rideNumber.toLowerCase().includes(q) ||
        r.pickupAddress.toLowerCase().includes(q) ||
        r.deliveryAddress.toLowerCase().includes(q) ||
        r.pickupContactName.toLowerCase().includes(q) ||
        r.deliveryContactName.toLowerCase().includes(q) ||
        r.cargoDescription.toLowerCase().includes(q)
      )
    }

    // Limit
    rides = rides.slice(0, args.limit ?? 200)

    // Enrich with driver/customer names
    type ArchiveRow = {
      _id: Id<"rides">; _creationTime: number; rideNumber: string
      status: "delivered" | "cancelled" | "failed"
      pickupAddress: string; deliveryAddress: string
      pickupContactName: string; deliveryContactName: string
      requestedPickupAt: number; requestedDeliveryAt: number
      podDeliveredAt?: number; failedAt?: number
      cargoType: string; cargoDescription: string; weight?: number; quantity: number
      price?: number; currency?: string; isPaid: boolean
      codEnabled?: boolean; codAmount?: number; codCollected?: boolean
      rating?: number; failedReason?: string
      driverId?: Id<"users">; driverName?: string
      customerId: Id<"users">; customerName?: string; customerCompany?: string
    }
    const result: ArchiveRow[] = []
    for (const ride of rides) {
      const driver = ride.driverId ? await ctx.db.get(ride.driverId as Id<"users">) : null
      const customer = await ctx.db.get(ride.customerId as Id<"users">)
      const driverUser = driver as { name?: string; email?: string } | null
      const customerUser = customer as { name?: string; email?: string; companyName?: string } | null
      result.push({
        _id: ride._id,
        _creationTime: ride._creationTime,
        rideNumber: ride.rideNumber,
        status: ride.status,
        pickupAddress: ride.pickupAddress,
        deliveryAddress: ride.deliveryAddress,
        pickupContactName: ride.pickupContactName,
        deliveryContactName: ride.deliveryContactName,
        requestedPickupAt: ride.requestedPickupAt,
        requestedDeliveryAt: ride.requestedDeliveryAt,
        podDeliveredAt: ride.podDeliveredAt ?? undefined,
        failedAt: ride.failedAt ?? undefined,
        cargoType: ride.cargoType,
        cargoDescription: ride.cargoDescription,
        weight: ride.weight ?? undefined,
        quantity: ride.quantity,
        price: ride.price ?? undefined,
        currency: ride.currency ?? undefined,
        isPaid: ride.isPaid,
        codEnabled: ride.codEnabled ?? undefined,
        codAmount: ride.codAmount ?? undefined,
        codCollected: ride.codCollected ?? undefined,
        rating: ride.rating ?? undefined,
        failedReason: ride.failedReason ?? undefined,
        driverId: ride.driverId ?? undefined,
        driverName: driverUser?.name ?? driverUser?.email ?? undefined,
        customerId: ride.customerId,
        customerName: customerUser?.name ?? customerUser?.email ?? undefined,
        customerCompany: customerUser?.companyName ?? undefined,
      })
    }
    return result
  },
})
