/**
 * Gamification engine pro Kuryr4You
 * Všechna XP logika běží výhradně na serveru.
 * Klient nikdy neposílá počet XP — pouze volá doménovou akci.
 */
import { v } from "convex/values"
import { internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import type { Id, Doc } from "./_generated/dataModel"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"

// ─── Konstanty z config ────────────────────────────────────────────────────

export const LEVEL_COEFFICIENT = 250
export const MAX_LEVEL = 30
export const MAX_STOP_XP_PER_RIDE = 50

/** XP potřebné pro úroveň L: 250 * (L-1)^2 */
export function xpForLevel(level: number): number {
  return LEVEL_COEFFICIENT * Math.pow(level - 1, 2)
}

/** Vypočítá aktuální úroveň z lifetime XP */
export function levelFromXp(xp: number): number {
  // Největší L takové, že 250*(L-1)^2 <= xp
  let level = 1
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (xpForLevel(l) <= xp) {
      level = l
      break
    }
  }
  return level
}

const TITLES: Array<{ minLevel: number; title: string }> = [
  { minLevel: 30, title: "Legenda K4Y" },
  { minLevel: 20, title: "Elitní kurýr" },
  { minLevel: 15, title: "Mistr tras" },
  { minLevel: 10, title: "Zkušený kurýr" },
  { minLevel: 8, title: "Spolehlivý kurýr" },
  { minLevel: 5, title: "Kurýr v tempu" },
  { minLevel: 3, title: "Aktivní kurýr" },
  { minLevel: 1, title: "Nováček" },
]

export function titleForLevel(level: number): string {
  for (const t of TITLES) {
    if (level >= t.minLevel) return t.title
  }
  return "Nováček"
}

/** Vrátí YYYY-MM-DD v Europe/Prague */
export function pragueDateString(ts: number): string {
  return new Date(ts).toLocaleDateString("cs-CZ", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).split(". ").reverse().map((p, i) => p.padStart(i === 0 ? 4 : 2, "0")).join("-")
}

/** Vrátí klíč periody pro výzvu (denní: YYYY-MM-DD, týdenní: YYYY-Www, měsíční: YYYY-MM) */
export function periodKey(cadence: "daily" | "weekly" | "monthly", ts: number): string {
  const d = new Date(new Date(ts).toLocaleString("en-US", { timeZone: "Europe/Prague" }))
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  if (cadence === "daily") return `${year}-${month}-${day}`
  if (cadence === "monthly") return `${year}-${month}`
  // weekly: ISO week, Monday start
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1 // 0=Mon
  const monday = new Date(d)
  monday.setDate(d.getDate() - dow)
  const wYear = monday.getFullYear()
  const wMonth = String(monday.getMonth() + 1).padStart(2, "0")
  const wDay = String(monday.getDate()).padStart(2, "0")
  // ISO week number
  const jan4 = new Date(wYear, 0, 4)
  const startOfYear = new Date(jan4)
  startOfYear.setDate(jan4.getDate() - (jan4.getDay() === 0 ? 6 : jan4.getDay() - 1))
  const weekNo = Math.floor((monday.getTime() - startOfYear.getTime()) / (7 * 86400000)) + 1
  return `${wYear}-W${String(weekNo).padStart(2, "0")}`
}

// ─── Interní: načtení nebo lazy-create profilu ─────────────────────────────

async function getOrCreateProfile(
  ctx: MutationCtx,
  driverId: Id<"users">
): Promise<Doc<"driverGamificationProfiles">> {
  const existing = await ctx.db
    .query("driverGamificationProfiles")
    .withIndex("by_driver", q => q.eq("driverId", driverId))
    .first()
  if (existing) return existing
  const id = await ctx.db.insert("driverGamificationProfiles", {
    driverId,
    lifetimeXp: 0,
    level: 1,
    seasonXp: 0,
    currentStreak: 0,
    longestStreak: 0,
    updatedAt: Date.now(),
  })
  return (await ctx.db.get(id))!
}

// ─── Interní: idempotentní zápis XP události ──────────────────────────────

