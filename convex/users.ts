import { v } from "convex/values"
import { mutation, query, internalMutation, action, internalQuery } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

// Single source of truth for user object shape in returns validators.
// Add new fields here when the schema grows — fixes all queries at once.
const userObjectValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  email: v.string(),
  name: v.optional(v.string()),
  phone: v.optional(v.string()),
  role: v.union(v.literal("dispatcher"), v.literal("driver"), v.literal("customer"), v.literal("vending_supervisor"), v.literal("service_driver")),
  status: v.union(v.literal("active"), v.literal("pending"), v.literal("inactive")),
  corporateStatus: v.union(v.literal("none"), v.literal("pending"), v.literal("approved")),
  companyName: v.optional(v.string()),
  companyAddress: v.optional(v.string()),
  companyIco: v.optional(v.string()),
  companyDic: v.optional(v.string()),
  paymentPreference: v.optional(v.union(v.literal("invoice"), v.literal("card"))),
  vehicleType: v.optional(v.string()),
  vehiclePlate: v.optional(v.string()),
  driverNotes: v.optional(v.string()),
  receiptEnabled: v.optional(v.boolean()),
  driverPushAssigned: v.optional(v.boolean()),
  driverPushAvailable: v.optional(v.boolean()),
  driverEmailAssigned: v.optional(v.boolean()),
  lastAvailableOrderPushAt: v.optional(v.number()),
  emailVerificationTime: v.optional(v.number()),
  phoneVerificationTime: v.optional(v.number()),
})

// Get current logged-in user profile
export const getMe = query({
  args: {},
  returns: v.union(userObjectValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    // Primary: look up by auth user ID (works when _id matches authId)
    const byId = await ctx.db.get(userId as Id<"users">).catch(() => null)
    if (byId) return byId as any
    // Fallback: look up by email from identity (covers Google OAuth & other providers)
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.email) return null
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first() ?? null
  },
})

// Get user by auth id (used internally after login)
export const getUserByAuthId = query({
  args: { authUserId: v.string() },
  returns: v.union(userObjectValidator, v.null()),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    // Users can only fetch their own profile; dispatchers can fetch any profile
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller) return null
    if (caller.role !== "dispatcher" && authId !== args.authUserId) return null
    return await ctx.db.get(args.authUserId as Id<"users">).catch(() => null) as any
  },
})

// Create user profile after registration
export const createUserProfile = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(v.literal("driver"), v.literal("customer")),
    vehicleType: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")

    // Check if profile already exists (created by Convex Auth during sign-up)
    const existing = await ctx.db.get(authId as Id<"users">).catch(() => null)
    const status = args.role === "driver" ? "pending" : "active"

    if (existing) {
      // Auth created a minimal user record – patch it with full profile data
      await ctx.db.patch(authId as Id<"users">, {
        email: args.email,
        name: args.name,
        phone: args.phone,
        role: args.role,
        status,
        corporateStatus: "none",
        vehicleType: args.vehicleType,
        vehiclePlate: args.vehiclePlate,
      })
      console.log(`Patched user profile: ${authId}, role: ${args.role}`)
      return authId as Id<"users">
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      phone: args.phone,
      role: args.role,
      status,
      corporateStatus: "none",
      vehicleType: args.vehicleType,
      vehiclePlate: args.vehiclePlate,
    })

    console.log(`Created user profile: ${userId}, role: ${args.role}`)
    return userId
  },
})

