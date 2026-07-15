import { v } from "convex/values"
import { mutation, query, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { getAuthUserId } from "@convex-dev/auth/server"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireDispatcherOrAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error("Nepřihlášen")
  const user = await ctx.db.get(userId)
  if (!user || !["dispatcher", "service_driver"].includes(user.role)) {
    // also allow dispatcher to manage
  }
  if (!user) throw new Error("Uživatel nenalezen")
  return { userId, user }
}

async function requireDispatcher(ctx: any) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error("Nepřihlášen")
  const user = await ctx.db.get(userId)
  if (!user || user.role !== "dispatcher") throw new Error("Pouze dispečer")
  return { userId, user }
}

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error("Nepřihlášen")
  const user = await ctx.db.get(userId)
  if (!user) throw new Error("Uživatel nenalezen")
  return { userId, user }
}

// Check if user can access a client's data
async function canAccessClient(ctx: any, clientId: any, userId: any, userRole: string) {
  if (userRole === "dispatcher") return true
  // Check serviceClientUsers
  const membership = await ctx.db
    .query("serviceClientUsers")
    .withIndex("by_client_user", (q: any) => q.eq("clientId", clientId).eq("userId", userId))
    .first()
  return !!membership
}

function generateVisitNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, "0")
  return `V-${year}-${rand}`
}

// ─── Service Clients ──────────────────────────────────────────────────────────

export const listClients = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx)
    if (user.role === "dispatcher") {
      return await ctx.db.query("serviceClients").collect()
    }
    // For supervisors: only their clients
    const memberships = await ctx.db
      .query("serviceClientUsers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()
    const clientIds = memberships.map((m) => m.clientId)
    const clients = await Promise.all(clientIds.map((id) => ctx.db.get(id)))
    return clients.filter(Boolean)
  },
})

export const getClient = query({
  args: { clientId: v.id("serviceClients") },
  handler: async (ctx, { clientId }) => {
    const { userId, user } = await requireAuth(ctx)
    const ok = await canAccessClient(ctx, clientId, userId, user.role)
    if (!ok) throw new Error("Nemáte přístup k tomuto klientovi")
    return await ctx.db.get(clientId)
  },
})

export const createClient = mutation({
  args: {
    name: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    ico: v.optional(v.string()),
    notes: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    completionEmailTemplate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireDispatcher(ctx)
    return await ctx.db.insert("serviceClients", {
      ...args,
      active: true,
      createdBy: userId,
    })
  },
})

export const updateClient = mutation({
  args: {
    clientId: v.id("serviceClients"),
    name: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    ico: v.optional(v.string()),
    notes: v.optional(v.string()),
    active: v.optional(v.boolean()),
    logoUrl: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    completionEmailTemplate: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, ...args }) => {
    await requireDispatcher(ctx)
    await ctx.db.patch(clientId, args)
  },
})

export const deleteClient = mutation({
  args: { clientId: v.id("serviceClients") },
  handler: async (ctx, { clientId }) => {
    await requireDispatcher(ctx)
    await ctx.db.patch(clientId, { active: false })
  },
})

export const listClientUsers = query({
  args: { clientId: v.id("serviceClients") },
  handler: async (ctx, { clientId }) => {
    const { userId, user } = await requireAuth(ctx)
    const ok = await canAccessClient(ctx, clientId, userId, user.role)
    if (!ok) throw new Error("Přístup odepřen")
    const memberships = await ctx.db
      .query("serviceClientUsers")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect()
    return await Promise.all(
      memberships.map(async (m) => ({
        ...m,
        user: await ctx.db.get(m.userId),
      }))
    )
  },
})

export const addClientUser = mutation({
  args: {
    clientId: v.id("serviceClients"),
    userId: v.id("users"),
    role: v.union(v.literal("supervisor"), v.literal("viewer")),
  },
  handler: async (ctx, { clientId, userId: targetUserId, role }) => {
    await requireDispatcher(ctx)
    const existing = await ctx.db
      .query("serviceClientUsers")
      .withIndex("by_client_user", (q) => q.eq("clientId", clientId).eq("userId", targetUserId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { role })
    } else {
      await ctx.db.insert("serviceClientUsers", { clientId, userId: targetUserId, role })
    }
  },
})

export const removeClientUser = mutation({
  args: { membershipId: v.id("serviceClientUsers") },
  handler: async (ctx, { membershipId }) => {
    await requireDispatcher(ctx)
    await ctx.db.delete(membershipId)
  },
})

