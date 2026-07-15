import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

// ── Queries ────────────────────────────────────────────────────────────────

export const listEmployees = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    const employees = await ctx.db.query("employees").collect()
    employees.sort((a, b) => a.lastName.localeCompare(b.lastName, "cs"))

    const today = new Date().toISOString().slice(0, 10)

    const results = await Promise.all(
      employees.map(async (emp) => {
        const todayShifts = await ctx.db
          .query("shifts")
          .withIndex("by_employee_date", (q) =>
            q.eq("employeeId", emp._id).eq("date", today)
          )
          .collect()
        const isOnShiftToday = todayShifts.some(
          (s) => s.clockIn != null && s.clockOut == null
        )
        return { ...emp, isOnShiftToday }
      })
    )

    return results
  },
})

export const getEmployee = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return null

    return await ctx.db.get(args.employeeId)
  },
})

export const getEmployeeShifts = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .order("desc")
      .take(100)

    return shifts
  },
})

export const getEmployeeLeaveRequests = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    const requests = await ctx.db
      .query("leaveRequests")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .take(100)

    return requests
  },
})

export const getPayslipSettings = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return null

    return await ctx.db
      .query("payslipSettings")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .first()
  },
})

export const getHrStats = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return { totalEmployees: 0, onShiftToday: 0 }
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher")
      return { totalEmployees: 0, onShiftToday: 0 }

    const employees = await ctx.db
      .query("employees")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()

    const today = new Date().toISOString().slice(0, 10)
    const todayShifts = await ctx.db
      .query("shifts")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect()

    const onShiftToday = todayShifts.filter(
      (s) => s.clockIn != null && s.clockOut == null
    ).length

    return { totalEmployees: employees.length, onShiftToday }
  },
})

// ── Mutations ──────────────────────────────────────────────────────────────

export const createEmployee = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    position: v.optional(v.string()),
    department: v.optional(v.string()),
    contractType: v.union(
      v.literal("hpp"),
      v.literal("dpp"),
      v.literal("dpc"),
      v.literal("osvc")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("trial")
    ),
    salaryType: v.union(
      v.literal("hourly"),
      v.literal("monthly"),
      v.literal("per_delivery")
    ),
    salaryAmount: v.optional(v.number()),
    hireDate: v.optional(v.number()),
    birthDate: v.optional(v.number()),
    address: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    personalId: v.optional(v.string()),
    notes: v.optional(v.string()),
    linkedUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher")
      throw new Error("Nemáte oprávnění")

    return await ctx.db.insert("employees", {
      ...args,
      documentIds: [],
    })
  },
})

export const updateEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    position: v.optional(v.string()),
    department: v.optional(v.string()),
    contractType: v.optional(
      v.union(
        v.literal("hpp"),
        v.literal("dpp"),
        v.literal("dpc"),
        v.literal("osvc")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("trial")
      )
    ),
    salaryType: v.optional(
      v.union(
        v.literal("hourly"),
        v.literal("monthly"),
        v.literal("per_delivery")
      )
    ),
    salaryAmount: v.optional(v.number()),
    hireDate: v.optional(v.number()),
    birthDate: v.optional(v.number()),
    address: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    personalId: v.optional(v.string()),
    notes: v.optional(v.string()),
    linkedUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher")
      throw new Error("Nemáte oprávnění")

    const { employeeId, ...fields } = args
    const patch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(employeeId, patch)
    }
    return null
  },
})

export const deleteEmployee = mutation({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher")
      throw new Error("Nemáte oprávnění")

    // Delete related shifts
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect()
    await Promise.all(shifts.map((s) => ctx.db.delete(s._id)))

    // Delete related leave requests
    const leaves = await ctx.db
      .query("leaveRequests")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect()
    await Promise.all(leaves.map((l) => ctx.db.delete(l._id)))

    // Delete payslip settings
    const settings = await ctx.db
      .query("payslipSettings")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect()
    await Promise.all(settings.map((s) => ctx.db.delete(s._id)))

    // Delete payslips
    const payslips = await ctx.db
      .query("payslips")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect()
    await Promise.all(payslips.map((p) => ctx.db.delete(p._id)))

    // Delete the employee
    await ctx.db.delete(args.employeeId)
    return null
  },
})

