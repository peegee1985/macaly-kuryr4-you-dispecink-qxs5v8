import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

// Default receipt template values
export const DEFAULT_RECEIPT_TEMPLATE = {
  companyName: "Gotty s.r.o.",
  companyAddress: "Podhajská pole 758/15, Praha 8 Bohnice, 181 00",
  companyIco: "21930431",
  companyDic: "",
  companyWeb: "www.kuryr4you.cz",
  companyPhone: "+420 724 297 804",
  emailSubject: "Účtenka {receiptNumber} – Kuryr4You",
  emailHeaderNote: "Vaše zásilka {rideNumber} byla úspěšně doručena. Zasíláme vám účtenku za kurýrní službu.",
  emailFooterNote: "Děkujeme za využití služeb Kuryr4You.\n\nS pozdravem,\nGotty s.r.o. – Kuryr4You",
  showDriverName: true,
  showCargoDescription: true,
}

// Get the receipt template (returns defaults if not set)
export const getReceiptTemplate = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return DEFAULT_RECEIPT_TEMPLATE
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return DEFAULT_RECEIPT_TEMPLATE

    const setting = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "receiptTemplate"))
      .first()

    if (!setting) return DEFAULT_RECEIPT_TEMPLATE

    return {
      companyName: setting.companyName ?? DEFAULT_RECEIPT_TEMPLATE.companyName,
      companyAddress: setting.companyAddress ?? DEFAULT_RECEIPT_TEMPLATE.companyAddress,
      companyIco: setting.companyIco ?? DEFAULT_RECEIPT_TEMPLATE.companyIco,
      companyDic: setting.companyDic ?? DEFAULT_RECEIPT_TEMPLATE.companyDic,
      companyWeb: setting.companyWeb ?? DEFAULT_RECEIPT_TEMPLATE.companyWeb,
      companyPhone: setting.companyPhone ?? DEFAULT_RECEIPT_TEMPLATE.companyPhone,
      emailSubject: setting.emailSubject ?? DEFAULT_RECEIPT_TEMPLATE.emailSubject,
      emailHeaderNote: setting.emailHeaderNote ?? DEFAULT_RECEIPT_TEMPLATE.emailHeaderNote,
      emailFooterNote: setting.emailFooterNote ?? DEFAULT_RECEIPT_TEMPLATE.emailFooterNote,
      showDriverName: setting.showDriverName ?? DEFAULT_RECEIPT_TEMPLATE.showDriverName,
      showCargoDescription: setting.showCargoDescription ?? DEFAULT_RECEIPT_TEMPLATE.showCargoDescription,
    }
  },
})

// Internal: get template without auth (for use in internal mutations)
export const getReceiptTemplateInternal = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "receiptTemplate"))
      .first()

    if (!setting) return DEFAULT_RECEIPT_TEMPLATE

    return {
      companyName: setting.companyName ?? DEFAULT_RECEIPT_TEMPLATE.companyName,
      companyAddress: setting.companyAddress ?? DEFAULT_RECEIPT_TEMPLATE.companyAddress,
      companyIco: setting.companyIco ?? DEFAULT_RECEIPT_TEMPLATE.companyIco,
      companyDic: setting.companyDic ?? DEFAULT_RECEIPT_TEMPLATE.companyDic,
      companyWeb: setting.companyWeb ?? DEFAULT_RECEIPT_TEMPLATE.companyWeb,
      companyPhone: setting.companyPhone ?? DEFAULT_RECEIPT_TEMPLATE.companyPhone,
      emailSubject: setting.emailSubject ?? DEFAULT_RECEIPT_TEMPLATE.emailSubject,
      emailHeaderNote: setting.emailHeaderNote ?? DEFAULT_RECEIPT_TEMPLATE.emailHeaderNote,
      emailFooterNote: setting.emailFooterNote ?? DEFAULT_RECEIPT_TEMPLATE.emailFooterNote,
      showDriverName: setting.showDriverName ?? DEFAULT_RECEIPT_TEMPLATE.showDriverName,
      showCargoDescription: setting.showCargoDescription ?? DEFAULT_RECEIPT_TEMPLATE.showCargoDescription,
    }
  },
})