// ─── Service Locations ────────────────────────────────────────────────────────

export const listLocations = query({
  args: {
    clientId: v.optional(v.id("serviceClients")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, status }) => {
    const { userId, user } = await requireAuth(ctx)

    let locations
    if (clientId) {
      const ok = await canAccessClient(ctx, clientId, userId, user.role)
      if (!ok) throw new Error("Přístup odepřen")
      locations = await ctx.db
        .query("serviceLocations")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect()
    } else if (user.role === "dispatcher") {
      locations = await ctx.db.query("serviceLocations").collect()
    } else {
      // Get all accessible clients
      const memberships = await ctx.db
        .query("serviceClientUsers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      const clientIds = memberships.map((m) => m.clientId)
      const allLocations = await Promise.all(
        clientIds.map((cid) =>
          ctx.db.query("serviceLocations").withIndex("by_client", (q) => q.eq("clientId", cid)).collect()
        )
      )
      locations = allLocations.flat()
    }

    // Filter soft-deleted
    locations = locations.filter((l) => !l.deletedAt)

    if (status) locations = locations.filter((l) => l.status === status)

    return locations
  },
})

export const getLocation = query({
  args: { locationId: v.id("serviceLocations") },
  handler: async (ctx, { locationId }) => {
    const { userId, user } = await requireAuth(ctx)
    const location = await ctx.db.get(locationId)
    if (!location) return null
    const ok = await canAccessClient(ctx, location.clientId, userId, user.role)
    if (!ok) throw new Error("Přístup odepřen")
    // attach photo URL
    let photoUrl: string | null = null
    if (location.photoStorageId) {
      photoUrl = await ctx.storage.getUrl(location.photoStorageId)
    }
    return { ...location, photoUrl }
  },
})

export const createLocation = mutation({
  args: {
    clientId: v.id("serviceClients"),
    name: v.string(),
    locationCode: v.string(),
    locationType: v.string(),
    address: v.string(),
    city: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    openingHours: v.optional(v.string()),
    accessInstructions: v.optional(v.string()),
    pinCode: v.optional(v.string()),
    assignedDriverId: v.optional(v.id("users")),
    internalNotes: v.optional(v.string()),
    publicNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireDispatcher(ctx)
    // Check unique code
    const existing = await ctx.db
      .query("serviceLocations")
      .withIndex("by_code", (q) => q.eq("locationCode", args.locationCode))
      .first()
    if (existing && !existing.deletedAt) throw new Error("Kód lokace musí být unikátní")
    const id = await ctx.db.insert("serviceLocations", {
      ...args,
      status: "active",
      createdBy: userId,
    })
    await ctx.db.insert("vendingAuditLog", {
      entityType: "location",
      entityId: id,
      action: "created",
      userId,
      timestamp: Date.now(),
    })
    return id
  },
})

export const updateLocation = mutation({
  args: {
    locationId: v.id("serviceLocations"),
    name: v.optional(v.string()),
    locationCode: v.optional(v.string()),
    locationType: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("maintenance"), v.literal("offline"))),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    openingHours: v.optional(v.string()),
    accessInstructions: v.optional(v.string()),
    pinCode: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    assignedDriverId: v.optional(v.id("users")),
    internalNotes: v.optional(v.string()),
    publicNotes: v.optional(v.string()),
  },
  handler: async (ctx, { locationId, ...args }) => {
    const { userId } = await requireDispatcher(ctx)
    await ctx.db.patch(locationId, args)
    await ctx.db.insert("vendingAuditLog", {
      entityType: "location",
      entityId: locationId,
      action: "updated",
      userId,
      timestamp: Date.now(),
    })
  },
})

export const deleteLocation = mutation({
  args: { locationId: v.id("serviceLocations") },
  handler: async (ctx, { locationId }) => {
    const { userId } = await requireDispatcher(ctx)
    await ctx.db.patch(locationId, { deletedAt: Date.now() })
    await ctx.db.insert("vendingAuditLog", {
      entityType: "location",
      entityId: locationId,
      action: "deleted",
      userId,
      timestamp: Date.now(),
    })
  },
})

// ─── Service Visits ───────────────────────────────────────────────────────────