export const clockIn = mutation({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher")
      throw new Error("Nemáte oprávnění")

    const today = new Date().toISOString().slice(0, 10)

    return await ctx.db.insert("shifts", {
      employeeId: args.employeeId,
      date: today,
      clockIn: Date.now(),
      type: "regular",
    })
  },
})

export const clockOut = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher")
      throw new Error("Nemáte oprávnění")

    const shift = await ctx.db.get(args.shiftId)
    if (!shift) throw new Error("Směna nenalezena")
    if (shift.clockOut) throw new Error("Směna již ukončena")

    const clockOut = Date.now()
    const hoursWorked = shift.clockIn
      ? (clockOut - shift.clockIn) / 3600000
      : 0

    await ctx.db.patch(args.shiftId, {
      clockOut,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
    })
    return null
  },
})

export const createLeaveRequest = mutation({
  args: {
    employeeId: v.id("employees"),
    type: v.union(
      v.literal("vacation"),
      v.literal("sick"),
      v.literal("unpaid"),
      v.literal("other")
    ),
    startDate: v.string(),
    endDate: v.string(),
    days: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher")
      throw new Error("Nemáte oprávnění")

    return await ctx.db.insert("leaveRequests", {
      employeeId: args.employeeId,
      type: args.type,
      startDate: args.startDate,
      endDate: args.endDate,
      days: args.days,
      status: "pending",
      notes: args.notes,
    })
  },
})

export const updateLeaveStatus = mutation({
  args: {
    leaveId: v.id("leaveRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher")
      throw new Error("Nemáte oprávnění")

    await ctx.db.patch(args.leaveId, {
      status: args.status,
      approvedBy: caller._id,
      approvedAt: Date.now(),
    })
    return null
  },
})

// ── Payslips ───────────────────────────────────────────────────────────────

export const listPayslips = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    return await ctx.db
      .query("payslips")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .order("desc")
      .take(100)
  },
})

export const getMyEmployee = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    return await ctx.db
      .query("employees")
      .withIndex("by_linked_user", (q) => q.eq("linkedUserId", authId as Id<"users">))
      .first()
  },
})

export const getMyPayslips = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "driver") return []

    const employee = await ctx.db
      .query("employees")
      .withIndex("by_linked_user", (q) => q.eq("linkedUserId", authId as Id<"users">))
      .first()
    if (!employee) return []

    return await ctx.db
      .query("payslips")
      .withIndex("by_employee", (q) => q.eq("employeeId", employee._id))
      .order("desc")
      .take(50)
  },
})

export const createPayslip = mutation({
  args: {
    employeeId: v.id("employees"),
    periodMonth: v.number(),
    periodYear: v.number(),
    hoursWorked: v.optional(v.number()),
    grossSalary: v.number(),
    socialInsurance: v.number(),
    healthInsurance: v.number(),
    taxBase: v.optional(v.number()),
    taxCredit: v.optional(v.number()),
    taxBonus: v.optional(v.number()),
    taxAdvance: v.number(),
    employerSocialIns: v.optional(v.number()),
    employerHealthIns: v.optional(v.number()),
    otherDeductions: v.optional(v.number()),
    otherDeductionsNote: v.optional(v.string()),
    bonuses: v.optional(v.number()),
    netSalary: v.number(),
    vacationDaysTotal: v.optional(v.number()),
    vacationDaysTaken: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    return await ctx.db.insert("payslips", {
      ...args,
      status: "draft",
      createdBy: caller._id,
    })
  },
})