export const awardXpInternal = internalMutation({
  args: {
    driverId: v.id("users"),
    eventKey: v.string(),
    type: v.string(),
    xp: v.number(),
    rideId: v.optional(v.id("rides")),
    visitId: v.optional(v.id("serviceVisits")),
    metadata: v.optional(v.string()),
  },
  returns: v.object({ awarded: v.boolean(), newLevel: v.optional(v.number()) }),
  handler: async (ctx, args) => {
    // Idempotence: pokud eventKey již existuje, nic neudělej
    const existing = await ctx.db
      .query("gamificationEvents")
      .withIndex("by_event_key", q => q.eq("eventKey", args.eventKey))
      .first()
    if (existing) {
      console.log(`[gamification] eventKey already exists, skipping: ${args.eventKey}`)
      return { awarded: false }
    }

    const now = Date.now()
    await ctx.db.insert("gamificationEvents", {
      driverId: args.driverId,
      eventKey: args.eventKey,
      type: args.type,
      xp: args.xp,
      rideId: args.rideId,
      visitId: args.visitId,
      occurredAt: now,
      metadata: args.metadata,
    })

    // Aktualizuj profil
    const profile = await getOrCreateProfile(ctx, args.driverId)
    const newLifetimeXp = profile.lifetimeXp + args.xp
    const newSeasonXp = profile.seasonXp + args.xp
    const oldLevel = profile.level
    const newLevel = levelFromXp(newLifetimeXp)

    // Streak: přidej den pokud není dnešní datum
    const todayStr = pragueDateString(now)
    let newStreak = profile.currentStreak
    let newLongest = profile.longestStreak
    if (profile.lastActiveDate !== todayStr) {
      // Zkontroluj zda je to včerejší den (streak pokračuje)
      const yesterdayTs = now - 86400000
      const yesterdayStr = pragueDateString(yesterdayTs)
      if (profile.lastActiveDate === yesterdayStr) {
        newStreak = profile.currentStreak + 1
      } else if (!profile.lastActiveDate) {
        newStreak = 1
      } else {
        newStreak = 1 // streak přerušen
      }
      if (newStreak > newLongest) newLongest = newStreak
    }

    const leveledUp = newLevel > oldLevel
    await ctx.db.patch(profile._id, {
      lifetimeXp: newLifetimeXp,
      level: newLevel,
      seasonXp: newSeasonXp,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: todayStr,
      updatedAt: now,
      pendingLevelUp: leveledUp ? true : profile.pendingLevelUp,
      pendingLevelUpLevel: leveledUp ? newLevel : profile.pendingLevelUpLevel,
      pendingLevelUpTitle: leveledUp ? titleForLevel(newLevel) : profile.pendingLevelUpTitle,
    })

    // Aktualizuj výzvy
    await ctx.scheduler.runAfter(0, internal.gamification.updateChallengesForEvent, {
      driverId: args.driverId,
      type: args.type,
      rideId: args.rideId,
      visitId: args.visitId,
      now,
    })

    // Zkontroluj odznaky
    await ctx.scheduler.runAfter(0, internal.gamification.checkBadgesForDriver, {
      driverId: args.driverId,
      now,
    })

    console.log(`[gamification] +${args.xp} XP → driver ${args.driverId} (${args.eventKey}), level ${oldLevel}→${newLevel}`)
    return { awarded: true, newLevel: leveledUp ? newLevel : undefined }
  },
})

// ─── Interní: aktualizace výzev po události ────────────────────────────────

export const updateChallengesForEvent = internalMutation({
  args: {
    driverId: v.id("users"),
    type: v.string(),
    rideId: v.optional(v.id("rides")),
    visitId: v.optional(v.id("serviceVisits")),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = args.now

    // Metriky závisí na typu události
    const relevantMetrics: Record<string, string[]> = {
      ride_completed: ["rides_completed", "completion_ratio"],
      pod_complete: ["pod_completion_ratio"],
      pod_photo_and_signature: ["pod_completion_ratio"],
      pickup_on_time: ["on_time_ratio"],
      delivery_on_time: ["on_time_ratio"],
      vending_visit_completed: ["vending_checklist_ratio"],
      vending_checklist_complete: ["vending_checklist_ratio"],
      rating_five: ["average_rating"],
      intermediate_stop: ["multi_stop_routes"],
    }
    const affected = relevantMetrics[args.type] ?? []

    for (const cadence of ["daily", "weekly", "monthly"] as const) {
      const pk = periodKey(cadence, now)
      const challenges = await ctx.db
        .query("driverChallenges")
        .withIndex("by_driver_period", q => q.eq("driverId", args.driverId).eq("periodKey", pk))
        .filter(q => q.eq(q.field("status"), "active"))
        .collect()

      for (const challenge of challenges) {
        const template = await ctx.db.get(challenge.templateId)
        if (!template || !affected.includes(template.metric)) continue

        // Přepočítej progress
        const newProgress = challenge.progress + 1
        const completed = newProgress >= challenge.target

        await ctx.db.patch(challenge._id, {
          progress: newProgress,
          status: completed ? "completed" : "active",
          completedAt: completed ? now : undefined,
        })

        if (completed) {
          // Udělej XP za splnění výzvy
          const challengeEventKey = `challenge:${challenge._id}:completed`
          await ctx.scheduler.runAfter(0, internal.gamification.awardXpInternal, {
            driverId: args.driverId,
            eventKey: challengeEventKey,
            type: "challenge_completed",
            xp: challenge.xpReward,
          })
          // In-app notifikace
          await ctx.db.insert("notifications", {
            userId: args.driverId,
            title: "🏆 Výzva splněna!",
            message: `Splnil jsi výzvu „${template.name}" a získal ${challenge.xpReward} XP!`,
            read: false,
            type: "ride_status",
          })
        }
      }
    }
    return null
  },
})

// ─── Interní: kontrola odznaků ──────────────────────────────────────────────