// Dispatcher: save receipt template
export const saveReceiptTemplate = mutation({
  args: {
    companyName: v.string(),
    companyAddress: v.string(),
    companyIco: v.string(),
    companyDic: v.string(),
    companyWeb: v.string(),
    companyPhone: v.string(),
    emailSubject: v.string(),
    emailHeaderNote: v.string(),
    emailFooterNote: v.string(),
    showDriverName: v.boolean(),
    showCargoDescription: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "receiptTemplate"))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { ...args })
    } else {
      await ctx.db.insert("siteSettings", { key: "receiptTemplate", ...args })
    }

    console.log(`Receipt template saved by ${user.email}`)
    return null
  },
})

// ── Payslip template ──────────────────────────────────────────────────────

export const DEFAULT_PAYSLIP_TEMPLATE = {
  psCompanyName: "Gotty s.r.o.",
  psCompanyAddress: "Podhajská pole 758/15, Praha 8 Bohnice, 181 00",
  psCompanyIco: "21930431",
  psCompanyDic: "",
  psCompanyPhone: "+420 724 297 804",
  psCompanyEmail: "info@kuryr4you.cz",
  psLogoUrl: "",
  psAccentColor: "#2563eb",
  psHeaderNote: "",
  psFooterNote: "Výplatní páska byla vystavena elektronicky a je platná bez podpisu.",
  psShowHours: true,
  psShowSignatureLine: false,
}

export const getPayslipTemplate = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "payslipTemplate"))
      .first()

    if (!setting) return DEFAULT_PAYSLIP_TEMPLATE

    return {
      psCompanyName: setting.psCompanyName ?? DEFAULT_PAYSLIP_TEMPLATE.psCompanyName,
      psCompanyAddress: setting.psCompanyAddress ?? DEFAULT_PAYSLIP_TEMPLATE.psCompanyAddress,
      psCompanyIco: setting.psCompanyIco ?? DEFAULT_PAYSLIP_TEMPLATE.psCompanyIco,
      psCompanyDic: setting.psCompanyDic ?? DEFAULT_PAYSLIP_TEMPLATE.psCompanyDic,
      psCompanyPhone: setting.psCompanyPhone ?? DEFAULT_PAYSLIP_TEMPLATE.psCompanyPhone,
      psCompanyEmail: setting.psCompanyEmail ?? DEFAULT_PAYSLIP_TEMPLATE.psCompanyEmail,
      psLogoUrl: setting.psLogoUrl ?? DEFAULT_PAYSLIP_TEMPLATE.psLogoUrl,
      psAccentColor: setting.psAccentColor ?? DEFAULT_PAYSLIP_TEMPLATE.psAccentColor,
      psHeaderNote: setting.psHeaderNote ?? DEFAULT_PAYSLIP_TEMPLATE.psHeaderNote,
      psFooterNote: setting.psFooterNote ?? DEFAULT_PAYSLIP_TEMPLATE.psFooterNote,
      psShowHours: setting.psShowHours ?? DEFAULT_PAYSLIP_TEMPLATE.psShowHours,
      psShowSignatureLine: setting.psShowSignatureLine ?? DEFAULT_PAYSLIP_TEMPLATE.psShowSignatureLine,
    }
  },
})

export const savePayslipTemplate = mutation({
  args: {
    psCompanyName: v.string(),
    psCompanyAddress: v.string(),
    psCompanyIco: v.string(),
    psCompanyDic: v.string(),
    psCompanyPhone: v.string(),
    psCompanyEmail: v.string(),
    psLogoUrl: v.string(),
    psAccentColor: v.string(),
    psHeaderNote: v.string(),
    psFooterNote: v.string(),
    psShowHours: v.boolean(),
    psShowSignatureLine: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "payslipTemplate"))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { ...args })
    } else {
      await ctx.db.insert("siteSettings", { key: "payslipTemplate", ...args })
    }

    console.log(`Payslip template saved by ${user.email}`)
    return null
  },
})

// Dispatcher: toggle receipts for a customer
export const toggleCustomerReceipts = mutation({
  args: {
    customerId: v.id("users"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const customer = await ctx.db.get(args.customerId)
    if (!customer || customer.role !== "customer") throw new Error("Zákazník nenalezen")

    await ctx.db.patch(args.customerId, { receiptEnabled: args.enabled })
    console.log(`Receipt ${args.enabled ? "enabled" : "disabled"} for customer ${customer.email}`)
    return null
  },
})