export const updatePayslip = mutation({
  args: {
    payslipId: v.id("payslips"),
    periodMonth: v.optional(v.number()),
    periodYear: v.optional(v.number()),
    hoursWorked: v.optional(v.number()),
    grossSalary: v.optional(v.number()),
    socialInsurance: v.optional(v.number()),
    healthInsurance: v.optional(v.number()),
    taxBase: v.optional(v.number()),
    taxCredit: v.optional(v.number()),
    taxBonus: v.optional(v.number()),
    taxAdvance: v.optional(v.number()),
    employerSocialIns: v.optional(v.number()),
    employerHealthIns: v.optional(v.number()),
    otherDeductions: v.optional(v.number()),
    otherDeductionsNote: v.optional(v.string()),
    bonuses: v.optional(v.number()),
    netSalary: v.optional(v.number()),
    vacationDaysTotal: v.optional(v.number()),
    vacationDaysTaken: v.optional(v.number()),
    notes: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("finalized"), v.literal("sent"))),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const { payslipId, ...fields } = args
    const patch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(payslipId, patch)
    }
    return null
  },
})

export const deletePayslip = mutation({
  args: { payslipId: v.id("payslips") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const payslip = await ctx.db.get(args.payslipId)
    if (!payslip) throw new Error("Výplatní páska nenalezena")
    if (payslip.status === "finalized" || payslip.status === "sent") {
      throw new Error("Finalizovanou nebo odeslanou výplatní pásku nelze smazat")
    }
    await ctx.db.delete(args.payslipId)
    return null
  },
})

export const copyPayslip = mutation({
  args: { payslipId: v.id("payslips") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const src = await ctx.db.get(args.payslipId)
    if (!src) throw new Error("Výplatní páska nenalezena")

    // Advance period by 1 month
    let newMonth = src.periodMonth + 1
    let newYear = src.periodYear
    if (newMonth > 12) { newMonth = 1; newYear++ }

    return await ctx.db.insert("payslips", {
      employeeId: src.employeeId,
      periodMonth: newMonth,
      periodYear: newYear,
      hoursWorked: src.hoursWorked,
      grossSalary: src.grossSalary,
      socialInsurance: src.socialInsurance,
      healthInsurance: src.healthInsurance,
      taxBase: src.taxBase,
      taxCredit: src.taxCredit,
      taxBonus: src.taxBonus,
      taxAdvance: src.taxAdvance,
      employerSocialIns: src.employerSocialIns,
      employerHealthIns: src.employerHealthIns,
      otherDeductions: src.otherDeductions,
      otherDeductionsNote: src.otherDeductionsNote,
      bonuses: src.bonuses,
      netSalary: src.netSalary,
      vacationDaysTotal: src.vacationDaysTotal,
      vacationDaysTaken: src.vacationDaysTaken,
      notes: src.notes,
      status: "draft",
      createdBy: caller._id,
    })
  },
})

export const bulkPayslipAction = mutation({
  args: {
    payslipIds: v.array(v.id("payslips")),
    action: v.union(v.literal("delete"), v.literal("finalize"), v.literal("mark_sent"), v.literal("mark_draft")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    let processed = 0
    for (const id of args.payslipIds) {
      const p = await ctx.db.get(id)
      if (!p) continue
      if (args.action === "delete") {
        if (p.status === "draft") { await ctx.db.delete(id); processed++ }
      } else if (args.action === "finalize") {
        if (p.status === "draft") { await ctx.db.patch(id, { status: "finalized" }); processed++ }
      } else if (args.action === "mark_sent") {
        if (p.status === "finalized") { await ctx.db.patch(id, { status: "sent" }); processed++ }
      } else if (args.action === "mark_draft") {
        if (p.status !== "draft") { await ctx.db.patch(id, { status: "draft" }); processed++ }
      }
    }
    return processed
  },
})

export const importPayslips = mutation({
  args: {
    employeeId: v.id("employees"),
    rows: v.array(v.object({
      periodMonth: v.number(),
      periodYear: v.number(),
      hoursWorked: v.optional(v.number()),
      grossSalary: v.number(),
      socialInsurance: v.number(),
      healthInsurance: v.number(),
      taxAdvance: v.number(),
      otherDeductions: v.optional(v.number()),
      otherDeductionsNote: v.optional(v.string()),
      bonuses: v.optional(v.number()),
      netSalary: v.number(),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    let count = 0
    for (const row of args.rows) {
      await ctx.db.insert("payslips", {
        ...row,
        employeeId: args.employeeId,
        status: "draft",
        createdBy: caller._id,
      })
      count++
    }
    return count
  },
})

// ── Driver linking ─────────────────────────────────────────────────────────

export const listDriversForLinking = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    const drivers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "driver"))
      .collect()

    const employees = await ctx.db.query("employees").collect()
    const linkedIds = new Set(
      employees.filter((e) => e.linkedUserId != null).map((e) => e.linkedUserId as string)
    )

    return drivers.filter((d) => !linkedIds.has(d._id))
  },
})