export const checkBadgesForDriver = internalMutation({
  args: { driverId: v.id("users"), now: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { driverId, now } = args
    const profile = await ctx.db
      .query("driverGamificationProfiles")
      .withIndex("by_driver", q => q.eq("driverId", driverId))
      .first()
    if (!profile) return null

    const defs = await ctx.db.query("badgeDefinitions").filter(q => q.eq(q.field("active"), true)).collect()

    for (const def of defs) {
      // Spočítej metriku
      const metricValue = await computeBadgeMetric(ctx, driverId, def.metric, profile)

      const tiers = [
        { tier: "platinum" as const, threshold: def.tiers.platinum },
        { tier: "gold" as const, threshold: def.tiers.gold },
        { tier: "silver" as const, threshold: def.tiers.silver },
        { tier: "bronze" as const, threshold: def.tiers.bronze },
      ]

      for (const { tier, threshold } of tiers) {
        if (metricValue < threshold) continue

        // Zkontroluj zda již má tento (nebo vyšší) tier
        const existing = await ctx.db
          .query("driverBadges")
          .withIndex("by_driver_badge", q => q.eq("driverId", driverId).eq("badgeCode", def.code))
          .order("desc")
          .first()

        const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 }
        if (existing && tierOrder[existing.tier] >= tierOrder[tier]) break // Již má

        // Uděl odznak
        const eventKey = `badge:${def.code}:${tier}`
        const alreadyAwarded = await ctx.db
          .query("gamificationEvents")
          .withIndex("by_event_key", q => q.eq("eventKey", eventKey))
          .first()
        if (!alreadyAwarded) {
          await ctx.db.insert("driverBadges", {
            driverId,
            badgeCode: def.code,
            tier,
            awardedAt: now,
            sourceEventKey: eventKey,
          })
          await ctx.db.insert("notifications", {
            userId: driverId,
            title: `🏅 Nový odznak: ${def.name}`,
            message: `Získal jsi ${tierLabel(tier)} odznak „${def.name}"!`,
            read: false,
            type: "ride_status",
          })
          // Zápis do events pro auditní stopu (0 XP za samotný odznak)
          await ctx.db.insert("gamificationEvents", {
            driverId,
            eventKey,
            type: "badge_awarded",
            xp: 0,
            occurredAt: now,
            metadata: JSON.stringify({ badgeCode: def.code, tier }),
          })
        }
        break // Nejvyšší splněný tier pro tuto kontrolu
      }
    }
    return null
  },
})

function tierLabel(tier: string): string {
  const labels: Record<string, string> = {
    bronze: "bronzový",
    silver: "stříbrný",
    gold: "zlatý",
    platinum: "platinový",
  }
  return labels[tier] ?? tier
}

async function computeBadgeMetric(
  ctx: QueryCtx | MutationCtx,
  driverId: Id<"users">,
  metric: string,
  profile: Doc<"driverGamificationProfiles">
): Promise<number> {
  switch (metric) {
    case "rides_completed": {
      const rides = await ctx.db.query("rides")
        .withIndex("by_driver", q => q.eq("driverId", driverId))
        .filter(q => q.eq(q.field("status"), "delivered"))
        .collect()
      return rides.length
    }
    case "on_time_deliveries": {
      const events = await ctx.db.query("gamificationEvents")
        .withIndex("by_driver_time", q => q.eq("driverId", driverId))
        .filter(q => q.eq(q.field("type"), "delivery_on_time"))
        .collect()
      return events.length
    }
    case "complete_pods": {
      const events = await ctx.db.query("gamificationEvents")
        .withIndex("by_driver_time", q => q.eq("driverId", driverId))
        .filter(q => q.eq(q.field("type"), "pod_complete"))
        .collect()
      return events.length
    }
    case "multi_stop_routes": {
      const rides = await ctx.db.query("rides")
        .withIndex("by_driver", q => q.eq("driverId", driverId))
        .filter(q => q.and(q.eq(q.field("status"), "delivered"), q.eq(q.field("isMultiStop"), true)))
        .collect()
      return rides.length
    }
    case "active_days": {
      return profile.longestStreak
    }
    case "days_gps_over_90_percent": {
      // Proxy: počet dní s alespoň 1 GPS záznamem
      const locs = await ctx.db.query("gpsLocations")
        .withIndex("by_driver", q => q.eq("driverId", driverId))
        .collect()
      const days = new Set(locs.map(l => pragueDateString(l._creationTime)))
      return days.size
    }
    case "five_star_ratings": {
      const rides = await ctx.db.query("rides")
        .withIndex("by_driver", q => q.eq("driverId", driverId))
        .filter(q => q.eq(q.field("rating"), 5))
        .collect()
      return rides.length
    }
    case "active_ride_km": {
      // Proxy: součet vzdáleností z GPS
      const locs = await ctx.db.query("gpsLocations")
        .withIndex("by_driver", q => q.eq("driverId", driverId))
        .collect()
      return Math.floor(locs.length * 0.1) // ~100m per GPS point approximation
    }
    case "dispatcher_team_awards": {
      const events = await ctx.db.query("gamificationEvents")
        .withIndex("by_driver_time", q => q.eq("driverId", driverId))
        .filter(q => q.and(q.eq(q.field("type"), "manual_award"), q.eq(q.field("isManual"), true)))
        .collect()
      return events.length
    }
    case "perfect_weeks": {
      const events = await ctx.db.query("gamificationEvents")
        .withIndex("by_driver_time", q => q.eq("driverId", driverId))
        .filter(q => q.eq(q.field("type"), "challenge_completed"))
        .collect()
      // Proxy: count of weekly challenges completed
      return Math.floor(events.length / 3)
    }
    case "level": {
      return profile.level
    }
    default:
      return 0
  }
}