// Update own profile
export const updateMyProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    vehicleType: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyIco: v.optional(v.string()),
    companyDic: v.optional(v.string()),
    paymentPreference: v.optional(v.union(v.literal("invoice"), v.literal("card"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")

    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Profil nenalezen")

    const updates: any = {}
    if (args.name !== undefined) updates.name = args.name || undefined
    if (args.phone !== undefined) updates.phone = args.phone || undefined
    if (args.vehicleType !== undefined) updates.vehicleType = args.vehicleType || undefined
    if (args.vehiclePlate !== undefined) updates.vehiclePlate = args.vehiclePlate || undefined
    if (args.companyName !== undefined) updates.companyName = args.companyName || undefined
    if (args.companyAddress !== undefined) updates.companyAddress = args.companyAddress || undefined
    if (args.companyIco !== undefined) updates.companyIco = args.companyIco || undefined
    if (args.companyDic !== undefined) updates.companyDic = args.companyDic || undefined
    if (args.paymentPreference !== undefined) {
      // Only corporate customers may change payment preference
      if (user.corporateStatus !== "approved") throw new Error("Preference platby je dostupná pouze pro firemní účty")
      updates.paymentPreference = args.paymentPreference
    }

    await ctx.db.patch(user._id, updates)
    return null
  },
})

// Request corporate account
export const requestCorporateAccount = mutation({
  args: {
    companyName: v.string(),
    companyAddress: v.string(),
    companyIco: v.optional(v.string()),
    companyDic: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")

    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Profil nenalezen")
    if (user.role !== "customer") throw new Error("Pouze zákazníci mohou požádat o firemní účet")

    await ctx.db.patch(user._id, {
      corporateStatus: "pending",
      companyName: args.companyName,
      companyAddress: args.companyAddress,
      companyIco: args.companyIco,
      companyDic: args.companyDic,
    })
    return null
  },
})

// DISPATCHER: List all users by role
export const listUsersByRole = query({
  args: {
    role: v.union(v.literal("dispatcher"), v.literal("driver"), v.literal("customer"), v.literal("vending_supervisor"), v.literal("service_driver")),
  },
  returns: v.array(userObjectValidator),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") return []
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect()
  },
})

// DISPATCHER: Update user status
export const updateUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("inactive")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    await ctx.db.patch(args.userId, { status: args.status })

    // Notify user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.status === "active" ? "Účet schválen" : "Stav účtu změněn",
      message: args.status === "active"
        ? "Váš účet byl schválen. Nyní se můžete přihlásit a začít pracovat."
        : `Váš účet byl nastaven na stav: ${args.status}`,
      read: false,
      type: "approval",
    })
    return null
  },
})

// DISPATCHER: Approve corporate account
export const approveCorporateAccount = mutation({
  args: {
    userId: v.id("users"),
    approved: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    await ctx.db.patch(args.userId, {
      corporateStatus: args.approved ? "approved" : "none",
    })

    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.approved ? "Firemní účet schválen" : "Žádost o firemní účet zamítnuta",
      message: args.approved
        ? "Váš firemní účet byl schválen. Nyní máte přístup k fakturaci."
        : "Vaše žádost o firemní účet byla zamítnuta. Kontaktujte dispečink.",
      read: false,
      type: "approval",
    })
    return null
  },
})

// DISPATCHER: Create customer manually
export const createCustomer = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyIco: v.optional(v.string()),
    companyDic: v.optional(v.string()),
    corporateStatus: v.union(v.literal("none"), v.literal("approved")),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first()
    if (existing) throw new Error("Zákazník s tímto e-mailem již existuje")

    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      phone: args.phone,
      role: "customer",
      status: "active",
      corporateStatus: args.corporateStatus,
      companyName: args.companyName,
      companyAddress: args.companyAddress,
      companyIco: args.companyIco,
      companyDic: args.companyDic,
    })
  },
})