export const importDriverAsEmployee = mutation({
  args: {
    userId: v.id("users"),
    contractType: v.union(v.literal("hpp"), v.literal("dpp"), v.literal("dpc"), v.literal("osvc")),
    salaryType: v.union(v.literal("hourly"), v.literal("monthly"), v.literal("per_delivery")),
    salaryAmount: v.optional(v.number()),
    position: v.optional(v.string()),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const user = await ctx.db.get(args.userId)
    if (!user) throw new Error("Uživatel nenalezen")
    if (user.role !== "driver") throw new Error("Uživatel není řidič")

    const existing = await ctx.db
      .query("employees")
      .withIndex("by_linked_user", (q) => q.eq("linkedUserId", args.userId))
      .first()
    if (existing) throw new Error("Řidič je již přidán jako zaměstnanec")

    const nameParts = (user.name ?? "").trim().split(" ")
    const firstName = nameParts[0] ?? ""
    const lastName = nameParts.slice(1).join(" ") || nameParts[0] || ""

    return await ctx.db.insert("employees", {
      linkedUserId: args.userId,
      firstName,
      lastName,
      email: user.email ?? "",
      phone: user.phone,
      position: args.position,
      department: args.department,
      contractType: args.contractType,
      status: "active",
      salaryType: args.salaryType,
      salaryAmount: args.salaryAmount,
      documentIds: [],
    })
  },
})

export const linkEmployeeToUser = mutation({
  args: {
    employeeId: v.id("employees"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    if (args.userId) {
      const existing = await ctx.db
        .query("employees")
        .withIndex("by_linked_user", (q) => q.eq("linkedUserId", args.userId))
        .first()
      if (existing && existing._id !== args.employeeId) {
        throw new Error("Uživatel je již přiřazen k jinému záznamu")
      }
    }
    await ctx.db.patch(args.employeeId, { linkedUserId: args.userId ?? undefined })
    return null
  },
})

export const exportEmployees = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    return await ctx.db.query("employees").collect()
  },
})

// ── Manual Shift Management ────────────────────────────────────────────────

