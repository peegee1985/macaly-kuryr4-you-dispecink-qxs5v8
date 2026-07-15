"use node"

import Stripe from "stripe"
import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"

// Price conversion helper: human-readable price -> Stripe unit amount
const ZERO_DECIMAL = new Set([
  "bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf",
  "ugx","vnd","vuv","xaf","xof","xpf",
])
const THREE_DECIMAL = new Set(["bhd", "kwd", "omr"])

function toUnitAmount(price: number, currency: string): number {
  const c = currency.toLowerCase()
  if (ZERO_DECIMAL.has(c)) return Math.round(price)
  if (THREE_DECIMAL.has(c)) return Math.round(price * 1000)
  return Math.round(price * 100)
}

/**
 * Creates a Stripe hosted checkout session for a ride payment,
 * stores the URL on the ride, and emails it to the customer.
 */
export const createPaymentLink = internalAction({
  args: {
    rideId: v.id("rides"),
    rideNumber: v.string(),
    price: v.number(),
    currency: v.string(),
    customerEmail: v.string(),
    customerName: v.string(),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
  },
  returns: v.object({ success: v.boolean(), paymentUrl: v.optional(v.string()), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    console.log("[stripe] createPaymentLink for ride", args.rideNumber)
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

      const session = await stripe.checkout.sessions.create({
        ui_mode: "hosted_page",
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: args.currency.toLowerCase(),
              unit_amount: toUnitAmount(args.price, args.currency),
              product_data: {
                name: `Kuryr4You – Zásilka ${args.rideNumber}`,
                description: `${args.pickupAddress} → ${args.deliveryAddress}`,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: args.customerEmail,
        metadata: {
          rideId: args.rideId,
          rideNumber: args.rideNumber,
        },
        // success_url is required for hosted_page
        success_url: `https://www.kuryr4you.cz/platba-uspesna?zakazka=${args.rideNumber}`,
        // Store session URL for 24h
        expires_at: Math.floor(Date.now() / 1000) + 86400, // 24h
      })

      const paymentUrl = session.url!

      // Store session ID and URL on the ride
      await ctx.runMutation(internal.rides.setStripeSession, {
        rideId: args.rideId,
        stripeSessionId: session.id,
        stripePaymentUrl: paymentUrl,
      })

      // Email the customer
      await ctx.runAction(internal.email.sendEmail, {
        toEmail: args.customerEmail,
        subject: `Kuryr4You – Platba za zásilku ${args.rideNumber}`,
        message: `Dobrý den, ${args.customerName},\n\nVaše zásilka ${args.rideNumber} je připravena k platbě.\n\nČástka: ${args.price.toFixed(2)} ${args.currency.toUpperCase()}\nVyzvednutí: ${args.pickupAddress}\nDoručení: ${args.deliveryAddress}\n\nZaplatit online:\n${paymentUrl}\n\nOdkaz je platný 24 hodin.\n\nDěkujeme,\nKuryr4You Dispečink`,
      })

      console.log("[stripe] Payment link created:", paymentUrl)
      return { success: true, paymentUrl }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[stripe] createPaymentLink failed:", msg)
      return { success: false, error: msg }
    }
  },
})

/**
 * Handles incoming Stripe webhook events.
 * Called by the HTTP route in http.ts after receiving the raw payload.
 */
export const handleWebhook = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
    mode: v.union(v.literal("test"), v.literal("live")),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        args.payload,
        args.signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      )
    } catch (err) {
      console.error("[stripe] Webhook signature verification failed:", err)
      return { success: false }
    }

    console.log("[stripe] Webhook event:", event.type)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const rideId = session.metadata?.rideId
        const pendingOrderId = session.metadata?.pendingOrderId
        const rideNumber = session.metadata?.rideNumber ?? ""

        if (pendingOrderId) {
          // ── Guest checkout flow ──────────────────────────────────────
          console.log("[stripe] Guest checkout completed, pending order:", pendingOrderId)

          const contactName = session.metadata?.contactName ?? ""
          const contactEmail = session.metadata?.contactEmail ?? (session.customer_email ?? "")
          const contactPhone = session.metadata?.contactPhone ?? ""
          const amountPaid = (session.amount_total ?? 0) / 100
          const currency = session.currency ?? "czk"

          // Create (or find) guest user
          const userId = await ctx.runMutation(internal.guestOrders.findOrCreateGuestUser, {
            email: contactEmail,
            name: contactName,
            phone: contactPhone,
          })

          // Convert pending order to ride
          const { rideId: newRideId, trackingToken } = await ctx.runMutation(
            internal.guestOrders.fulfillGuestOrder,
            {
              pendingOrderId: pendingOrderId as any,
              customerId: userId,
              stripeSessionId: session.id,
              rideNumber,
              amountPaid,
              currency,
            },
          )

          // Send confirmation email
          await ctx.runAction(internal.email.sendEmail, {
            toEmail: contactEmail,
            subject: `Kuryr4You – Zásilka ${rideNumber} přijata`,
            message: `Dobrý den, ${contactName},\n\nVaše platba proběhla úspěšně a zásilka ${rideNumber} byla přijata k doručení.\n\nČástka: ${amountPaid.toFixed(2)} ${currency.toUpperCase()}\n\nNáš dispečer brzy přiřadí řidiče a zásilka bude vyzvednutá ve sjednaném čase.\n\nSledovat zásilku:\nhttps://www.kuryr4you.cz/sledovani/${trackingToken}\n\nDěkujeme za objednávku,\nKuryr4You`,
          })

          console.log("[stripe] Guest ride created:", newRideId, "rideNumber:", rideNumber)
          break
        }

        if (!rideId) {
          console.warn("[stripe] checkout.session.completed: no rideId or pendingOrderId in metadata")
          break
        }

        // ── Standard (registered customer) flow ─────────────────────
        await ctx.runMutation(internal.rides.markRideAsPaid, {
          rideId: rideId as any,
          rideNumber,
          customerEmail: session.customer_email ?? "",
          amountPaid: (session.amount_total ?? 0) / 100,
          currency: session.currency ?? "czk",
        })
        break
      }
    }

    return { success: true }
  },
})