// DISPATCHER: Edit user
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    vehicleType: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
    driverNotes: v.optional(v.string()),
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyIco: v.optional(v.string()),
    companyDic: v.optional(v.string()),
    corporateStatus: v.optional(v.union(v.literal("none"), v.literal("pending"), v.literal("approved"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const updates: any = {}
    if (args.name !== undefined) updates.name = args.name
    if (args.phone !== undefined) updates.phone = args.phone
    if (args.vehicleType !== undefined) updates.vehicleType = args.vehicleType
    if (args.vehiclePlate !== undefined) updates.vehiclePlate = args.vehiclePlate
    if (args.driverNotes !== undefined) updates.driverNotes = args.driverNotes
    if (args.companyName !== undefined) updates.companyName = args.companyName
    if (args.companyAddress !== undefined) updates.companyAddress = args.companyAddress
    if (args.companyIco !== undefined) updates.companyIco = args.companyIco
    if (args.companyDic !== undefined) updates.companyDic = args.companyDic
    if (args.corporateStatus !== undefined) updates.corporateStatus = args.corporateStatus

    await ctx.db.patch(args.userId, updates)
    return null
  },
})

// DISPATCHER: Delete user
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    await ctx.db.delete(args.userId)
    return null
  },
})

// DISPATCHER: Bulk update status
export const bulkUpdateStatus = mutation({
  args: {
    userIds: v.array(v.id("users")),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    for (const userId of args.userIds) {
      await ctx.db.patch(userId, { status: args.status })
    }
    return null
  },
})

// DISPATCHER: Bulk delete users
export const bulkDeleteUsers = mutation({
  args: { userIds: v.array(v.id("users")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    for (const userId of args.userIds) {
      await ctx.db.delete(userId)
    }
    return null
  },
})

// DISPATCHER: Bulk approve corporate
export const bulkApproveCorporate = mutation({
  args: { userIds: v.array(v.id("users")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    for (const userId of args.userIds) {
      await ctx.db.patch(userId, { corporateStatus: "approved" })
    }
    return null
  },
})

// List active drivers (for assignment)
export const listActiveDrivers = query({
  args: {},
  returns: v.array(userObjectValidator),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") return []
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "driver"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect()
  },
})

// List active customers (for dispatcher order creation)
export const listCustomers = query({
  args: {},
  returns: v.array(userObjectValidator),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const me = await ctx.db.get(authId as Id<"users">)
    if (!me || me.role !== "dispatcher") return []
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "customer"))
      .collect()
  },
})

// Internal: ensure user profile exists after auth
export const ensureUserProfile = internalMutation({
  args: {
    authId: v.string(),
    email: v.string(),
    role: v.union(v.literal("dispatcher"), v.literal("driver"), v.literal("customer"), v.literal("vending_supervisor"), v.literal("service_driver")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.authId as Id<"users">)
    if (existing) return null

    await ctx.db.insert("users", {
      email: args.email,
      role: args.role,
      status: "active",
      corporateStatus: "none",
    })
    return null
  },
})

// Activate dispatcher role using secret code
// Only works if the logged-in user is not yet a dispatcher
export const activateDispatcher = mutation({
  args: { secretCode: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ADMIN_SECRET = process.env.ADMIN_SECRET_CODE
    if (!ADMIN_SECRET) throw new Error("Aktivace dispečera není nakonfigurována")
    if (args.secretCode !== ADMIN_SECRET) throw new Error("Nesprávný kód")
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user) throw new Error("Profil nenalezen")
    if (user.role === "dispatcher") throw new Error("Účet je již nastaven jako dispečer")
    await ctx.db.patch(authId as Id<"users">, { role: "dispatcher", status: "active" })
    console.log(`User ${user.email} promoted to dispatcher`)
    return null
  },
})

// Internal: get user by ID (used by actions for auth checks)
export const getInternalUser = internalQuery({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId as Id<"users">).catch(() => null)
  },
})

// Internal: get user by email (used by actions to check duplicates)
export const getInternalUserByEmail = internalQuery({
  args: { email: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first()
  },
})

// Internal: Mark an auth account's email as verified (used after admin-created accounts)
export const markEmailVerified = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the authAccount for this email (password provider)
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email)
      )
      .unique()
    if (!account) {
      console.log(`[markEmailVerified] No auth account found for ${args.email}`)
      return null
    }
    // Mark email as verified on the auth account
    await ctx.db.patch(account._id, { emailVerified: args.email } as any)
    // Mark email verification time on the user
    await ctx.db.patch(account.userId as Id<"users">, {
      emailVerificationTime: Date.now(),
    })
    console.log(`[markEmailVerified] Email verified for ${args.email}`)
    return null
  },
})