// Helper: "HH:MM" + "YYYY-MM-DD" → Unix timestamp
function timeStringToTimestamp(date: string, time: string): number {
  const [h, m] = time.split(":").map(Number)
  const d = new Date(`${date}T00:00:00`)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

// Helper: compute hoursWorked from two HH:MM strings
function calcHoursFromTimes(start: string, end: string): number | undefined {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const diffMin = (eh * 60 + em) - (sh * 60 + sm)
  if (diffMin <= 0) return undefined
  return Math.round((diffMin / 60) * 100) / 100
}

export const createShift = mutation({
  args: {
    employeeId: v.id("employees"),
    date: v.string(),
    clockInTime: v.optional(v.string()),   // "HH:MM"
    clockOutTime: v.optional(v.string()),  // "HH:MM"
    plannedStart: v.optional(v.string()),  // "HH:MM"
    plannedEnd: v.optional(v.string()),    // "HH:MM"
    type: v.union(v.literal("regular"), v.literal("overtime"), v.literal("night"), v.literal("holiday")),
    hoursWorked: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const clockIn = args.clockInTime ? timeStringToTimestamp(args.date, args.clockInTime) : undefined
    const clockOut = args.clockOutTime ? timeStringToTimestamp(args.date, args.clockOutTime) : undefined

    let hoursWorked = args.hoursWorked
    if (hoursWorked == null && args.clockInTime && args.clockOutTime) {
      hoursWorked = calcHoursFromTimes(args.clockInTime, args.clockOutTime)
    }
    if (hoursWorked == null && args.plannedStart && args.plannedEnd) {
      hoursWorked = calcHoursFromTimes(args.plannedStart, args.plannedEnd)
    }

    return await ctx.db.insert("shifts", {
      employeeId: args.employeeId,
      date: args.date,
      clockIn,
      clockOut,
      plannedStart: args.plannedStart,
      plannedEnd: args.plannedEnd,
      type: args.type,
      hoursWorked,
      notes: args.notes,
    })
  },
})

export const updateShift = mutation({
  args: {
    shiftId: v.id("shifts"),
    date: v.optional(v.string()),
    clockInTime: v.optional(v.string()),   // "HH:MM" or "" to clear
    clockOutTime: v.optional(v.string()),  // "HH:MM" or "" to clear
    plannedStart: v.optional(v.string()),
    plannedEnd: v.optional(v.string()),
    type: v.optional(v.union(v.literal("regular"), v.literal("overtime"), v.literal("night"), v.literal("holiday"))),
    hoursWorked: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const shift = await ctx.db.get(args.shiftId)
    if (!shift) throw new Error("Směna nenalezena")

    const date = args.date ?? shift.date
    const patch: Record<string, unknown> = {}

    if (args.date !== undefined) patch.date = args.date
    if (args.type !== undefined) patch.type = args.type
    if (args.notes !== undefined) patch.notes = args.notes || undefined
    if (args.plannedStart !== undefined) patch.plannedStart = args.plannedStart || undefined
    if (args.plannedEnd !== undefined) patch.plannedEnd = args.plannedEnd || undefined

    if (args.clockInTime !== undefined) {
      patch.clockIn = args.clockInTime ? timeStringToTimestamp(date, args.clockInTime) : undefined
    }
    if (args.clockOutTime !== undefined) {
      patch.clockOut = args.clockOutTime ? timeStringToTimestamp(date, args.clockOutTime) : undefined
    }

    // Recompute hoursWorked if times changed and not manually overridden
    if (args.hoursWorked !== undefined) {
      patch.hoursWorked = args.hoursWorked > 0 ? args.hoursWorked : undefined
    } else {
      const inTime = args.clockInTime !== undefined
        ? (args.clockInTime || undefined)
        : (shift.clockIn ? new Date(shift.clockIn).toTimeString().slice(0, 5) : undefined)
      const outTime = args.clockOutTime !== undefined
        ? (args.clockOutTime || undefined)
        : (shift.clockOut ? new Date(shift.clockOut).toTimeString().slice(0, 5) : undefined)
      if (inTime && outTime) {
        patch.hoursWorked = calcHoursFromTimes(inTime, outTime)
      }
    }

    await ctx.db.patch(args.shiftId, patch)
    return null
  },
})

export const deleteShift = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    await ctx.db.delete(args.shiftId)
    return null
  },
})

