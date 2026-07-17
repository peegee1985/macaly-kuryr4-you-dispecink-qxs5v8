import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("dispatcher"),
      v.literal("driver"),
      v.literal("customer"),
      v.literal("vending_supervisor"),
      v.literal("service_driver"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("inactive"),
    ),
    // Corporate customer fields
    corporateStatus: v.union(
      v.literal("none"),
      v.literal("pending"),
      v.literal("approved"),
    ),
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyIco: v.optional(v.string()),
    companyDic: v.optional(v.string()),
    // Driver fields
    vehicleType: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
    driverNotes: v.optional(v.string()),
    // Receipts: admin can enable/disable per customer (null = use default)
    receiptEnabled: v.optional(v.boolean()),
    // Driver notification preferences (undefined = default true)
    driverPushAssigned: v.optional(v.boolean()),
    driverPushAvailable: v.optional(v.boolean()),
    driverEmailAssigned: v.optional(v.boolean()),
    lastAvailableOrderPushAt: v.optional(v.number()),
    // Convex Auth internal fields (set during email/phone verification)
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("by_role", ["role"])
    .index("by_status", ["status"]),

  rides: defineTable({
    customerId: v.id("users"),
    driverId: v.optional(v.id("users")),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("assigned"),
      v.literal("pickup"),
      v.literal("transit"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("failed"),
    ),
    pickupAddress: v.string(),
    pickupLat: v.optional(v.number()),
    pickupLng: v.optional(v.number()),
    pickupContactName: v.string(),
    pickupContactPhone: v.string(),
    requestedPickupAt: v.number(),
    deliveryAddress: v.string(),
    deliveryLat: v.optional(v.number()),
    deliveryLng: v.optional(v.number()),
    deliveryContactName: v.string(),
    deliveryContactPhone: v.string(),
    requestedDeliveryAt: v.number(),
    estimatedDeliveryAt: v.optional(v.number()),
    cargoType: v.union(
      v.literal("envelope"),
      v.literal("parcel"),
      v.literal("box"),
      v.literal("pallet"),
      v.literal("other"),
    ),
    cargoDescription: v.string(),
    weight: v.optional(v.number()),
    quantity: v.number(),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
    attachmentIds: v.array(v.id("_storage")),
    trackingToken: v.string(),
    podPhotoIds: v.array(v.id("_storage")),
    podSignatureId: v.optional(v.id("_storage")),
    podDeliveredAt: v.optional(v.number()),
    podRecipientName: v.optional(v.string()),
    invoiceId: v.optional(v.id("invoices")),
    isPaid: v.boolean(),
    stripeSessionId: v.optional(v.string()),
    stripePaymentUrl: v.optional(v.string()),
    rideNumber: v.string(),
    dispatcherNotes: v.optional(v.string()),
    // Multi-stop support
    isMultiStop: v.optional(v.boolean()),
    stops: v.optional(
      v.array(
        v.object({
          address: v.string(),
          lat: v.optional(v.number()),
          lng: v.optional(v.number()),
          contactName: v.string(),
          contactPhone: v.string(),
          notes: v.optional(v.string()),
          order: v.number(),
        }),
      ),
    ),
    // Template / copy tracking
    originalRideId: v.optional(v.id("rides")),
    // COD (Cash on Delivery / Dobírka)
    codEnabled: v.optional(v.boolean()),
    codAmount: v.optional(v.number()),
    codCollected: v.optional(v.boolean()),
    // Package parameters
    dimensionLength: v.optional(v.number()),
    dimensionWidth: v.optional(v.number()),
    dimensionHeight: v.optional(v.number()),
    isFragile: v.optional(v.boolean()),
    isRefrigerated: v.optional(v.boolean()),
    // Failed delivery
    failedReason: v.optional(v.string()),
    failedPhotoIds: v.optional(v.array(v.id("_storage"))),
    failedAt: v.optional(v.number()),
    rescheduledTo: v.optional(v.id("rides")),
    // Customer rating (after delivery)
    rating: v.optional(v.number()),
    ratingComment: v.optional(v.string()),
    ratingToken: v.optional(v.string()),
    // Recurring ride reference
    recurringRideId: v.optional(v.id("recurringRides")),
  })
    .index("by_customer", ["customerId"])
    .index("by_driver", ["driverId"])
    .index("by_status", ["status"])
    .index("by_tracking_token", ["trackingToken"])
    .index("by_invoice", ["invoiceId"])
    .index("by_ride_number", ["rideNumber"]),

  invoices: defineTable({
    customerId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    subtotal: v.optional(v.number()),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    totalAmount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("paid"),
      v.literal("overdue"),
    ),
    dueDate: v.number(),
    notes: v.optional(v.string()),
    invoiceNumber: v.string(),
    headerText: v.optional(v.string()),
    footerText: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    variableSymbol: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
  })
    .index("by_customer", ["customerId"])
    .index("by_status", ["status"]),

  invoiceItems: defineTable({
    invoiceId: v.id("invoices"),
    description: v.string(),
    quantity: v.number(),
    unit: v.optional(v.string()),
    unitPrice: v.number(),
    taxRate: v.optional(v.number()),
    total: v.number(),
    rideId: v.optional(v.id("rides")),
    order: v.number(),
  }).index("by_invoice", ["invoiceId"]),

  invoiceSettings: defineTable({
    key: v.literal("default"),
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyCity: v.optional(v.string()),
    companyIco: v.optional(v.string()),
    companyDic: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    companyEmail: v.optional(v.string()),
    companyWeb: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankName: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    defaultTaxRate: v.optional(v.number()),
    defaultPaymentTermsDays: v.optional(v.number()),
    defaultCurrency: v.optional(v.string()),
    numberingPrefix: v.optional(v.string()),
    numberingYear: v.optional(v.boolean()),
    numberingNextSeq: v.optional(v.number()),
    defaultHeaderText: v.optional(v.string()),
    defaultFooterText: v.optional(v.string()),
    defaultNotes: v.optional(v.string()),
  }).index("by_key", ["key"]),

  driverAvailability: defineTable({
    driverId: v.id("users"),
    date: v.string(),
    available: v.boolean(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_driver", ["driverId"])
    .index("by_date", ["date"])
    .index("by_driver_date", ["driverId", "date"]),

  gpsLocations: defineTable({
    driverId: v.id("users"),
    lat: v.number(),
    lng: v.number(),
    accuracy: v.optional(v.number()),
    speed: v.optional(v.number()),
    heading: v.optional(v.number()),
    isTracking: v.boolean(),
    updatedAt: v.number(),
    adminStopRequested: v.optional(v.boolean()),
  }).index("by_driver", ["driverId"]),

  driverPresence: defineTable({
    driverId: v.id("users"),
    isOnline: v.boolean(),
    lastSeenAt: v.number(),
    onlineSince: v.optional(v.number()),
    offlineSince: v.optional(v.number()),
  })
    .index("by_driver", ["driverId"])
    .index("by_online", ["isOnline"]),

  chatMessages: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    conversationKey: v.string(), // sorted([senderId, receiverId]).join("_")
    text: v.string(),
    read: v.boolean(),
  })
    .index("by_conversation", ["conversationKey"])
    .index("by_receiver_unread", ["receiverId", "read"]),

  receipts: defineTable({
    rideId: v.id("rides"),
    customerId: v.id("users"),
    receiptNumber: v.string(),
    issuedAt: v.number(),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.union(
      v.literal("hotovost"),
      v.literal("prevod"),
      v.literal("faktura"),
      v.literal("karta"),
    ),
    isPaid: v.boolean(),
    driverName: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    cargoDescription: v.string(),
    rideNumber: v.string(),
  })
    .index("by_customer", ["customerId"])
    .index("by_ride", ["rideId"]),

  customerDocuments: defineTable({
    customerId: v.id("users"),
    uploadedBy: v.id("users"),
    storageId: v.id("_storage"),
    filename: v.string(),
    uploadedAt: v.number(),
    description: v.optional(v.string()),
  }).index("by_customer", ["customerId"]),

  siteSettings: defineTable({
    key: v.string(), // singleton key, e.g. "receiptTemplate"
    // Receipt template fields
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyIco: v.optional(v.string()),
    companyDic: v.optional(v.string()),
    companyWeb: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    emailSubject: v.optional(v.string()),
    emailHeaderNote: v.optional(v.string()),
    emailFooterNote: v.optional(v.string()),
    showDriverName: v.optional(v.boolean()),
    showCargoDescription: v.optional(v.boolean()),
    // Payslip template fields
    psCompanyName: v.optional(v.string()),
    psCompanyAddress: v.optional(v.string()),
    psCompanyIco: v.optional(v.string()),
    psCompanyDic: v.optional(v.string()),
    psCompanyPhone: v.optional(v.string()),
    psCompanyEmail: v.optional(v.string()),
    psLogoUrl: v.optional(v.string()),
    psAccentColor: v.optional(v.string()),
    psHeaderNote: v.optional(v.string()),
    psFooterNote: v.optional(v.string()),
    psShowHours: v.optional(v.boolean()),
    psShowSignatureLine: v.optional(v.boolean()),
  }).index("by_key", ["key"]),

  teams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    color: v.optional(v.string()), // for visual distinction
  }).index("by_name", ["name"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    driverId: v.id("users"),
  })
    .index("by_team", ["teamId"])
    .index("by_driver", ["driverId"])
    .index("by_team_driver", ["teamId", "driverId"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  rideRejections: defineTable({
    driverId: v.id("users"),
    rideId: v.id("rides"),
    rejectedAt: v.number(),
  })
    .index("by_driver", ["driverId"])
    .index("by_ride", ["rideId"])
    .index("by_driver_ride", ["driverId", "rideId"]),

  // Temporary orders created on landing page before payment is confirmed
  pendingGuestOrders: defineTable({
    // Guest contact info
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.string(),
    // Order details (mirrors rides table)
    pickupAddress: v.string(),
    pickupContactName: v.string(),
    pickupContactPhone: v.string(),
    requestedPickupAt: v.number(),
    deliveryAddress: v.string(),
    deliveryContactName: v.string(),
    deliveryContactPhone: v.string(),
    requestedDeliveryAt: v.number(),
    cargoType: v.union(
      v.literal("envelope"),
      v.literal("parcel"),
      v.literal("box"),
      v.literal("pallet"),
      v.literal("other"),
    ),
    cargoDescription: v.string(),
    weight: v.optional(v.number()),
    quantity: v.number(),
    notes: v.optional(v.string()),
    // AI-calculated price (locked on server, never trusted from client)
    price: v.number(),
    currency: v.string(),
    // AI pricing breakdown (for reference)
    aiVehicle: v.optional(v.string()),
    aiDistance: v.optional(v.string()),
    aiUrgency: v.optional(v.string()),
    // Stripe
    stripeSessionId: v.optional(v.string()),
    // Status lifecycle
    status: v.union(
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("expired"),
    ),
    expiresAt: v.number(),
  })
    .index("by_stripe_session", ["stripeSessionId"])
    .index("by_status", ["status"])
    .index("by_expires", ["expiresAt"]),

  fuelCache: defineTable({
    cacheKey: v.string(), // 'stations' | 'prices' | 'history'
    data: v.string(), // JSON stringified payload
    fetchedAt: v.number(),
  }).index("by_key", ["cacheKey"]),

  fuelSettings: defineTable({
    eurRateMode: v.union(v.literal("auto"), v.literal("manual")),
    eurRateManual: v.optional(v.number()),
    eurRateCnb: v.optional(v.number()),
    cnbFetchedAt: v.optional(v.number()),
  }),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    type: v.union(
      v.literal("ride_status"),
      v.literal("ride_assigned"),
      v.literal("invoice"),
      v.literal("approval"),
      v.literal("system"),
    ),
    rideId: v.optional(v.id("rides")),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"]),

  // ─── CRM ──────────────────────────────────────────────────────────────────

  crmContacts: defineTable({
    type: v.union(v.literal("company"), v.literal("person")),
    name: v.string(),
    companyName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    ico: v.optional(v.string()),
    dic: v.optional(v.string()),
    tags: v.array(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("lead"),
    ),
    linkedUserId: v.optional(v.id("users")),
    assignedTo: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_linked_user", ["linkedUserId"]),

  crmNotes: defineTable({
    contactId: v.id("crmContacts"),
    authorId: v.id("users"),
    text: v.string(),
    type: v.union(
      v.literal("note"),
      v.literal("call"),
      v.literal("email"),
      v.literal("meeting"),
    ),
  }).index("by_contact", ["contactId"]),

  crmActivities: defineTable({
    contactId: v.id("crmContacts"),
    authorId: v.id("users"),
    action: v.string(),
    detail: v.optional(v.string()),
  }).index("by_contact", ["contactId"]),

  // ─── HR ───────────────────────────────────────────────────────────────────

  employees: defineTable({
    linkedUserId: v.optional(v.id("users")),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    position: v.optional(v.string()),
    department: v.optional(v.string()),
    hireDate: v.optional(v.number()),
    birthDate: v.optional(v.number()),
    address: v.optional(v.string()),
    contractType: v.union(
      v.literal("hpp"),
      v.literal("dpp"),
      v.literal("dpc"),
      v.literal("osvc"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("trial"),
    ),
    salaryType: v.union(
      v.literal("monthly"),
      v.literal("hourly"),
      v.literal("per_delivery"),
    ),
    salaryAmount: v.optional(v.number()),
    bankAccount: v.optional(v.string()),
    personalId: v.optional(v.string()),
    notes: v.optional(v.string()),
    documentIds: v.array(v.id("_storage")),
  })
    .index("by_status", ["status"])
    .index("by_linked_user", ["linkedUserId"]),

  shifts: defineTable({
    employeeId: v.id("employees"),
    date: v.string(),
    clockIn: v.optional(v.number()),
    clockOut: v.optional(v.number()),
    plannedStart: v.optional(v.string()),
    plannedEnd: v.optional(v.string()),
    type: v.union(
      v.literal("regular"),
      v.literal("overtime"),
      v.literal("night"),
      v.literal("holiday"),
    ),
    hoursWorked: v.optional(v.number()),
    notes: v.optional(v.string()),
    approvedBy: v.optional(v.id("users")),
  })
    .index("by_employee", ["employeeId"])
    .index("by_date", ["date"])
    .index("by_employee_date", ["employeeId", "date"]),

  leaveRequests: defineTable({
    employeeId: v.id("employees"),
    type: v.union(
      v.literal("vacation"),
      v.literal("sick"),
      v.literal("unpaid"),
      v.literal("other"),
    ),
    startDate: v.string(),
    endDate: v.string(),
    days: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    notes: v.optional(v.string()),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_employee", ["employeeId"])
    .index("by_status", ["status"]),

  // ─── Výplatní pásky ───────────────────────────────────────────────────────

  payslipSettings: defineTable({
    employeeId: v.id("employees"),
    hourlyRate: v.optional(v.number()),
    monthlyRate: v.optional(v.number()),
    bonusAmount: v.optional(v.number()),
    overtimeMultiplier: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_employee", ["employeeId"]),

  payslips: defineTable({
    employeeId: v.id("employees"),
    periodMonth: v.number(),
    periodYear: v.number(),
    hoursWorked: v.optional(v.number()),
    grossSalary: v.number(),
    socialInsurance: v.number(),
    healthInsurance: v.number(),
    // Tax calculation fields (Czech 2025)
    taxBase: v.optional(v.number()), // základ daně
    taxCredit: v.optional(v.number()), // sleva na poplatníka (default 2570)
    taxBonus: v.optional(v.number()), // daňový bonus
    taxAdvance: v.number(),
    // Employer contributions (informative, not deducted from employee)
    employerSocialIns: v.optional(v.number()), // SZ zaměstnavatel 24,8 %
    employerHealthIns: v.optional(v.number()), // ZP zaměstnavatel 9 %
    otherDeductions: v.optional(v.number()),
    otherDeductionsNote: v.optional(v.string()),
    bonuses: v.optional(v.number()),
    netSalary: v.number(),
    // Vacation tracking
    vacationDaysTotal: v.optional(v.number()),
    vacationDaysTaken: v.optional(v.number()),
    pdfStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("draft"),
      v.literal("finalized"),
      v.literal("sent"),
    ),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_employee", ["employeeId"])
    .index("by_period", ["periodYear", "periodMonth"])
    .index("by_status", ["status"]),

  // ─── Opakované zakázky ────────────────────────────────────────────────────

  recurringRides: defineTable({
    customerId: v.id("users"),
    title: v.string(),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("custom"),
    ),
    weekDays: v.optional(v.array(v.number())),
    customIntervalDays: v.optional(v.number()),
    nextOccurrenceAt: v.number(),
    active: v.boolean(),
    rideTemplate: v.object({
      pickupAddress: v.string(),
      pickupContactName: v.string(),
      pickupContactPhone: v.string(),
      deliveryAddress: v.string(),
      deliveryContactName: v.string(),
      deliveryContactPhone: v.string(),
      cargoType: v.union(
        v.literal("envelope"),
        v.literal("parcel"),
        v.literal("box"),
        v.literal("pallet"),
        v.literal("other"),
      ),
      cargoDescription: v.string(),
      weight: v.optional(v.number()),
      quantity: v.number(),
      notes: v.optional(v.string()),
      codEnabled: v.optional(v.boolean()),
      codAmount: v.optional(v.number()),
    }),
    createdBy: v.id("users"),
  })
    .index("by_customer", ["customerId"])
    .index("by_next_occurrence", ["nextOccurrenceAt"])
    .index("by_active", ["active"]),

  // ─── API klíče ────────────────────────────────────────────────────────────

  apiKeys: defineTable({
    customerId: v.id("users"),
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    active: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    webhookUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    // "customer" = existing order API, "dispatcher" = full read access for AI
    scope: v.optional(v.union(v.literal("customer"), v.literal("dispatcher"))),
  })
    .index("by_customer", ["customerId"])
    .index("by_hash", ["keyHash"]),

  // ─── Vending Operations Management ───────────────────────────────────────

  // Klientské workspace (multi-tenant)
  serviceClients: defineTable({
    name: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    ico: v.optional(v.string()),
    notes: v.optional(v.string()),
    active: v.boolean(),
    createdBy: v.id("users"),
    // Branding per client
    logoUrl: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    // Custom email template for visit completion notification (plain text, supports {visitNumber}, {location}, {driver}, {time})
    completionEmailTemplate: v.optional(v.string()),
  }).index("by_active", ["active"]),

  // Přiřazení uživatelů ke klientovi
  serviceClientUsers: defineTable({
    clientId: v.id("serviceClients"),
    userId: v.id("users"),
    role: v.union(v.literal("supervisor"), v.literal("viewer")),
  })
    .index("by_client", ["clientId"])
    .index("by_user", ["userId"])
    .index("by_client_user", ["clientId", "userId"]),

  // Servisní lokace (automaty, lockery, apod.)
  serviceLocations: defineTable({
    clientId: v.id("serviceClients"),
    name: v.string(),
    locationCode: v.string(), // unikátní ID lokace
    locationType: v.string(), // vending_machine, parcel_locker, coffee_machine, etc.
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("maintenance"),
      v.literal("offline"),
    ),
    address: v.string(),
    city: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    openingHours: v.optional(v.string()),
    accessInstructions: v.optional(v.string()),
    pinCode: v.optional(v.string()), // encrypted in practice
    photoStorageId: v.optional(v.id("_storage")),
    assignedDriverId: v.optional(v.id("users")),
    internalNotes: v.optional(v.string()),
    publicNotes: v.optional(v.string()),
    lastVisitAt: v.optional(v.number()),
    nextVisitAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()), // soft delete
    createdBy: v.id("users"),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_driver", ["assignedDriverId"])
    .index("by_code", ["locationCode"]),

  // Návštěvy
  serviceVisits: defineTable({
    locationId: v.id("serviceLocations"),
    clientId: v.id("serviceClients"),
    driverId: v.optional(v.id("users")),
    checklistTemplateId: v.optional(v.id("visitChecklistTemplates")),
    status: v.union(
      v.literal("scheduled"), // Naplánováno
      v.literal("assigned"), // Přiřazeno řidiči
      v.literal("accepted"), // Řidič přijal
      v.literal("en_route"), // Na cestě
      v.literal("in_progress"), // Probíhá
      v.literal("completed"), // Dokončeno
      v.literal("cancelled"), // Zrušeno
      v.literal("incident"), // Incident
    ),
    scheduledAt: v.number(),
    estimatedDuration: v.optional(v.number()), // minuty
    arrivedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    arrivalLat: v.optional(v.number()),
    arrivalLng: v.optional(v.number()),
    driverNotes: v.optional(v.string()),
    dispatcherNotes: v.optional(v.string()),
    visitNumber: v.string(), // V-2024-001
    signatureStorageId: v.optional(v.id("_storage")),
    reportPdfStorageId: v.optional(v.id("_storage")),
    deletedAt: v.optional(v.number()),
    createdBy: v.id("users"),
  })
    .index("by_location", ["locationId"])
    .index("by_client", ["clientId"])
    .index("by_driver", ["driverId"])
    .index("by_status", ["status"])
    .index("by_scheduled", ["scheduledAt"])
    .index("by_visit_number", ["visitNumber"]),

  // Šablony checklistů
  visitChecklistTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    locationTypes: v.array(v.string()), // ["vending_machine", "parcel_locker"]
    active: v.boolean(),
    createdBy: v.id("users"),
  }).index("by_active", ["active"]),

  // Položky šablony checklistu
  visitChecklistItems: defineTable({
    templateId: v.id("visitChecklistTemplates"),
    order: v.number(),
    text: v.string(),
    required: v.boolean(),
    type: v.union(v.literal("checkbox"), v.literal("text"), v.literal("photo")),
    hint: v.optional(v.string()),
  }).index("by_template", ["templateId"]),

  // Vyplněné checklisty (per návštěva)
  visitChecklists: defineTable({
    visitId: v.id("serviceVisits"),
    templateId: v.id("visitChecklistTemplates"),
    items: v.array(
      v.object({
        itemId: v.id("visitChecklistItems"),
        text: v.string(),
        completed: v.boolean(),
        textValue: v.optional(v.string()),
        photoStorageId: v.optional(v.id("_storage")),
      }),
    ),
    completedAt: v.optional(v.number()),
  }).index("by_visit", ["visitId"]),

  // Fotodokumentace
  visitPhotos: defineTable({
    visitId: v.id("serviceVisits"),
    locationId: v.id("serviceLocations"),
    clientId: v.id("serviceClients"),
    uploadedBy: v.id("users"),
    storageId: v.id("_storage"),
    category: v.union(
      v.literal("before"),
      v.literal("after"),
      v.literal("damage"),
      v.literal("other"),
    ),
    caption: v.optional(v.string()),
    takenAt: v.number(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  })
    .index("by_visit", ["visitId"])
    .index("by_location", ["locationId"])
    .index("by_client", ["clientId"]),

  // Incidenty
  visitIncidents: defineTable({
    visitId: v.id("serviceVisits"),
    locationId: v.id("serviceLocations"),
    clientId: v.id("serviceClients"),
    reportedBy: v.id("users"),
    type: v.union(
      v.literal("machine_locked"),
      v.literal("pin_incorrect"),
      v.literal("machine_damaged"),
      v.literal("broken_display"),
      v.literal("no_products"),
      v.literal("wrong_products"),
      v.literal("power_failure"),
      v.literal("vandalism"),
      v.literal("other"),
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    description: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
    ),
    photoStorageIds: v.array(v.id("_storage")),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    resolutionNote: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_visit", ["visitId"])
    .index("by_location", ["locationId"])
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  // Časová osa návštěvy
  visitTimeline: defineTable({
    visitId: v.id("serviceVisits"),
    event: v.string(), // "assigned", "accepted", "en_route", "arrived", etc.
    description: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    timestamp: v.number(),
    metadata: v.optional(v.string()), // JSON string for extra data
  }).index("by_visit", ["visitId"]),

  // Auditní log vending modulu
  vendingAuditLog: defineTable({
    entityType: v.string(), // "location", "visit", "incident", etc.
    entityId: v.string(),
    action: v.string(),
    userId: v.id("users"),
    timestamp: v.number(),
    changes: v.optional(v.string()), // JSON diff
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["userId"]),
});