export const listVisits = query({
  args: {
    clientId: v.optional(v.id("serviceClients")),
    locationId: v.optional(v.id("serviceLocations")),
    driverId: v.optional(v.id("users")),
    status: v.optional(v.string()),
    fromTs: v.optional(v.number()),
    toTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx)

    let visits
    if (args.locationId) {
      visits = await ctx.db
        .query("serviceVisits")
        .withIndex("by_location", (q) => q.eq("locationId", args.locationId!))
        .collect()
    } else if (args.clientId) {
      const ok = await canAccessClient(ctx, args.clientId, userId, user.role)
      if (!ok) throw new Error("Přístup odepřen")
      visits = await ctx.db
        .query("serviceVisits")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
        .collect()
    } else if (user.role === "service_driver" || user.role === "driver") {
      visits = await ctx.db
        .query("serviceVisits")
        .withIndex("by_driver", (q) => q.eq("driverId", userId))
        .collect()
    } else if (user.role === "dispatcher") {
      visits = await ctx.db.query("serviceVisits").collect()
    } else {
      // Supervisor: get all their clients' visits
      const memberships = await ctx.db
        .query("serviceClientUsers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      const clientIds = memberships.map((m) => m.clientId)
      const all = await Promise.all(
        clientIds.map((cid) =>
          ctx.db.query("serviceVisits").withIndex("by_client", (q) => q.eq("clientId", cid)).collect()
        )
      )
      visits = all.flat()
    }

    visits = visits.filter((v) => !v.deletedAt)
    if (args.status) visits = visits.filter((v) => v.status === args.status)
    if (args.fromTs) visits = visits.filter((v) => v.scheduledAt >= args.fromTs!)
    if (args.toTs) visits = visits.filter((v) => v.scheduledAt <= args.toTs!)
    if (args.driverId) visits = visits.filter((v) => v.driverId === args.driverId)

    return visits.sort((a, b) => a.scheduledAt - b.scheduledAt)
  },
})

export const getVisit = query({
  args: { visitId: v.id("serviceVisits") },
  handler: async (ctx, { visitId }) => {
    const { userId, user } = await requireAuth(ctx)
    const visit = await ctx.db.get(visitId)
    if (!visit) return null
    const ok = await canAccessClient(ctx, visit.clientId, userId, user.role)
    // service_driver can only see their own visits
    if (user.role === "service_driver" && visit.driverId !== userId) {
      throw new Error("Přístup odepřen")
    }
    if (!ok && user.role !== "service_driver") throw new Error("Přístup odepřen")
    const location = await ctx.db.get(visit.locationId)
    const driver = visit.driverId ? await ctx.db.get(visit.driverId) : null
    const timeline = await ctx.db
      .query("visitTimeline")
      .withIndex("by_visit", (q) => q.eq("visitId", visitId))
      .collect()
    const photos = await ctx.db
      .query("visitPhotos")
      .withIndex("by_visit", (q) => q.eq("visitId", visitId))
      .collect()
    const photosWithUrls = await Promise.all(
      photos.map(async (p) => ({
        ...p,
        url: await ctx.storage.getUrl(p.storageId),
      }))
    )
    const incidents = await ctx.db
      .query("visitIncidents")
      .withIndex("by_visit", (q) => q.eq("visitId", visitId))
      .collect()
    const checklist = await ctx.db
      .query("visitChecklists")
      .withIndex("by_visit", (q) => q.eq("visitId", visitId))
      .first()
    let signatureUrl: string | null = null
    if (visit.signatureStorageId) {
      signatureUrl = await ctx.storage.getUrl(visit.signatureStorageId)
    }
    return {
      ...visit,
      location,
      driver,
      timeline: timeline.sort((a, b) => a.timestamp - b.timestamp),
      photos: photosWithUrls,
      incidents,
      checklist,
      signatureUrl,
    }
  },
})

