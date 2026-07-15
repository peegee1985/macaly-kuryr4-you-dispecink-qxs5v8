import { v } from "convex/values"
import { mutation, query, internalMutation } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { DEFAULT_RECEIPT_TEMPLATE } from "./siteSettings"

function generateReceiptNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `UC${y}${m}${d}-${rand}`
}

// Internal: generate receipt after ride is delivered
export const generateReceiptInternal = internalMutation({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId)
    if (!ride) return null

    // Only generate when BOTH delivered AND paid
    if (ride.status !== "delivered" || ride.isPaid !== true) {
      console.log(`Receipt skipped for ride ${ride.rideNumber}: status=${ride.status}, isPaid=${ride.isPaid}`)
      return null
    }

    // Don't create duplicate receipt
    const existing = await ctx.db
      .query("receipts")
      .withIndex("by_ride", (q) => q.eq("rideId", args.rideId))
      .first()
    if (existing) return existing._id

    const customer = await ctx.db.get(ride.customerId)
    const driver = ride.driverId ? await ctx.db.get(ride.driverId) : null

    // Check if receipts are enabled for this customer
    // Default: enabled for non-corporate, disabled for corporate
    if (customer) {
      const isCorporate = customer.corporateStatus === "approved"
      const receiptEnabled = customer.receiptEnabled
      // If explicitly disabled → skip
      // If not set (undefined): default = OFF for corporate, ON for non-corporate
      if (receiptEnabled === false || (receiptEnabled === undefined && isCorporate)) {
        console.log(`Receipt skipped for customer ${customer.email} (receipts disabled or corporate)`)
        return null
      }
    }

    // Determine payment method from ride data
    let paymentMethod: "hotovost" | "prevod" | "faktura" | "karta" = "hotovost"
    if (ride.stripeSessionId) {
      paymentMethod = "karta"
    } else if (ride.invoiceId) {
      paymentMethod = "faktura"
    } else if (customer?.corporateStatus === "approved") {
      paymentMethod = "faktura"
    }

    const receiptId = await ctx.db.insert("receipts", {
      rideId: ride._id,
      customerId: ride.customerId,
      receiptNumber: generateReceiptNumber(),
      issuedAt: Date.now(),
      amount: ride.price ?? 0,
      currency: ride.currency ?? "CZK",
      paymentMethod,
      isPaid: ride.isPaid,
      driverName: driver?.name,
      customerName: customer?.name,
      customerEmail: customer?.email,
      pickupAddress: ride.pickupAddress,
      deliveryAddress: ride.deliveryAddress,
      cargoDescription: ride.cargoDescription,
      rideNumber: ride.rideNumber,
    })

    console.log(`Receipt generated: ${receiptId} for ride ${ride.rideNumber}`)

    // Send receipt email to customer
    if (customer?.email) {
      await ctx.scheduler.runAfter(0, internal.receipts.sendReceiptEmail, {
        receiptId,
      })
    }

    return receiptId
  },
})

