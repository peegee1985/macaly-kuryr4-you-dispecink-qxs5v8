"use node";

import { v } from "convex/values"
import { action, internalAction } from "./_generated/server"
import { internal } from "./_generated/api"

// Internal action: send push notification to a specific user
export const sendPushToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const webpush = await import("web-push")

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@kuryr4you.cz"

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[Push] VAPID keys not configured")
      return null
    }

    webpush.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const subscriptions = await ctx.runMutation(internal.pushNotifications.getSubscriptionsForUser, {
      userId: args.userId,
    })

    console.log(`[Push] Sending to ${subscriptions.length} subscription(s) for user ${args.userId}`)

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url ?? "/",
      tag: args.tag ?? "default",
    })

    for (const sub of subscriptions) {
      try {
        await webpush.default.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        console.log(`[Push] Sent to ${sub.endpoint.slice(0, 50)}...`)
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          console.log(`[Push] Removing expired subscription ${sub._id}`)
          await ctx.runMutation(internal.pushNotifications.deleteSubscription, {
            subscriptionId: sub._id,
          })
        } else {
          console.error(`[Push] Error sending push: ${String(err)}`)
        }
      }
    }

    return null
  },
})

// Internal action: broadcast "new available order" push to all eligible drivers
export const broadcastAvailableOrder = internalAction({
  args: {
    rideId: v.id("rides"),
    rideNumber: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const drivers = await ctx.runQuery(internal.users.getActiveDriversForBroadcast)
    const now = Date.now()
    const COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes

    console.log(`[Push] Broadcasting available order ${args.rideNumber} to ${drivers.length} active driver(s)`)

    for (const driver of drivers) {
      // Skip if driver opted out
      if (driver.driverPushAvailable === false) continue

      // Skip if within cooldown window
      const lastPush = driver.lastAvailableOrderPushAt ?? 0
      if (now - lastPush < COOLDOWN_MS) {
        console.log(`[Push] Skipping driver ${driver._id} – cooldown active (${Math.round((COOLDOWN_MS - (now - lastPush)) / 60000)} min remaining)`)
        continue
      }

      // Update cooldown timestamp before sending to avoid race conditions
      await ctx.runMutation(internal.users.setLastAvailablePush, { driverId: driver._id, timestamp: now })

      await ctx.runAction(internal.pushNotificationsActions.sendPushToUser, {
        userId: driver._id,
        title: "🆕 Nová volná zakázka",
        body: `Zakázka ${args.rideNumber} je k dispozici`,
        url: "/ridic/zakazky",
        tag: `available-order-${args.rideId}`,
      })
    }

    return null
  },
})

// Public action: get VAPID public key for client subscription
export const getVapidPublicKey = action({
  args: {},
  returns: v.string(),
  handler: async () => {
    return process.env.VAPID_PUBLIC_KEY ?? ""
  },
})