export const createVisit = mutation({
  args: {
    locationId: v.id("serviceLocations"),
    driverId: v.optional(v.id("users")),
    checklistTemplateId: v.optional(v.id("visitChecklistTemplates")),
    scheduledAt: v.number(),
    estimatedDuration: v.optional(v.number()),
    dispatcherNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireDispatcher(ctx)
    const location = await ctx.db.get(args.locationId)
    if (!location) throw new Error("Lokace nenalezena")
    const visitNumber = generateVisitNumber()
    const visitId = await ctx.db.insert("serviceVisits", {
      ...args,
      clientId: location.clientId,
      status: args.driverId ? "assigned" : "scheduled",
      visitNumber,
      createdBy: userId,
    })
    await ctx.db.insert("visitTimeline", {
      visitId,
      event: "created",
      description: "Návštěva naplánována",
      userId,
      timestamp: Date.now(),
    })
    if (args.driverId) {
      await ctx.db.insert("visitTimeline", {
        visitId,
        event: "assigned",
        description: "Přiřazeno řidiči",
        userId,
        timestamp: Date.now(),
      })
    }
    // Update location's next visit
    await ctx.db.patch(args.locationId, { nextVisitAt: args.scheduledAt })
    await ctx.db.insert("vendingAuditLog", {
      entityType: "visit",
      entityId: visitId,
      action: "created",
      userId,
      timestamp: Date.now(),
    })
    return visitId
  },
})

export const updateVisit = mutation({
  args: {
    visitId: v.id("serviceVisits"),
    driverId: v.optional(v.id("users")),
    checklistTemplateId: v.optional(v.id("visitChecklistTemplates")),
    scheduledAt: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    dispatcherNotes: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("scheduled"), v.literal("assigned"), v.literal("accepted"),
      v.literal("en_route"), v.literal("in_progress"), v.literal("completed"),
      v.literal("cancelled"), v.literal("incident"),
    )),
  },
  handler: async (ctx, { visitId, ...args }) => {
    const { userId } = await requireDispatcher(ctx)
    await ctx.db.patch(visitId, args)
    await ctx.db.insert("vendingAuditLog", {
      entityType: "visit",
      entityId: visitId,
      action: "updated",
      userId,
      timestamp: Date.now(),
    })
  },
})

export const cancelVisit = mutation({
  args: { visitId: v.id("serviceVisits"), reason: v.optional(v.string()) },
  handler: async (ctx, { visitId, reason }) => {
    const { userId } = await requireDispatcher(ctx)
    await ctx.db.patch(visitId, { status: "cancelled" })
    await ctx.db.insert("visitTimeline", {
      visitId,
      event: "cancelled",
      description: reason ? `Zrušeno: ${reason}` : "Zrušeno",
      userId,
      timestamp: Date.now(),
    })
  },
})

// ─── Driver Actions ───────────────────────────────────────────────────────────

export const driverAcceptVisit = mutation({
  args: { visitId: v.id("serviceVisits") },
  handler: async (ctx, { visitId }) => {
    const { userId, user } = await requireAuth(ctx)
    const visit = await ctx.db.get(visitId)
    if (!visit) throw new Error("Návštěva nenalezena")
    if (visit.driverId !== userId) throw new Error("Tato návštěva vám není přiřazena")
    await ctx.db.patch(visitId, { status: "accepted" })
    await ctx.db.insert("visitTimeline", {
      visitId,
      event: "accepted",
      description: `${user.name || user.email} přijal(a) návštěvu`,
      userId,
      timestamp: Date.now(),
    })
  },
})

export const driverStartNavigation = mutation({
  args: { visitId: v.id("serviceVisits") },
  handler: async (ctx, { visitId }) => {
    const { userId, user } = await requireAuth(ctx)
    const visit = await ctx.db.get(visitId)
    if (!visit || visit.driverId !== userId) throw new Error("Přístup odepřen")
    await ctx.db.patch(visitId, { status: "en_route" })
    await ctx.db.insert("visitTimeline", {
      visitId,
      event: "en_route",
      description: "Řidič vyrazil",
      userId,
      timestamp: Date.now(),
    })
  },
})

export const driverStartVisit = mutation({
  args: {
    visitId: v.id("serviceVisits"),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, { visitId, lat, lng }) => {
    const { userId, user } = await requireAuth(ctx)
    const visit = await ctx.db.get(visitId)
    if (!visit || visit.driverId !== userId) throw new Error("Přístup odepřen")
    const now = Date.now()
    await ctx.db.patch(visitId, {
      status: "in_progress",
      arrivedAt: now,
      startedAt: now,
      arrivalLat: lat,
      arrivalLng: lng,
    })
    await ctx.db.insert("visitTimeline", {
      visitId,
      event: "arrived",
      description: "Řidič dorazil a zahájil návštěvu",
      userId,
      timestamp: now,
      metadata: JSON.stringify({ lat, lng }),
    })
    // Initialize checklist if template exists
    if (visit.checklistTemplateId) {
      const items = await ctx.db
        .query("visitChecklistItems")
        .withIndex("by_template", (q) => q.eq("templateId", visit.checklistTemplateId!))
        .collect()
      const sortedItems = items.sort((a, b) => a.order - b.order)
      await ctx.db.insert("visitChecklists", {
        visitId,
        templateId: visit.checklistTemplateId!,
        items: sortedItems.map((item) => ({
          itemId: item._id,
          text: item.text,
          completed: false,
        })),
      })
    }
  },
})