// Internal: send receipt email using template
export const sendReceiptEmail = internalMutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId)
    if (!receipt || !receipt.customerEmail) return

    // Load template settings (fall back to defaults)
    const tmplRow = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "receiptTemplate"))
      .first()

    const tpl = {
      companyName: tmplRow?.companyName ?? DEFAULT_RECEIPT_TEMPLATE.companyName,
      companyAddress: tmplRow?.companyAddress ?? DEFAULT_RECEIPT_TEMPLATE.companyAddress,
      companyIco: tmplRow?.companyIco ?? DEFAULT_RECEIPT_TEMPLATE.companyIco,
      companyDic: tmplRow?.companyDic ?? DEFAULT_RECEIPT_TEMPLATE.companyDic,
      companyWeb: tmplRow?.companyWeb ?? DEFAULT_RECEIPT_TEMPLATE.companyWeb,
      companyPhone: tmplRow?.companyPhone ?? DEFAULT_RECEIPT_TEMPLATE.companyPhone,
      emailSubject: tmplRow?.emailSubject ?? DEFAULT_RECEIPT_TEMPLATE.emailSubject,
      emailHeaderNote: tmplRow?.emailHeaderNote ?? DEFAULT_RECEIPT_TEMPLATE.emailHeaderNote,
      emailFooterNote: tmplRow?.emailFooterNote ?? DEFAULT_RECEIPT_TEMPLATE.emailFooterNote,
      showDriverName: tmplRow?.showDriverName ?? DEFAULT_RECEIPT_TEMPLATE.showDriverName,
      showCargoDescription: tmplRow?.showCargoDescription ?? DEFAULT_RECEIPT_TEMPLATE.showCargoDescription,
    }

    const paymentLabels: Record<string, string> = {
      hotovost: "Hotovost",
      prevod: "Bankovní převod",
      faktura: "Na fakturu",
      karta: "Platební karta",
    }

    const issuedDate = new Date(receipt.issuedAt).toLocaleDateString("cs-CZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const subject = tpl.emailSubject
      .replace("{receiptNumber}", receipt.receiptNumber)
      .replace("{rideNumber}", receipt.rideNumber)

    const headerNote = tpl.emailHeaderNote
      .replace("{receiptNumber}", receipt.receiptNumber)
      .replace("{rideNumber}", receipt.rideNumber)

    const footerNote = tpl.emailFooterNote
      .replace("{receiptNumber}", receipt.receiptNumber)
      .replace("{rideNumber}", receipt.rideNumber)

    const dicLine = tpl.companyDic ? `DIČ: ${tpl.companyDic}\n` : ""
    const driverLine = (tpl.showDriverName && receipt.driverName) ? `Řidič:             ${receipt.driverName}\n` : ""
    const cargoLine = tpl.showCargoDescription ? `Obsah:        ${receipt.cargoDescription}\n` : ""

    const message = [
      `Dobrý den${receipt.customerName ? `, ${receipt.customerName}` : ""},`,
      "",
      headerNote,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "                    ÚČTENKA",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      "DODAVATEL:",
      tpl.companyName,
      `IČO: ${tpl.companyIco}`,
      ...(tpl.companyDic ? [`DIČ: ${tpl.companyDic}`] : []),
      tpl.companyAddress,
      tpl.companyWeb,
      `Tel.: ${tpl.companyPhone}`,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      `Číslo účtenky:     ${receipt.receiptNumber}`,
      `Číslo zakázky:     ${receipt.rideNumber}`,
      `Datum vydání:      ${issuedDate}`,
      ...(tpl.showDriverName && receipt.driverName ? [`Řidič:             ${receipt.driverName}`] : []),
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      "POPIS SLUŽBY:",
      "Kurýrní přeprava zásilky",
      "",
      `Vyzvednutí:   ${receipt.pickupAddress}`,
      `Doručení:     ${receipt.deliveryAddress}`,
      ...(tpl.showCargoDescription ? [`Obsah:        ${receipt.cargoDescription}`] : []),
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      `Celková částka:    ${receipt.amount > 0 ? `${receipt.amount.toLocaleString("cs-CZ")} ${receipt.currency}` : "Dle dohody"}`,
      `Způsob platby:     ${paymentLabels[receipt.paymentMethod] ?? receipt.paymentMethod}`,
      `Stav platby:       ${receipt.isPaid ? "✓ ZAPLACENO" : "⌛ ČEKÁ NA ÚHRADU"}`,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      "Účtenku a historii zásilek najdete ve svém zákaznickém portálu:",
      "https://www.kuryr4you.cz/zakaznik/uctenky",
      "",
      footerNote,
    ].join("\n")

    await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
      toEmail: receipt.customerEmail,
      subject,
      message,
    })

    console.log(`Receipt email sent to ${receipt.customerEmail} for receipt ${receipt.receiptNumber}`)
  },
})

// Customer: get my receipts
export const getMyReceipts = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("receipts"),
    _creationTime: v.number(),
    rideId: v.id("rides"),
    customerId: v.id("users"),
    receiptNumber: v.string(),
    issuedAt: v.number(),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.union(
      v.literal("hotovost"), v.literal("prevod"),
      v.literal("faktura"), v.literal("karta"),
    ),
    isPaid: v.boolean(),
    driverName: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    cargoDescription: v.string(),
    rideNumber: v.string(),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "customer") return []

    return await ctx.db
      .query("receipts")
      .withIndex("by_customer", (q) => q.eq("customerId", user._id))
      .order("desc")
      .take(100)
  },
})

// Dispatcher: get receipts for a specific customer
export const getReceiptsForCustomer = query({
  args: { customerId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("receipts"),
    _creationTime: v.number(),
    rideId: v.id("rides"),
    customerId: v.id("users"),
    receiptNumber: v.string(),
    issuedAt: v.number(),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.union(
      v.literal("hotovost"), v.literal("prevod"),
      v.literal("faktura"), v.literal("karta"),
    ),
    isPaid: v.boolean(),
    driverName: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    cargoDescription: v.string(),
    rideNumber: v.string(),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    return await ctx.db
      .query("receipts")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(100)
  },
})

// Dispatcher: update payment method on receipt
export const updateReceiptPayment = mutation({
  args: {
    receiptId: v.id("receipts"),
    paymentMethod: v.union(
      v.literal("hotovost"), v.literal("prevod"),
      v.literal("faktura"), v.literal("karta"),
    ),
    isPaid: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    await ctx.db.patch(args.receiptId, {
      paymentMethod: args.paymentMethod,
      isPaid: args.isPaid,
    })
    return null
  },
})

// Dispatcher: manually generate receipt for a delivered ride
export const manualGenerateReceipt = mutation({
  args: { rideId: v.id("rides") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    await ctx.scheduler.runAfter(0, internal.receipts.generateReceiptInternal, {
      rideId: args.rideId,
    })
    return null
  },
})