// ─── Public: driver queries ────────────────────────────────────────────────

export const getMyProfile = query({
  args: {},
  returns: v.union(
    v.object({
      lifetimeXp: v.number(),
      level: v.number(),
      seasonXp: v.number(),
      currentStreak: v.number(),
      longestStreak: v.number(),
      title: v.string(),
      xpToNextLevel: v.number(),
      xpCurrentLevel: v.number(),
      pendingLevelUp: v.optional(v.boolean()),
      pendingLevelUpLevel: v.optional(v.number()),
      pendingLevelUpTitle: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return null
    const profile = await ctx.db
      .query("driverGamificationProfiles")
      .withIndex("by_driver", q => q.eq("driverId", authId as Id<"users">))
      .first()
    if (!profile) return {
      lifetimeXp: 0, level: 1, seasonXp: 0, currentStreak: 0, longestStreak: 0,
      title: "Nováček", xpToNextLevel: xpForLevel(2), xpCurrentLevel: 0,
    }
    const level = profile.level
    const currentLevelXp = xpForLevel(level)
    const nextLevelXp = level < MAX_LEVEL ? xpForLevel(level + 1) : currentLevelXp
    return {
      lifetimeXp: profile.lifetimeXp,
      level,
      seasonXp: profile.seasonXp,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      title: titleForLevel(level),
      xpToNextLevel: nextLevelXp,
      xpCurrentLevel: currentLevelXp,
      pendingLevelUp: profile.pendingLevelUp,
      pendingLevelUpLevel: profile.pendingLevelUpLevel,
      pendingLevelUpTitle: profile.pendingLevelUpTitle,
    }
  },
})

export const getMyChallenges = query({
  args: { cadence: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")) },
  returns: v.array(v.object({
    _id: v.id("driverChallenges"),
    templateCode: v.string(),
    name: v.string(),
    description: v.string(),
    progress: v.number(),
    target: v.number(),
    xpReward: v.number(),
    status: v.string(),
    expiresAt: v.number(),
    completedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return []
    const pk = periodKey(args.cadence, Date.now())
    const challenges = await ctx.db
      .query("driverChallenges")
      .withIndex("by_driver_period", q => q.eq("driverId", authId as Id<"users">).eq("periodKey", pk))
      .collect()
    const result: Array<{ _id: Id<"driverChallenges">; templateCode: string; name: string; description: string; progress: number; target: number; xpReward: number; status: string; expiresAt: number; completedAt: number | undefined }> = []
    for (const c of challenges) {
      const t = await ctx.db.get(c.templateId)
      if (!t) continue
      result.push({
        _id: c._id,
        templateCode: t.code,
        name: t.name,
        description: t.description,
        progress: c.progress,
        target: c.target,
        xpReward: c.xpReward,
        status: c.status,
        expiresAt: c.expiresAt,
        completedAt: c.completedAt,
      })
    }
    return result
  },
})

export const getMyBadges = query({
  args: {},
  returns: v.array(v.object({
    code: v.string(),
    name: v.string(),
    description: v.string(),
    iconKey: v.string(),
    currentTier: v.optional(v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"), v.literal("platinum"))),
    awardedAt: v.optional(v.number()),
    nextTier: v.optional(v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"), v.literal("platinum"))),
    nextTierThreshold: v.optional(v.number()),
    metricValue: v.number(),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "driver") return []
    const driverId = authId as Id<"users">

    const profile = await ctx.db
      .query("driverGamificationProfiles")
      .withIndex("by_driver", q => q.eq("driverId", driverId))
      .first()
    const defs = await ctx.db.query("badgeDefinitions").filter(q => q.eq(q.field("active"), true)).collect()
    const earnedBadges = await ctx.db
      .query("driverBadges")
      .withIndex("by_driver", q => q.eq("driverId", driverId))
      .collect()

    const result: Array<{ code: string; name: string; description: string; iconKey: string; currentTier: "bronze" | "silver" | "gold" | "platinum"; awardedAt: number; nextTier: "bronze" | "silver" | "gold" | "platinum" | undefined; nextTierThreshold: number | undefined; metricValue: number }> = []
    for (const def of defs) {
      const earned = earnedBadges
        .filter(b => b.badgeCode === def.code)
        .sort((a, b) => {
          const order = { bronze: 1, silver: 2, gold: 3, platinum: 4 }
          return order[b.tier] - order[a.tier]
        })[0]

      const metricValue = profile
        ? await computeBadgeMetric(ctx, driverId, def.metric, profile)
        : 0

      const allTiers: Array<{ tier: "bronze" | "silver" | "gold" | "platinum"; threshold: number }> = [
        { tier: "bronze", threshold: def.tiers.bronze },
        { tier: "silver", threshold: def.tiers.silver },
        { tier: "gold", threshold: def.tiers.gold },
        { tier: "platinum", threshold: def.tiers.platinum },
      ]
      const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 }
      const currentTierOrder = earned ? tierOrder[earned.tier] : 0
      const nextTierEntry = allTiers.find(t => tierOrder[t.tier] > currentTierOrder)

      result.push({
        code: def.code,
        name: def.name,
        description: def.description,
        iconKey: def.iconKey,
        currentTier: earned?.tier,
        awardedAt: earned?.awardedAt,
        nextTier: nextTierEntry?.tier,
        nextTierThreshold: nextTierEntry?.threshold,
        metricValue,
      })
    }
    return result
  },
})

/** Řidič potvrdí přečtení level-up notifikace */
export const acknowledgeLevelUp = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const profile = await ctx.db
      .query("driverGamificationProfiles")
      .withIndex("by_driver", q => q.eq("driverId", authId as Id<"users">))
      .first()
    if (!profile) return null
    await ctx.db.patch(profile._id, {
      pendingLevelUp: false,
      pendingLevelUpLevel: undefined,
      pendingLevelUpTitle: undefined,
    })
    return null
  },
})

// ─── Dispatcher: driver gamification overview ──────────────────────────────

export const getDriverGamificationProfile = query({
  args: { driverId: v.id("users") },
  returns: v.union(
    v.object({
      lifetimeXp: v.number(),
      level: v.number(),
      seasonXp: v.number(),
      currentStreak: v.number(),
      longestStreak: v.number(),
      title: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return null
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return null
    const profile = await ctx.db
      .query("driverGamificationProfiles")
      .withIndex("by_driver", q => q.eq("driverId", args.driverId))
      .first()
    if (!profile) return { lifetimeXp: 0, level: 1, seasonXp: 0, currentStreak: 0, longestStreak: 0, title: "Nováček" }
    return {
      lifetimeXp: profile.lifetimeXp,
      level: profile.level,
      seasonXp: profile.seasonXp,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      title: titleForLevel(profile.level),
    }
  },
})

export const getDriverAuditHistory = query({
  args: {
    driverId: v.id("users"),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("gamificationEvents"),
    eventKey: v.string(),
    type: v.string(),
    xp: v.number(),
    occurredAt: v.number(),
    isManual: v.optional(v.boolean()),
    reason: v.optional(v.string()),
    dispatcherName: v.optional(v.string()),
    metadata: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []
    const limit = args.limit ?? 50
    let events = await ctx.db
      .query("gamificationEvents")
      .withIndex("by_driver_time", q => q.eq("driverId", args.driverId))
      .order("desc")
      .take(200)
    if (args.type) events = events.filter(e => e.type === args.type)
    events = events.slice(0, limit)
    const result: Array<{ _id: Id<"gamificationEvents">; eventKey: string; type: string; xp: number; occurredAt: number; isManual: boolean | undefined; reason: string | undefined; dispatcherName: string | undefined; metadata: string | undefined }> = []
    for (const e of events) {
      let dispatcherName: string | undefined
      if (e.dispatcherId) {
        const d = await ctx.db.get(e.dispatcherId)
        dispatcherName = d?.name ?? d?.email
      }
      result.push({
        _id: e._id,
        eventKey: e.eventKey,
        type: e.type,
        xp: e.xp,
        occurredAt: e.occurredAt,
        isManual: e.isManual,
        reason: e.reason,
        dispatcherName,
        metadata: e.metadata,
      })
    }
    return result
  },
})

export const getDriverActiveChallenges = query({
  args: { driverId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("driverChallenges"),
    name: v.string(),
    cadence: v.string(),
    progress: v.number(),
    target: v.number(),
    xpReward: v.number(),
    status: v.string(),
    expiresAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []
    const challenges = await ctx.db
      .query("driverChallenges")
      .withIndex("by_driver_period", q => q.eq("driverId", args.driverId))
      .filter(q => q.eq(q.field("status"), "active"))
      .collect()
    const result: Array<{ _id: Id<"driverChallenges">; name: string; cadence: "daily" | "weekly" | "monthly"; progress: number; target: number; xpReward: number; status: string; expiresAt: number }> = []
    for (const c of challenges) {
      const t = await ctx.db.get(c.templateId)
      if (!t) continue
      result.push({
        _id: c._id,
        name: t.name,
        cadence: t.cadence,
        progress: c.progress,
        target: c.target,
        xpReward: c.xpReward,
        status: c.status,
        expiresAt: c.expiresAt,
      })
    }
    return result
  },
})

export const getDriverBadges = query({
  args: { driverId: v.id("users") },
  returns: v.array(v.object({
    code: v.string(),
    name: v.string(),
    iconKey: v.string(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"), v.literal("platinum")),
    awardedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []
    const badges = await ctx.db
      .query("driverBadges")
      .withIndex("by_driver", q => q.eq("driverId", args.driverId))
      .order("desc")
      .collect()
    const result: Array<{ code: string; name: string; iconKey: string; tier: "bronze" | "silver" | "gold" | "platinum"; awardedAt: number }> = []
    for (const b of badges) {
      const def = await ctx.db
        .query("badgeDefinitions")
        .withIndex("by_code", q => q.eq("code", b.badgeCode))
        .first()
      if (!def) continue
      result.push({ code: b.badgeCode, name: def.name, iconKey: def.iconKey, tier: b.tier, awardedAt: b.awardedAt })
    }
    return result
  },
})

// ─── Dispatcher: ruční ocenění / korekce ──────────────────────────────────

export const manualAward = mutation({
  args: {
    driverId: v.id("users"),
    xp: v.number(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.reason.trim()) throw new Error("Důvod je povinný")
    if (args.xp < -2000 || args.xp > 2000) throw new Error("XP musí být v rozsahu -2 000 až +2 000")
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")
    const driver = await ctx.db.get(args.driverId)
    if (!driver || driver.role !== "driver") throw new Error("Řidič nenalezen")

    const now = Date.now()
    const eventKey = `manual:${authId}:${args.driverId}:${now}`
    const profile = await getOrCreateProfile(ctx, args.driverId)

    await ctx.db.insert("gamificationEvents", {
      driverId: args.driverId,
      eventKey,
      type: "manual_award",
      xp: args.xp,
      occurredAt: now,
      isManual: true,
      dispatcherId: authId as Id<"users">,
      reason: args.reason,
      originalXp: profile.lifetimeXp,
    })

    const newLifetime = Math.max(0, profile.lifetimeXp + args.xp)
    const newSeason = Math.max(0, profile.seasonXp + args.xp)
    const newLevel = levelFromXp(newLifetime)
    await ctx.db.patch(profile._id, {
      lifetimeXp: newLifetime,
      seasonXp: newSeason,
      level: newLevel,
      updatedAt: now,
    })

    // Notifikace řidiči
    const sign = args.xp >= 0 ? "+" : ""
    await ctx.db.insert("notifications", {
      userId: args.driverId,
      title: args.xp >= 0 ? "🌟 Ocenění od dispečera" : "📝 Korekce XP",
      message: `Dispečer ti ${args.xp >= 0 ? "udělil" : "upravil"} ${sign}${args.xp} XP: ${args.reason}`,
      read: false,
      type: "ride_status",
    })

    return null
  },
})

// ─── Dispatcher: správa šablon výzev ──────────────────────────────────────

export const listChallengeTemplates = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("challengeTemplates"),
    code: v.string(),
    name: v.string(),
    cadence: v.string(),
    metric: v.string(),
    target: v.optional(v.number()),
    xpReward: v.number(),
    active: v.boolean(),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []
    const templates = await ctx.db.query("challengeTemplates").collect()
    return templates.map(t => ({
      _id: t._id,
      code: t.code,
      name: t.name,
      cadence: t.cadence,
      metric: t.metric,
      target: t.target,
      xpReward: t.xpReward,
      active: t.active,
    }))
  },
})

export const updateChallengeTemplate = mutation({
  args: {
    templateId: v.id("challengeTemplates"),
    active: v.optional(v.boolean()),
    xpReward: v.optional(v.number()),
    target: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") throw new Error("Nemáte oprávnění")
    if (args.xpReward !== undefined && (args.xpReward < 50 || args.xpReward > 2000)) {
      throw new Error("XP odměna musí být v rozsahu 50–2 000")
    }
    const updates: Record<string, unknown> = {}
    if (args.active !== undefined) updates.active = args.active
    if (args.xpReward !== undefined) updates.xpReward = args.xpReward
    if (args.target !== undefined) updates.target = args.target
    await ctx.db.patch(args.templateId, updates)
    return null
  },
})

// ─── Internal: seed šablon a badge definic při prvním startu ───────────────

export const seedGamificationData = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Challenge templates
    const templates = [
      { code: "daily_rides", name: "Denní zásilky", description: "Dokonči stanovený počet zásilek dnes", cadence: "daily" as const, metric: "rides_completed", adaptiveTargets: [1, 2, 3], xpReward: 100, active: true },
      { code: "daily_complete_pod", name: "Kompletní POD", description: "Ulož kompletní doklad u všech dnešních zásilek", cadence: "daily" as const, metric: "pod_completion_ratio", target: 1, xpReward: 75, active: true },
      { code: "daily_on_time", name: "Dochvilnost", description: "Dodrž všechny časové sloty dnes", cadence: "daily" as const, metric: "on_time_ratio", target: 1, xpReward: 100, active: true },
      { code: "daily_gps_available", name: "GPS připravena", description: "Měj GPS dostupnou alespoň 90 % aktivní směny", cadence: "daily" as const, metric: "gps_availability_ratio", target: 0.9, xpReward: 50, active: true },
      { code: "daily_vending_checklists", name: "Vending checklisty", description: "Dokonči všechny povinné vending checklisty", cadence: "daily" as const, metric: "vending_checklist_ratio", target: 1, xpReward: 75, active: true },
      { code: "weekly_reliable", name: "Spolehlivý týden", description: "Alespoň 95 % zásilek doručeno včas tento týden", cadence: "weekly" as const, metric: "on_time_ratio", target: 0.95, xpReward: 400, active: true },
      { code: "weekly_pod_pro", name: "POD profesionál", description: "100 % zásilek s dokladem tento týden", cadence: "weekly" as const, metric: "pod_completion_ratio", target: 1, xpReward: 350, active: true },
      { code: "weekly_multi_stop", name: "Mistr tras", description: "Dokonči vícezastávkové trasy tento týden", cadence: "weekly" as const, metric: "multi_stop_routes", adaptiveTargets: [1, 3, 5], xpReward: 350, active: true },
      { code: "weekly_streak", name: "Série aktivity", description: "Buď aktivní alespoň 5 různých dní tento týden", cadence: "weekly" as const, metric: "active_days", target: 5, xpReward: 500, active: true },
      { code: "weekly_no_claim", name: "Bez reklamace", description: "Žádná potvrzená reklamace tento týden", cadence: "weekly" as const, metric: "confirmed_claims", target: 0, minimumWorkload: 5, xpReward: 300, active: true },
      { code: "monthly_volume", name: "Objem zásilek", description: "Dokonči cílový počet zásilek tento měsíc", cadence: "monthly" as const, metric: "rides_completed", adaptiveTargets: [25, 50, 100], xpReward: 1200, active: true },
      { code: "monthly_on_time", name: "Dochvilnost měsíce", description: "95 % včasných doručení při min. 20 zásilkách", cadence: "monthly" as const, metric: "on_time_ratio", target: 0.95, minimumWorkload: 20, xpReward: 1200, active: true },
      { code: "monthly_rating", name: "Zákaznické hodnocení", description: "Průměrné hodnocení min. 4,8 při min. 10 hodnoceních", cadence: "monthly" as const, metric: "average_rating", target: 4.8, minimumRatings: 10, xpReward: 1500, active: true },
      { code: "monthly_success", name: "Úspěšnost doručení", description: "98 % úspěšně dokončených zásilek", cadence: "monthly" as const, metric: "completion_ratio", target: 0.98, minimumWorkload: 20, xpReward: 1500, active: true },
      { code: "monthly_pod", name: "POD měsíce", description: "Kompletní POD u min. 95 % doručení", cadence: "monthly" as const, metric: "pod_completion_ratio", target: 0.95, minimumWorkload: 20, xpReward: 1000, active: true },
    ]
    for (const t of templates) {
      const existing = await ctx.db.query("challengeTemplates").withIndex("by_code", q => q.eq("code", t.code)).first()
      if (!existing) await ctx.db.insert("challengeTemplates", t)
    }

    // Badge definitions
    const badges = [
      { code: "first_delivery", name: "První zásilka", description: "Dokonči první zásilku jako kurýr", category: "delivery", iconKey: "badge-icon-first-delivery", metric: "rides_completed", tiers: { bronze: 1, silver: 10, gold: 50, platinum: 100 }, active: true },
      { code: "always_on_time", name: "Vždy včas", description: "Doručuj zásilky trvale včas", category: "quality", iconKey: "badge-icon-always-on-time", metric: "on_time_deliveries", tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500 }, active: true },
      { code: "pod_professional", name: "POD profesionál", description: "Sbírej kompletní doklady o doručení", category: "quality", iconKey: "badge-icon-pod-professional", metric: "complete_pods", tiers: { bronze: 10, silver: 50, gold: 250, platinum: 1000 }, active: true },
      { code: "multi_stop_master", name: "Mistr vícezastávkových tras", description: "Zvládej vícezastávkové trasy mistrovsky", category: "delivery", iconKey: "badge-icon-multi-stop-master", metric: "multi_stop_routes", tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500 }, active: true },
      { code: "reliable_partner", name: "Spolehlivý partner", description: "Buď pravidelně aktivní jako kurýr", category: "reliability", iconKey: "badge-icon-reliable-partner", metric: "active_days", tiers: { bronze: 7, silver: 30, gold: 180, platinum: 365 }, active: true },
      { code: "gps_guardian", name: "Strážce GPS", description: "Udržuj GPS dostupnou během aktivní směny", category: "reliability", iconKey: "badge-icon-gps-guardian", metric: "days_gps_over_90_percent", tiers: { bronze: 7, silver: 30, gold: 90, platinum: 365 }, active: true },
      { code: "customer_favorite", name: "Oblíbenec zákazníků", description: "Získávej hodnocení 5 hvězd od zákazníků", category: "quality", iconKey: "badge-icon-customer-favorite", metric: "five_star_ratings", tiers: { bronze: 5, silver: 25, gold: 100, platinum: 250 }, active: true },
      { code: "kilometer_hero", name: "Kilometrový hrdina", description: "Najezdí co nejvíce km při aktivních zakázkách", category: "delivery", iconKey: "badge-icon-kilometer-hero", metric: "active_ride_km", tiers: { bronze: 100, silver: 1000, gold: 5000, platinum: 10000 }, active: true },
      { code: "team_player", name: "Týmový hráč", description: "Získej manuální ocenění od dispečera", category: "special", iconKey: "badge-icon-team-player", metric: "dispatcher_team_awards", tiers: { bronze: 1, silver: 5, gold: 15, platinum: 30 }, active: true },
      { code: "perfect_week", name: "Perfektní týden", description: "Splni všechny týdenní výzvy", category: "achievement", iconKey: "badge-icon-perfect-week", metric: "perfect_weeks", tiers: { bronze: 1, silver: 4, gold: 12, platinum: 26 }, active: true },
      { code: "deliveries_250", name: "250 doručení", description: "Dokonči velké množství zásilek", category: "milestone", iconKey: "badge-icon-deliveries-250", metric: "rides_completed", tiers: { bronze: 250, silver: 500, gold: 750, platinum: 1000 }, active: true },
      { code: "k4y_legend", name: "Legenda K4Y", description: "Dosáhni nejvyšších levelů v Kuryr4You", category: "milestone", iconKey: "badge-icon-k4y-legend", metric: "level", tiers: { bronze: 10, silver: 15, gold: 20, platinum: 30 }, active: true },
    ]
    for (const b of badges) {
      const existing = await ctx.db.query("badgeDefinitions").withIndex("by_code", q => q.eq("code", b.code)).first()
      if (!existing) await ctx.db.insert("badgeDefinitions", b)
    }

    console.log("[gamification] seed complete")
    return null
  },
})

// ─── Dispatcher: leaderboard všech řidičů ────────────────────────────────

export const getAllDriversLeaderboard = query({
  args: {},
  returns: v.array(v.object({
    userId: v.id("users"),
    name: v.string(),
    role: v.string(),
    level: v.number(),
    lifetimeXp: v.number(),
    xpInLevel: v.number(),
    xpForNextLevel: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    badgeCount: v.number(),
    pendingLevelUp: v.boolean(),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const caller = await ctx.db.get(authId as Id<"users">)
    if (!caller || caller.role !== "dispatcher") return []

    // Fetch all driver-role users
    const driverRoles = ["driver", "service_driver"] as const
    const drivers: Array<Doc<"users">> = []
    for (const role of driverRoles) {
      const users = await ctx.db.query("users").withIndex("by_role", q => q.eq("role", role)).collect()
      drivers.push(...users)
    }

    const result: Array<{
      userId: Id<"users">; name: string; role: string; level: number
      lifetimeXp: number; xpInLevel: number; xpForNextLevel: number
      currentStreak: number; longestStreak: number; badgeCount: number; pendingLevelUp: boolean
    }> = []
    for (const driver of drivers) {
      const profile = await ctx.db
        .query("driverGamificationProfiles")
        .withIndex("by_driver", q => q.eq("driverId", driver._id))
        .first()

      const badgeCount = profile
        ? (await ctx.db
            .query("driverBadges")
            .withIndex("by_driver", q => q.eq("driverId", driver._id))
            .collect()).length
        : 0

      const level = profile?.level ?? 1
      const lifetimeXp = profile?.lifetimeXp ?? 0
      const xpForCurrentLevel = level > 1 ? LEVEL_COEFFICIENT * (level - 1) * (level - 1) : 0
      const xpForNextLevelTotal = LEVEL_COEFFICIENT * level * level
      const xpInLevel = lifetimeXp - xpForCurrentLevel

      result.push({
        userId: driver._id,
        name: driver.name ?? "Neznámý",
        role: driver.role,
        level,
        lifetimeXp,
        xpInLevel,
        xpForNextLevel: xpForNextLevelTotal - xpForCurrentLevel,
        currentStreak: profile?.currentStreak ?? 0,
        longestStreak: profile?.longestStreak ?? 0,
        badgeCount,
        pendingLevelUp: profile?.pendingLevelUp ?? false,
      })
    }

    // Sort by lifetime XP desc
    result.sort((a, b) => b.lifetimeXp - a.lifetimeXp)
    return result
  },
})

// ─── Internal query: získání dat pro XP výpočet ───────────────────────────

export const getRideForXp = internalQuery({
  args: { rideId: v.id("rides") },
  returns: v.union(
    v.object({
      driverId: v.optional(v.id("users")),
      status: v.string(),
      requestedPickupAt: v.number(),
      requestedDeliveryAt: v.number(),
      podPhotoIds: v.array(v.id("_storage")),
      podSignatureId: v.optional(v.id("_storage")),
      podDeliveredAt: v.optional(v.number()),
      isMultiStop: v.optional(v.boolean()),
      stops: v.optional(v.array(v.any())),
      rating: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId)
    if (!ride) return null
    return {
      driverId: ride.driverId,
      status: ride.status,
      requestedPickupAt: ride.requestedPickupAt,
      requestedDeliveryAt: ride.requestedDeliveryAt,
      podPhotoIds: ride.podPhotoIds,
      podSignatureId: ride.podSignatureId,
      podDeliveredAt: ride.podDeliveredAt,
      isMultiStop: ride.isMultiStop,
      stops: ride.stops,
      rating: ride.rating,
    }
  },
})