export const driverUpdateChecklist = mutation({
  args: {
    checklistId: v.id("visitChecklists"),
    itemIndex: v.number(),
    completed: v.boolean(),
    textValue: v.optional(v.string()),
  },
  handler: async (ctx, { checklistId, itemIndex, completed, textValue }) => {
    const { userId } = await requireAuth(ctx)
    const checklist = await ctx.db.get(checklistId)
    if (!checklist) throw new Error("Checklist nenalezen")
    const items = [...checklist.items]
    items[itemIndex] = { ...items[itemIndex], completed, textValue }
    await ctx.db.patch(checklistId, { items })
  },
})

export const driverCompleteChecklist = mutation({
  args: { checklistId: v.id("visitChecklists") },
  handler: async (ctx, { checklistId }) => {
    await requireAuth(ctx)
    await ctx.db.patch(checklistId, { completedAt: Date.now() })
  },
})

export const driverCompleteVisit = mutation({
  args: {
    visitId: v.id("serviceVisits"),
    driverNotes: v.optional(v.string()),
    signatureStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { visitId, driverNotes, signatureStorageId }) => {
    const { userId, user } = await requireAuth(ctx)
    const visit = await ctx.db.get(visitId)
    if (!visit || visit.driverId !== userId) throw new Error("Přístup odepřen")
    // Verify checklist complete if exists
    if (visit.checklistTemplateId) {
      const checklist = await ctx.db
        .query("visitChecklists")
        .withIndex("by_visit", (q) => q.eq("visitId", visitId))
        .first()
      if (checklist) {
        const required = checklist.items.filter((_, i) => i >= 0) // all
        const allDone = required.every((item) => item.completed)
        if (!allDone) throw new Error("Musíte dokončit všechny povinné položky checklistu")
      }
    }
    const now = Date.now()
    await ctx.db.patch(visitId, {
      status: "completed",
      completedAt: now,
      driverNotes,
      signatureStorageId,
    })
    await ctx.db.insert("visitTimeline", {
      visitId,
      event: "completed",
      description: `Návštěva dokončena${driverNotes ? `: ${driverNotes}` : ""}`,
      userId,
      timestamp: now,
    })
    // Update location's last visit
    await ctx.db.patch(visit.locationId, { lastVisitAt: now })
    await ctx.db.insert("vendingAuditLog", {
      entityType: "visit",
      entityId: visitId,
      action: "completed",
      userId,
      timestamp: now,
    })
    // Send email notification to client contact
    const client = await ctx.db.get(visit.clientId)
    const location = await ctx.db.get(visit.locationId)
    if (client?.contactEmail) {
      const driverName = user.name ?? user.email ?? "Technik"
      const locationName = location?.name ?? "lokace"
      const completedTime = new Date(now).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })
      // Use custom email template if configured, otherwise default
      const defaultMessage = `Servisní návštěva byla úspěšně dokončena.\n\nČíslo návštěvy: ${visit.visitNumber}\nLokace: ${locationName}\nTechnik: ${driverName}\nDokončeno: ${completedTime}${driverNotes ? `\n\nPoznámky technika: ${driverNotes}` : ""}\n\nPro zobrazení kompletního servisního reportu se přihlaste do zákaznického portálu Kurýr4You.\n\n---\nKurýr4You Dispečink`
      const message = client.completionEmailTemplate
        ? client.completionEmailTemplate
            .replace(/\{visitNumber\}/g, visit.visitNumber)
            .replace(/\{location\}/g, locationName)
            .replace(/\{driver\}/g, driverName)
            .replace(/\{time\}/g, completedTime)
            .replace(/\{notes\}/g, driverNotes ?? "")
        : defaultMessage
      await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
        toEmail: client.contactEmail,
        subject: `Servisní návštěva dokončena — ${locationName} (${visit.visitNumber})`,
        message,
      })
    }
  },
})

// ─── Photos ───────────────────────────────────────────────────────────────────