export const copyShiftToDays = mutation({
  args: {
    employeeId: v.id("employees"),
    plannedStart: v.optional(v.string()),
    plannedEnd: v.optional(v.string()),
    clockInTime: v.optional(v.string()),
    clockOutTime: v.optional(v.string()),
    type: v.union(v.literal("regular"), v.literal("overtime"), v.literal("night"), v.literal("holiday")),
    notes: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    weekdays: v.optional(v.array(v.number())), // 0=Sun … 6=Sat; empty=all days
    skipExisting: v.boolean(),
  },
  returns: v.object({ created: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    // Iterate all days in range
    const start = new Date(args.startDate)
    const end = new Date(args.endDate)
    let created = 0
    let skipped = 0

    const weekdaySet = args.weekdays && args.weekdays.length > 0 ? new Set(args.weekdays) : null

    for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
      const dayOfWeek = cur.getDay()
      if (weekdaySet && !weekdaySet.has(dayOfWeek)) continue

      const dateStr = cur.toISOString().slice(0, 10)

      if (args.skipExisting) {
        const existing = await ctx.db
          .query("shifts")
          .withIndex("by_employee_date", (q) =>
            q.eq("employeeId", args.employeeId).eq("date", dateStr)
          )
          .first()
        if (existing) { skipped++; continue }
      }

      const clockIn = args.clockInTime ? timeStringToTimestamp(dateStr, args.clockInTime) : undefined
      const clockOut = args.clockOutTime ? timeStringToTimestamp(dateStr, args.clockOutTime) : undefined

      let hoursWorked: number | undefined
      if (args.clockInTime && args.clockOutTime) {
        hoursWorked = calcHoursFromTimes(args.clockInTime, args.clockOutTime)
      } else if (args.plannedStart && args.plannedEnd) {
        hoursWorked = calcHoursFromTimes(args.plannedStart, args.plannedEnd)
      }

      await ctx.db.insert("shifts", {
        employeeId: args.employeeId,
        date: dateStr,
        clockIn,
        clockOut,
        plannedStart: args.plannedStart,
        plannedEnd: args.plannedEnd,
        type: args.type,
        hoursWorked,
        notes: args.notes,
      })
      created++
    }

    return { created, skipped }
  },
})

// ── Import Availability as Shifts ──────────────────────────────────────────

export const importAvailabilityAsShifts = mutation({
  args: {
    employeeId: v.id("employees"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD
  },
  returns: v.object({ created: v.number(), skipped: v.number(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const employee = await ctx.db.get(args.employeeId)
    if (!employee) throw new Error("Zaměstnanec nenalezen")
    if (!employee.linkedUserId) {
      return { created: 0, skipped: 0, error: "Zaměstnanec nemá propojeného řidiče" }
    }

    // Fetch availability for this driver in the date range (available=true only)
    const availabilities = await ctx.db
      .query("driverAvailability")
      .withIndex("by_driver", (q) => q.eq("driverId", employee.linkedUserId!))
      .filter((q) => q.and(
        q.gte(q.field("date"), args.startDate),
        q.lte(q.field("date"), args.endDate),
        q.eq(q.field("available"), true),
      ))
      .collect()

    let created = 0
    let skipped = 0

    for (const avail of availabilities) {
      // Check if shift already exists for this date
      const existing = await ctx.db
        .query("shifts")
        .withIndex("by_employee_date", (q) =>
          q.eq("employeeId", args.employeeId).eq("date", avail.date)
        )
        .first()

      if (existing) {
        skipped++
        continue
      }

      // Calculate hoursWorked from planned times if both are present
      let hoursWorked: number | undefined
      if (avail.startTime && avail.endTime) {
        const [sh, sm] = avail.startTime.split(":").map(Number)
        const [eh, em] = avail.endTime.split(":").map(Number)
        const diffMin = (eh * 60 + em) - (sh * 60 + sm)
        if (diffMin > 0) hoursWorked = Math.round((diffMin / 60) * 100) / 100
      }

      await ctx.db.insert("shifts", {
        employeeId: args.employeeId,
        date: avail.date,
        plannedStart: avail.startTime,
        plannedEnd: avail.endTime,
        hoursWorked,
        type: "regular",
        notes: avail.notes,
      })
      created++
    }

    return { created, skipped }
  },
})

// ── Payslip Settings ───────────────────────────────────────────────────────

export const upsertPayslipSettings = mutation({
  args: {
    employeeId: v.id("employees"),
    hourlyRate: v.optional(v.number()),
    monthlyRate: v.optional(v.number()),
    bonusAmount: v.optional(v.number()),
    overtimeMultiplier: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher")
      throw new Error("Nemáte oprávnění")

    const existing = await ctx.db
      .query("payslipSettings")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .first()

    const { employeeId, ...fields } = args

    if (existing) {
      await ctx.db.patch(existing._id, fields)
    } else {
      await ctx.db.insert("payslipSettings", {
        employeeId,
        ...fields,
      })
    }
    return null
  },
})
