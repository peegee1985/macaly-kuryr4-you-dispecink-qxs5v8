import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const OFFLINE_AFTER_MS = 120_000;

async function notifyActiveDispatchers(
  ctx: MutationCtx,
  title: string,
  message: string,
) {
  const dispatchers = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "dispatcher"))
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect();

  for (const dispatcher of dispatchers) {
    await ctx.db.insert("notifications", {
      userId: dispatcher._id,
      title,
      message,
      read: false,
      type: "system",
    });
  }
}

function driverLabel(driver: { name?: string; email: string }) {
  return driver.name?.trim() || driver.email;
}

export const heartbeat = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Nejste přihlášeni");
    const driver = await ctx.db.get(authId as Id<"users">);
    if (!driver || driver.role !== "driver" || driver.status !== "active") {
      throw new Error("Přítomnost může hlásit pouze aktivní řidič");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("driverPresence")
      .withIndex("by_driver", (q) => q.eq("driverId", driver._id))
      .first();
    const wasRecentlyOnline = Boolean(
      existing?.isOnline && now - existing.lastSeenAt < OFFLINE_AFTER_MS,
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        isOnline: true,
        lastSeenAt: now,
        onlineSince: wasRecentlyOnline ? (existing.onlineSince ?? now) : now,
        offlineSince: undefined,
      });
    } else {
      await ctx.db.insert("driverPresence", {
        driverId: driver._id,
        isOnline: true,
        lastSeenAt: now,
        onlineSince: now,
      });
    }

    if (!wasRecentlyOnline) {
      await notifyActiveDispatchers(
        ctx,
        "Řidič je online",
        `${driverLabel(driver)} se přihlásil do aplikace.`,
      );
    }

    await ctx.scheduler.runAfter(
      OFFLINE_AFTER_MS,
      internal.presence.expirePresence,
      { driverId: driver._id, expectedLastSeenAt: now },
    );
    return null;
  },
});

export const setOffline = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) return null;
    const driver = await ctx.db.get(authId as Id<"users">);
    if (!driver || driver.role !== "driver") return null;

    const presence = await ctx.db
      .query("driverPresence")
      .withIndex("by_driver", (q) => q.eq("driverId", driver._id))
      .first();
    if (!presence?.isOnline) return null;

    const now = Date.now();
    await ctx.db.patch(presence._id, {
      isOnline: false,
      lastSeenAt: now,
      offlineSince: now,
    });
    await notifyActiveDispatchers(
      ctx,
      "Řidič je offline",
      `${driverLabel(driver)} ukončil nebo opustil aplikaci.`,
    );
    return null;
  },
});

export const expirePresence = internalMutation({
  args: {
    driverId: v.id("users"),
    expectedLastSeenAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("driverPresence")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .first();
    if (!presence?.isOnline || presence.lastSeenAt !== args.expectedLastSeenAt)
      return null;

    const driver = await ctx.db.get(args.driverId);
    const now = Date.now();
    await ctx.db.patch(presence._id, {
      isOnline: false,
      offlineSince: now,
    });
    if (driver) {
      await notifyActiveDispatchers(
        ctx,
        "Řidič je offline",
        `${driverLabel(driver)} přestal být dostupný.`,
      );
    }
    return null;
  },
});

export const listDriverPresence = query({
  args: {},
  returns: v.array(
    v.object({
      driverId: v.id("users"),
      isOnline: v.boolean(),
      lastSeenAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) return [];
    const user = await ctx.db.get(authId as Id<"users">);
    if (!user || user.role !== "dispatcher") return [];

    const rows = await ctx.db.query("driverPresence").collect();
    const now = Date.now();
    return rows.map((row) => ({
      driverId: row.driverId,
      isOnline: row.isOnline && now - row.lastSeenAt < OFFLINE_AFTER_MS,
      lastSeenAt: row.lastSeenAt,
    }));
  },
});