export const addVisitPhoto = mutation({
  args: {
    visitId: v.id("serviceVisits"),
    storageId: v.id("_storage"),
    category: v.union(v.literal("before"), v.literal("after"), v.literal("damage"), v.literal("other")),
    caption: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, { visitId, storageId, category, caption, lat, lng }) => {
    const { userId } = await requireAuth(ctx)
    const visit = await ctx.db.get(visitId)
    if (!visit) throw new Error("Návštěva nenalezena")
    return await ctx.db.insert("visitPhotos", {
      visitId,
      locationId: visit.locationId,
      clientId: visit.clientId,
      uploadedBy: userId,
      storageId,
      category,
      caption,
      lat,
      lng,
      takenAt: Date.now(),
    })
  },
})

export const deleteVisitPhoto = mutation({
  args: { photoId: v.id("visitPhotos") },
  handler: async (ctx, { photoId }) => {
    const { userId, user } = await requireAuth(ctx)
    const photo = await ctx.db.get(photoId)
    if (!photo) throw new Error("Foto nenalezeno")
    if (photo.uploadedBy !== userId && user.role !== "dispatcher") {
      throw new Error("Nelze smazat cizí foto")
    }
    await ctx.storage.delete(photo.storageId)
    await ctx.db.delete(photoId)
  },
})

