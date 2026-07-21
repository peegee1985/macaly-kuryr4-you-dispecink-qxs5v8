import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"

// Řidič je "online", pokud je přihlášen a jeho aplikace poslala heartbeat
// (nebo GPS polohu) v posledních 90 sekundách. Heartbeat chodí každých 30 s.
export const ONLINE_TTL_MS = 90_000

// Vloží in-app notifikaci všem aktivním dispečerům (kromě případného původce akce).
export async function notifyDispatchers(
  ctx: MutationCtx,
  notification: {
    title: string
    message: string
    type: "ride_status" | "ride_assigned" | "invoice" | "approval" | "system"
    rideId?: Id<"rides">
  },
  excludeUserId?: Id<"users">,
) {
  const dispatchers = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "dispatcher"))
    .collect()
  for (const dispatcher of dispatchers) {
    if (dispatcher.status !== "active") continue
    if (excludeUserId && dispatcher._id === excludeUserId) continue
    await ctx.db.insert("notifications", {
      userId: dispatcher._id,
      title: notification.title,
      message: notification.message,
      read: false,
      type: notification.type,
      rideId: notification.rideId,
    })
  }
}

function driverLabel(driver: Doc<"users">) {
  const name = driver.name ?? driver.email ?? "Neznámý řidič"
  return driver.vehiclePlate ? `${name} (${driver.vehiclePlate})` : name
}

// Aktualizuje presence záznam řidiče. Při přechodu offline → online
// upozorní dispečery. Volá heartbeat i GPS updateLocation.
export async function touchDriverPresence(ctx: MutationCtx, driver: Doc<"users">) {
  const now = Date.now()
  const existing = await ctx.db
    .query("driverPresence")
    .withIndex("by_driver", (q) => q.eq("driverId", driver._id))
    .first()

  const wasOnline =
    existing !== null && existing.isOnline && now - existing.lastSeenAt <= ONLINE_TTL_MS

  if (existing) {
    await ctx.db.patch(existing._id, { isOnline: true, lastSeenAt: now })
  } else {
    await ctx.db.insert("driverPresence", { driverId: driver._id, isOnline: true, lastSeenAt: now })
  }

  if (!wasOnline) {
    await notifyDispatchers(ctx, {
      title: "Řidič online",
      message: `${driverLabel(driver)} se přihlásil do aplikace.`,
      type: "system",
    })
  }
}

// Řidičská aplikace: pravidelný heartbeat (každých 30 s, dokud je řidič přihlášen).
export const heartbeat = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return null
    await touchDriverPresence(ctx, user)
    return null
  },
})

// Řidičská aplikace: explicitní odhlášení (volá se před signOut).
export const goOffline = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return null

    const existing = await ctx.db
      .query("driverPresence")
      .withIndex("by_driver", (q) => q.eq("driverId", user._id))
      .first()
    const wasOnline =
      existing !== null &&
      existing.isOnline &&
      Date.now() - existing.lastSeenAt <= ONLINE_TTL_MS
    if (existing) {
      await ctx.db.patch(existing._id, { isOnline: false, lastSeenAt: Date.now() })
    }
    if (wasOnline) {
      await notifyDispatchers(ctx, {
        title: "Řidič offline",
        message: `${driverLabel(user)} se odhlásil z aplikace.`,
        type: "system",
      })
    }
    return null
  },
})

// Dispečink: stav všech řidičů (online = přihlášen, i bez zapnuté GPS).
export const listDriverPresence = query({
  args: {},
  returns: v.array(
    v.object({
      driverId: v.id("users"),
      isOnline: v.boolean(),
      lastSeenAt: v.number(),
      driverName: v.optional(v.string()),
      vehiclePlate: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    const now = Date.now()
    const rows = await ctx.db.query("driverPresence").collect()
    const result: Array<{
      driverId: Id<"users">
      isOnline: boolean
      lastSeenAt: number
      driverName?: string
      vehiclePlate?: string
    }> = []
    for (const row of rows) {
      const driver = await ctx.db.get(row.driverId)
      if (!driver) continue
      result.push({
        driverId: row.driverId,
        isOnline: row.isOnline && now - row.lastSeenAt <= ONLINE_TTL_MS,
        lastSeenAt: row.lastSeenAt,
        driverName: driver.name,
        vehiclePlate: driver.vehiclePlate,
      })
    }
    return result
  },
})

// Cron: řidiče bez heartbeatu označí offline a upozorní dispečery
// (pokrývá zabití aplikace nebo ztrátu připojení bez odhlášení).
export const sweepStalePresence = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now()
    const online = await ctx.db
      .query("driverPresence")
      .withIndex("by_online", (q) => q.eq("isOnline", true))
      .collect()
    for (const row of online) {
      if (now - row.lastSeenAt <= ONLINE_TTL_MS) continue
      await ctx.db.patch(row._id, { isOnline: false })
      const driver = await ctx.db.get(row.driverId)
      if (driver) {
        await notifyDispatchers(ctx, {
          title: "Řidič offline",
          message: `${driverLabel(driver)} ztratil spojení s aplikací.`,
          type: "system",
        })
      }
    }
    return null
  },
})