// DISPATCHER: Create driver account manually (auto-approved, active)
export const adminCreateDriver = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    phone: v.optional(v.string()),
    vehicleType: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
    driverNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify caller is dispatcher
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.runQuery(internal.users.getInternalUser, { userId: authId as string })
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    // Check email not already taken
    const existing = await ctx.runQuery(internal.users.getInternalUserByEmail, { email: args.email })
    if (existing) throw new Error("Řidič s tímto e-mailem již existuje")

    // Validate password length
    if (args.password.length < 8) throw new Error("Heslo musí mít alespoň 8 znaků")

    // Create auth account - password is hashed automatically by convex auth
    await ctx.runMutation(internal.auth.store, {
      args: {
        type: "createAccountFromCredentials",
        provider: "password",
        account: { id: args.email, secret: args.password },
        profile: {
          email: args.email,
          name: args.name || undefined,
          phone: args.phone || undefined,
          vehicleType: args.vehicleType || undefined,
          vehiclePlate: args.vehiclePlate || undefined,
          driverNotes: args.driverNotes || undefined,
          role: "driver",
          status: "active",
          corporateStatus: "none",
        },
      },
    })

    // Mark the email as verified so the driver can sign in without OTP
    await ctx.runMutation(internal.users.markEmailVerified, { email: args.email })
    console.log(`Dispatcher ${me.email} created driver account: ${args.email}`)
    return null
  },
})

export const adminResetPassword = action({
  args: { userId: v.id("users"), newPassword: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const me = await ctx.runQuery(internal.users.getInternalUser, { userId: authId as string })
    if (!me || me.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    if (args.newPassword.length < 8) throw new Error("Heslo musí mít alespoň 8 znaků")

    const target = await ctx.runQuery(internal.users.getInternalUser, { userId: args.userId as string })
    if (!target) throw new Error("Uživatel nenalezen")

    await ctx.runMutation(internal.auth.store, {
      args: {
        type: "modifyAccount",
        provider: "password",
        account: {
          id: target.email,
          secret: args.newPassword,
        },
      },
    })

    console.log(`[users] adminResetPassword: dispatcher ${me.email} reset password for ${target.email}`)
    return null
  },
})

// Update driver notification preferences
export const updateNotifPrefs = mutation({
  args: {
    driverPushAssigned: v.optional(v.boolean()),
    driverPushAvailable: v.optional(v.boolean()),
    driverEmailAssigned: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") throw new Error("Pouze řidiči mohou nastavit tyto preference")
    const updates: any = {}
    if (args.driverPushAssigned !== undefined) updates.driverPushAssigned = args.driverPushAssigned
    if (args.driverPushAvailable !== undefined) updates.driverPushAvailable = args.driverPushAvailable
    if (args.driverEmailAssigned !== undefined) updates.driverEmailAssigned = args.driverEmailAssigned
    await ctx.db.patch(user._id, updates)
    return null
  },
})

// Internal: get all active drivers for push broadcast
export const getActiveDriversForBroadcast = internalQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    driverPushAvailable: v.optional(v.boolean()),
    lastAvailableOrderPushAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const drivers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "driver"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect()
    return drivers.map((d) => ({
      _id: d._id,
      driverPushAvailable: d.driverPushAvailable,
      lastAvailableOrderPushAt: d.lastAvailableOrderPushAt,
    }))
  },
})

// Internal: update cooldown timestamp for available-order push
export const setLastAvailablePush = internalMutation({
  args: { driverId: v.id("users"), timestamp: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.driverId, { lastAvailableOrderPushAt: args.timestamp })
    return null
  },
})