export const listClientPhotos = query({
  args: { clientId: v.id("serviceClients"), limit: v.optional(v.number()) },
  handler: async (ctx, { clientId, limit = 40 }) => {
    const { userId, user } = await requireAuth(ctx)
    const ok = await canAccessClient(ctx, clientId, userId, user.role)
    if (!ok) throw new Error("Přístup odepřen")
    const photos = await ctx.db
      .query("visitPhotos")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .order("desc")
      .take(limit)
    return await Promise.all(photos.map(async (p) => ({
      ...p,
      url: await ctx.storage.getUrl(p.storageId),
    })))
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

// ─── Incidents ────────────────────────────────────────────────────────────────

export const reportIncident = mutation({
  args: {
    visitId: v.id("serviceVisits"),
    type: v.union(
      v.literal("machine_locked"), v.literal("pin_incorrect"), v.literal("machine_damaged"),
      v.literal("broken_display"), v.literal("no_products"), v.literal("wrong_products"),
      v.literal("power_failure"), v.literal("vandalism"), v.literal("other"),
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    description: v.string(),
    photoStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx)
    const visit = await ctx.db.get(args.visitId)
    if (!visit) throw new Error("Návštěva nenalezena")
    const incidentId = await ctx.db.insert("visitIncidents", {
      ...args,
      locationId: visit.locationId,
      clientId: visit.clientId,
      reportedBy: userId,
      status: "open",
      createdAt: Date.now(),
    })
    // Mark visit as incident
    await ctx.db.patch(args.visitId, { status: "incident" })
    await ctx.db.insert("visitTimeline", {
      visitId: args.visitId,
      event: "incident",
      description: `Incident hlášen: ${args.type}`,
      userId,
      timestamp: Date.now(),
    })
    return incidentId
  },
})

export const listIncidents = query({
  args: {
    clientId: v.optional(v.id("serviceClients")),
    locationId: v.optional(v.id("serviceLocations")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, locationId, status }) => {
    const { userId, user } = await requireAuth(ctx)
    let incidents
    if (locationId) {
      incidents = await ctx.db
        .query("visitIncidents")
        .withIndex("by_location", (q) => q.eq("locationId", locationId))
        .collect()
    } else if (clientId) {
      const ok = await canAccessClient(ctx, clientId, userId, user.role)
      if (!ok) throw new Error("Přístup odepřen")
      incidents = await ctx.db
        .query("visitIncidents")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect()
    } else if (user.role === "dispatcher") {
      incidents = await ctx.db.query("visitIncidents").collect()
    } else {
      const memberships = await ctx.db
        .query("serviceClientUsers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      const all = await Promise.all(
        memberships.map((m) =>
          ctx.db.query("visitIncidents").withIndex("by_client", (q) => q.eq("clientId", m.clientId)).collect()
        )
      )
      incidents = all.flat()
    }
    if (status) incidents = incidents.filter((i) => i.status === status)
    return incidents.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const resolveIncident = mutation({
  args: {
    incidentId: v.id("visitIncidents"),
    resolutionNote: v.string(),
  },
  handler: async (ctx, { incidentId, resolutionNote }) => {
    const { userId } = await requireDispatcher(ctx)
    await ctx.db.patch(incidentId, {
      status: "resolved",
      resolvedAt: Date.now(),
      resolvedBy: userId,
      resolutionNote,
    })
  },
})

// ─── Checklist Templates ──────────────────────────────────────────────────────

export const listChecklistTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx)
    return await ctx.db.query("visitChecklistTemplates").collect()
  },
})

export const getChecklistTemplate = query({
  args: { templateId: v.id("visitChecklistTemplates") },
  handler: async (ctx, { templateId }) => {
    await requireAuth(ctx)
    const template = await ctx.db.get(templateId)
    if (!template) return null
    const items = await ctx.db
      .query("visitChecklistItems")
      .withIndex("by_template", (q) => q.eq("templateId", templateId))
      .collect()
    return { ...template, items: items.sort((a, b) => a.order - b.order) }
  },
})

export const createChecklistTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    locationTypes: v.array(v.string()),
    items: v.array(v.object({
      text: v.string(),
      required: v.boolean(),
      type: v.union(v.literal("checkbox"), v.literal("text"), v.literal("photo")),
      hint: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { items, ...templateArgs }) => {
    const { userId } = await requireDispatcher(ctx)
    const templateId = await ctx.db.insert("visitChecklistTemplates", {
      ...templateArgs,
      active: true,
      createdBy: userId,
    })
    for (let i = 0; i < items.length; i++) {
      await ctx.db.insert("visitChecklistItems", {
        templateId,
        order: i,
        ...items[i],
      })
    }
    return templateId
  },
})

export const updateChecklistTemplate = mutation({
  args: {
    templateId: v.id("visitChecklistTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    locationTypes: v.optional(v.array(v.string())),
    active: v.optional(v.boolean()),
    items: v.optional(v.array(v.object({
      text: v.string(),
      required: v.boolean(),
      type: v.union(v.literal("checkbox"), v.literal("text"), v.literal("photo")),
      hint: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, { templateId, items, ...args }) => {
    await requireDispatcher(ctx)
    await ctx.db.patch(templateId, args)
    if (items !== undefined) {
      // Delete old items
      const old = await ctx.db
        .query("visitChecklistItems")
        .withIndex("by_template", (q) => q.eq("templateId", templateId))
        .collect()
      await Promise.all(old.map((item) => ctx.db.delete(item._id)))
      // Insert new
      for (let i = 0; i < items.length; i++) {
        await ctx.db.insert("visitChecklistItems", { templateId, order: i, ...items[i] })
      }
    }
  },
})

// ─── KPI / Statistics ─────────────────────────────────────────────────────────

export const getClientKpi = query({
  args: {
    clientId: v.id("serviceClients"),
    fromTs: v.optional(v.number()),
    toTs: v.optional(v.number()),
  },
  handler: async (ctx, { clientId, fromTs, toTs }) => {
    const { userId, user } = await requireAuth(ctx)
    const ok = await canAccessClient(ctx, clientId, userId, user.role)
    if (!ok) throw new Error("Přístup odepřen")

    const now = Date.now()
    const from = fromTs ?? now - 30 * 24 * 60 * 60 * 1000
    const to = toTs ?? now

    const visits = await ctx.db
      .query("serviceVisits")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect()

    const filtered = visits.filter((v) => v.scheduledAt >= from && v.scheduledAt <= to && !v.deletedAt)
    const completed = filtered.filter((v) => v.status === "completed")
    const incidents = await ctx.db
      .query("visitIncidents")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect()
    const filteredIncidents = incidents.filter((i) => i.createdAt >= from && i.createdAt <= to)

    // Avg duration
    const durations = completed
      .filter((v) => v.startedAt && v.completedAt)
      .map((v) => (v.completedAt! - v.startedAt!) / 60000)
    const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    // On-time % (arrived within 30min of scheduled)
    const onTime = completed.filter((v) => v.arrivedAt && v.arrivedAt - v.scheduledAt < 30 * 60 * 1000).length
    const onTimePct = completed.length ? Math.round((onTime / completed.length) * 100) : 0

    // Photos
    const photos = await ctx.db
      .query("visitPhotos")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect()
    const filteredPhotos = photos.filter((p) => p.takenAt >= from && p.takenAt <= to)

    // Locations
    const locations = await ctx.db
      .query("serviceLocations")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect()
    const activeLocations = locations.filter((l) => !l.deletedAt && l.status === "active")

    return {
      totalVisits: filtered.length,
      completedVisits: completed.length,
      cancelledVisits: filtered.filter((v) => v.status === "cancelled").length,
      incidentVisits: filtered.filter((v) => v.status === "incident").length,
      avgDurationMin: Math.round(avgDuration),
      onTimePct,
      totalIncidents: filteredIncidents.length,
      openIncidents: filteredIncidents.filter((i) => i.status === "open").length,
      photosUploaded: filteredPhotos.length,
      totalLocations: locations.filter((l) => !l.deletedAt).length,
      activeLocations: activeLocations.length,
      completionRate: filtered.length ? Math.round((completed.length / filtered.length) * 100) : 0,
    }
  },
})

export const getVisitChartData = query({
  args: {
    clientId: v.id("serviceClients"),
    period: v.union(v.literal("week"), v.literal("month"), v.literal("year")),
  },
  handler: async (ctx, { clientId, period }) => {
    const { userId, user } = await requireAuth(ctx)
    const ok = await canAccessClient(ctx, clientId, userId, user.role)
    if (!ok) throw new Error("Přístup odepřen")

    const now = Date.now()
    let fromTs: number
    let buckets: { label: string; from: number; to: number }[] = []

    if (period === "week") {
      fromTs = now - 7 * 24 * 60 * 60 * 1000
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000)
        buckets.push({
          label: d.toLocaleDateString("cs-CZ", { weekday: "short" }),
          from: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          to: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1,
        })
      }
    } else if (period === "month") {
      fromTs = now - 30 * 24 * 60 * 60 * 1000
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000)
        buckets.push({
          label: `${d.getDate()}.${d.getMonth() + 1}`,
          from: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          to: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1,
        })
      }
    } else {
      fromTs = now - 365 * 24 * 60 * 60 * 1000
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now)
        d.setMonth(d.getMonth() - i, 1)
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        buckets.push({
          label: d.toLocaleDateString("cs-CZ", { month: "short" }),
          from: d.getTime(),
          to: next.getTime() - 1,
        })
      }
    }

    const visits = await ctx.db
      .query("serviceVisits")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect()

    return buckets.map((b) => {
      const bVisits = visits.filter((v) => v.scheduledAt >= b.from && v.scheduledAt <= b.to)
      return {
        label: b.label,
        completed: bVisits.filter((v) => v.status === "completed").length,
        incidents: bVisits.filter((v) => v.status === "incident").length,
        total: bVisits.length,
      }
    })
  },
})

export const getDispatcherOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireDispatcher(ctx)
    const allLocations = await ctx.db.query("serviceLocations").collect()
    const active = allLocations.filter((l) => !l.deletedAt && l.status === "active").length
    const offline = allLocations.filter((l) => !l.deletedAt && l.status === "offline").length
    const maintenance = allLocations.filter((l) => !l.deletedAt && l.status === "maintenance").length

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000

    const allVisits = await ctx.db.query("serviceVisits").collect()
    const todayVisits = allVisits.filter((v) => v.scheduledAt >= todayStart && v.scheduledAt < todayEnd && !v.deletedAt)
    const allIncidents = await ctx.db.query("visitIncidents").collect()
    const openIncidents = allIncidents.filter((i) => i.status === "open").length

    const clients = await ctx.db.query("serviceClients").collect()

    return {
      totalLocations: allLocations.filter((l) => !l.deletedAt).length,
      activeLocations: active,
      offlineLocations: offline,
      maintenanceLocations: maintenance,
      todayVisitsTotal: todayVisits.length,
      todayVisitsCompleted: todayVisits.filter((v) => v.status === "completed").length,
      todayVisitsInProgress: todayVisits.filter((v) => v.status === "in_progress").length,
      openIncidents,
      totalClients: clients.filter((c) => c.active).length,
    }
  },
})

export const getDriverTodayVisits = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx)
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 * 2 // next 2 days

    const visits = await ctx.db
      .query("serviceVisits")
      .withIndex("by_driver", (q) => q.eq("driverId", userId))
      .collect()

    const upcoming = visits.filter(
      (v) => !v.deletedAt && v.scheduledAt >= todayStart && v.scheduledAt < todayEnd &&
        !["completed", "cancelled"].includes(v.status)
    )

    return await Promise.all(
      upcoming.map(async (v) => ({
        ...v,
        location: await ctx.db.get(v.locationId),
      }))
    )
  },
})
