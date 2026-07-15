"use node"

import Stripe from "stripe"
import { v } from "convex/values"
import { action } from "./_generated/server"
import { internal, api } from "./_generated/api"

export const createGuestCheckoutSession = action({
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
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    rideNumber: v.optional(v.string()),
    price: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log("[guestCheckout] createGuestCheckoutSession start for", args.contactEmail)

    try {
      // 1. Re-calculate price server-side (never trust client price)
      const pricing = await ctx.runAction(api.aiPricing.suggestPrice, {
        pickupAddress: args.pickupAddress,
        deliveryAddress: args.deliveryAddress,
        cargoType: args.cargoType,
        cargoDescription: args.cargoDescription,
        weight: args.weight,
        quantity: args.quantity,
        notes: args.notes,
        requestedPickupAt: args.requestedPickupAt,
        requestedDeliveryAt: args.requestedDeliveryAt,
      })

      const price = pricing.doporucenaCena
      const currency = "czk"

      if (!price || price <= 0) {
        return { success: false, error: "Nepodařilo se nacenit zásilku. Zkuste to prosím znovu." }
      }

      console.log(`[guestCheckout] Server-side price: ${price} ${currency}`)

      // 2. Store pending order in DB
      const { id: pendingOrderId, rideNumber } = await ctx.runMutation(
        internal.guestOrders.createPendingOrder,
        {
          contactName: args.contactName,
          contactEmail: args.contactEmail,
          contactPhone: args.contactPhone,
          pickupAddress: args.pickupAddress,
          pickupContactName: args.pickupContactName,
          pickupContactPhone: args.pickupContactPhone,
          requestedPickupAt: args.requestedPickupAt,
          deliveryAddress: args.deliveryAddress,
          deliveryContactName: args.deliveryContactName,
          deliveryContactPhone: args.deliveryContactPhone,
          requestedDeliveryAt: args.requestedDeliveryAt,
          cargoType: args.cargoType,
          cargoDescription: args.cargoDescription,
          weight: args.weight,
          quantity: args.quantity,
          notes: args.notes,
          price,
          currency,
          aiVehicle: pricing.typVozidla,
          aiDistance: pricing.odhadnutaVzdalenost,
          aiUrgency: pricing.urgence,
        },
      )

      // 3. Create Stripe session
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

      const session = await stripe.checkout.sessions.create({
        ui_mode: "hosted_page",
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: Math.round(price * 100),
              product_data: {
                name: `Kuryr4You – Zásilka ${rideNumber}`,
                description: `${args.pickupAddress} → ${args.deliveryAddress}`,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: args.contactEmail,
        metadata: {
          pendingOrderId,
          rideNumber,
          contactName: args.contactName,
          contactEmail: args.contactEmail,
          contactPhone: args.contactPhone,
        },
        success_url: `https://www.kuryr4you.cz/platba-uspesna?zakazka=${rideNumber}`,
        cancel_url: `https://www.kuryr4you.cz/objednat?cancelled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 7200,
      })

      // 4. Store session ID
      await ctx.runMutation(internal.guestOrders.setStripeSession, {
        id: pendingOrderId,
        stripeSessionId: session.id,
      })

      console.log(`[guestCheckout] Stripe session: ${session.id}, url: ${session.url}`)
      return { success: true, checkoutUrl: session.url!, rideNumber, price }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[guestCheckout] error:", msg)
      return { success: false, error: msg }
    }
  },
})
