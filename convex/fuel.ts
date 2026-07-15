import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

// TTL: stations cache 12h, prices cache 2h, history cache 6h, CNB rate 4h
const STATIONS_TTL = 12 * 60 * 60 * 1000
const PRICES_TTL = 2 * 60 * 60 * 1000
const HISTORY_TTL = 6 * 60 * 60 * 1000
const CNB_RATE_TTL = 4 * 60 * 60 * 1000

const DEFAULT_EUR_RATE = 25.2

/**
 * Return cached fuel data from DB.
 * Returns null for any missing or stale cache bucket.
 */
export const getFuelData = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    const stationsRow = await ctx.db
      .query("fuelCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", "stations"))
      .first()
    const pricesRow = await ctx.db
      .query("fuelCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", "prices"))
      .first()
    const historyRow = await ctx.db
      .query("fuelCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", "history"))
      .first()

    const stations =
      stationsRow && now - stationsRow.fetchedAt < STATIONS_TTL
        ? (JSON.parse(stationsRow.data) as GasStation[])
        : null

    const prices =
      pricesRow && now - pricesRow.fetchedAt < PRICES_TTL
        ? (JSON.parse(pricesRow.data) as FuelPrices)
        : null

    const history =
      historyRow && now - historyRow.fetchedAt < HISTORY_TTL
        ? (JSON.parse(historyRow.data) as HistoryPoint[])
        : null

    return {
      stations,
      prices,
      history,
      stationsAge: stationsRow ? now - stationsRow.fetchedAt : null,
      pricesAge: pricesRow ? now - pricesRow.fetchedAt : null,
    }
  },
})

// ─── Fuel settings (EUR rate mode) ─────────────────────────────────────────

export const getFuelSettings = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("fuelSettings").first()
    if (!row) {
      return {
        eurRateMode: "auto" as const,
        eurRateManual: null,
        eurRateCnb: null,
        cnbFetchedAt: null,
        effectiveRate: DEFAULT_EUR_RATE,
      }
    }
    const effectiveRate =
      row.eurRateMode === "manual" && row.eurRateManual
        ? row.eurRateManual
        : (row.eurRateCnb ?? DEFAULT_EUR_RATE)
    return {
      eurRateMode: row.eurRateMode,
      eurRateManual: row.eurRateManual ?? null,
      eurRateCnb: row.eurRateCnb ?? null,
      cnbFetchedAt: row.cnbFetchedAt ?? null,
      effectiveRate,
    }
  },
})

export const saveFuelSettings = mutation({
  args: {
    eurRateMode: v.union(v.literal("auto"), v.literal("manual")),
    eurRateManual: v.optional(v.number()),
  },
  handler: async (ctx, { eurRateMode, eurRateManual }) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nepřihlášen")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nedostatečná oprávnění")

    const existing = await ctx.db.query("fuelSettings").first()
    if (existing) {
      await ctx.db.patch(existing._id, {
        eurRateMode,
        eurRateManual,
      })
    } else {
      await ctx.db.insert("fuelSettings", {
        eurRateMode,
        eurRateManual,
      })
    }
    console.log("[fuel] Settings saved:", { eurRateMode, eurRateManual })
  },
})

export const updateCnbRate = internalMutation({
  args: { rate: v.number() },
  handler: async (ctx, { rate }) => {
    const existing = await ctx.db.query("fuelSettings").first()
    if (existing) {
      await ctx.db.patch(existing._id, {
        eurRateCnb: rate,
        cnbFetchedAt: Date.now(),
      })
    } else {
      await ctx.db.insert("fuelSettings", {
        eurRateMode: "auto",
        eurRateCnb: rate,
        cnbFetchedAt: Date.now(),
      })
    }
    console.log("[fuel] CNB EUR/CZK rate updated:", rate)
  },
})

// ─── Admin info query ───────────────────────────────────────────────────────

export const getFuelAdminInfo = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    const stationsRow = await ctx.db
      .query("fuelCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", "stations"))
      .first()
    const pricesRow = await ctx.db
      .query("fuelCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", "prices"))
      .first()
    const settingsRow = await ctx.db.query("fuelSettings").first()

    const stationsAge = stationsRow ? now - stationsRow.fetchedAt : null
    const pricesAge = pricesRow ? now - pricesRow.fetchedAt : null
    const cnbAge = settingsRow?.cnbFetchedAt ? now - settingsRow.cnbFetchedAt : null

    const stationsCount = stationsRow
      ? (JSON.parse(stationsRow.data) as GasStation[]).length
      : 0
    const fuelCount = stationsRow
      ? (JSON.parse(stationsRow.data) as GasStation[]).filter((s) => s.type === "fuel").length
      : 0
    const evCount = stationsRow
      ? (JSON.parse(stationsRow.data) as GasStation[]).filter((s) => s.type === "ev").length
      : 0

    return {
      stationsAge,
      pricesAge,
      cnbAge,
      stationsCount,
      fuelCount,
      evCount,
      stationsFresh: stationsAge !== null && stationsAge < STATIONS_TTL,
      pricesFresh: pricesAge !== null && pricesAge < PRICES_TTL,
      cnbFresh: cnbAge !== null && cnbAge < CNB_RATE_TTL,
      eurRateMode: settingsRow?.eurRateMode ?? "auto",
      eurRateManual: settingsRow?.eurRateManual ?? null,
      eurRateCnb: settingsRow?.eurRateCnb ?? null,
      cnbFetchedAt: settingsRow?.cnbFetchedAt ?? null,
      effectiveRate:
        settingsRow?.eurRateMode === "manual" && settingsRow?.eurRateManual
          ? settingsRow.eurRateManual
          : (settingsRow?.eurRateCnb ?? DEFAULT_EUR_RATE),
    }
  },
})

// ─── CNB exchange rate refresh ──────────────────────────────────────────────

/**
 * Fetches EUR/CZK rate from Czech National Bank (ČNB) official daily rate file.
 * Free, no API key required. Updated daily by ČNB.
 */
export const refreshCnbRate = action({
  args: {},
  handler: async (ctx) => {
    console.log("[fuel] Fetching EUR/CZK rate from ČNB")
    try {
      const res = await fetch(
        "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt"
      )
      if (!res.ok) throw new Error(`ČNB HTTP ${res.status}`)
      const text = await res.text()

      // Format: lines like "EMU|euro|1|EUR|25,160"
      // Find EUR line and parse rate
      const lines = text.split("\n")
      let eurRate: number | null = null
      for (const line of lines) {
        const parts = line.trim().split("|")
        if (parts.length >= 5 && parts[3] === "EUR") {
          const amountStr = parts[2]
          const rateStr = parts[4].replace(",", ".")
          const amount = parseFloat(amountStr)
          const rate = parseFloat(rateStr)
          if (!isNaN(rate) && !isNaN(amount) && amount > 0) {
            eurRate = Math.round((rate / amount) * 1000) / 1000
          }
          break
        }
      }

      if (!eurRate) throw new Error("EUR řádek nenalezen v datech ČNB")

      console.log(`[fuel] ČNB EUR/CZK rate: ${eurRate}`)
      await ctx.runMutation(internal.fuel.updateCnbRate, { rate: eurRate })
      return { success: true, rate: eurRate }
    } catch (err) {
      console.error("[fuel] ČNB fetch failed:", err)
      return { success: false, error: String(err) }
    }
  },
})

/**
 * Refresh all fuel data:
 * 1. OSM Overpass — gas stations + EV chargers in Prague bounding box
 * 2. OilPriceAPI — CZ diesel + petrol weekly averages (requires OILPRICE_API_KEY)
 * 3. OilPriceAPI — 10-week price history
 */
export const refreshFuelData = action({
  args: {},
  handler: async (ctx) => {
    console.log("[fuel] Starting fuel data refresh")

    // ─── 0. Get effective EUR rate ─────────────────────────────────────────
    const settings = await ctx.runQuery(internal.fuel.getSettingsInternal)
    const EUR_RATE = settings?.effectiveRate ?? DEFAULT_EUR_RATE
    console.log(`[fuel] Using EUR/CZK rate: ${EUR_RATE}`)

    // ─── 1. OSM Gas Stations ───────────────────────────────────────────────
    const overpassQuery = `
      [out:json][timeout:30];
      (
        node["amenity"="fuel"](49.94,14.22,50.18,14.71);
        way["amenity"="fuel"](49.94,14.22,50.18,14.71);
        node["amenity"="charging_station"](49.94,14.22,50.18,14.71);
      );
      out center tags;
    `
    try {
      const osmRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: overpassQuery }),
      })
      const osmJson = await osmRes.json()
      console.log(`[fuel] OSM returned ${osmJson.elements?.length ?? 0} elements`)

      const stations: GasStation[] = (osmJson.elements ?? [])
        .map((el: OsmElement) => ({
          id: el.id,
          lat: el.lat ?? el.center?.lat ?? 0,
          lng: el.lon ?? el.center?.lon ?? 0,
          name: el.tags?.name ?? el.tags?.brand ?? "Čerpací stanice",
          brand: el.tags?.brand ?? null,
          type: el.tags?.amenity === "charging_station" ? "ev" : "fuel",
          operator: el.tags?.operator ?? null,
          fuelTypes: Object.keys(el.tags ?? {})
            .filter((k) => k.startsWith("fuel:"))
            .map((k) => k.replace("fuel:", "")),
        }))
        .filter((s: GasStation) => s.lat !== 0 && s.lng !== 0)

      await ctx.runMutation(internal.fuel.upsertCache, {
        cacheKey: "stations",
        data: JSON.stringify(stations),
      })
      console.log(`[fuel] Stored ${stations.length} stations`)
    } catch (err) {
      console.error("[fuel] OSM fetch failed:", err)
    }

    // ─── 2 & 3. OilPriceAPI (requires API key) ────────────────────────────
    const apiKey = process.env.OILPRICE_API_KEY
    if (!apiKey) {
      console.log("[fuel] OILPRICE_API_KEY not set — skipping price fetch")
      return
    }

    const headers = {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    }

    // Current prices
    try {
      const [dieselRes, petrolRes] = await Promise.all([
        fetch(
          "https://api.oilpriceapi.com/v1/prices/latest?by_code=DIESEL_RETAIL_CZ_EUR",
          { headers }
        ),
        fetch(
          "https://api.oilpriceapi.com/v1/prices/latest?by_code=GASOLINE_RETAIL_CZ_EUR",
          { headers }
        ),
      ])
      const [dieselJson, petrolJson] = await Promise.all([
        dieselRes.json(),
        petrolRes.json(),
      ])

      const prices: FuelPrices = {
        dieselEur: dieselJson.data?.price ?? null,
        petrolEur: petrolJson.data?.price ?? null,
        dieselCzk: dieselJson.data?.price
          ? Math.round(dieselJson.data.price * EUR_RATE * 10) / 10
          : null,
        petrolCzk: petrolJson.data?.price
          ? Math.round(petrolJson.data.price * EUR_RATE * 10) / 10
          : null,
        updatedAt: Date.now(),
        eurRate: EUR_RATE,
      }
      console.log("[fuel] Prices fetched:", prices)

      await ctx.runMutation(internal.fuel.upsertCache, {
        cacheKey: "prices",
        data: JSON.stringify(prices),
      })
    } catch (err) {
      console.error("[fuel] Price fetch failed:", err)
    }

    // History not available on current OilPriceAPI plan — skipped
  },
})

// ─── Internal helpers ───────────────────────────────────────────────────────

export const getSettingsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("fuelSettings").first()
    if (!row) return { effectiveRate: DEFAULT_EUR_RATE }
    return {
      effectiveRate:
        row.eurRateMode === "manual" && row.eurRateManual
          ? row.eurRateManual
          : (row.eurRateCnb ?? DEFAULT_EUR_RATE),
    }
  },
})

export const upsertCache = internalMutation({
  args: { cacheKey: v.string(), data: v.string() },
  handler: async (ctx, { cacheKey, data }) => {
    const existing = await ctx.db
      .query("fuelCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { data, fetchedAt: Date.now() })
    } else {
      await ctx.db.insert("fuelCache", { cacheKey, data, fetchedAt: Date.now() })
    }
  },
})

// ─── TypeScript types ──────────────────────────────────────────────────────
interface GasStation {
  id: number
  lat: number
  lng: number
  name: string
  brand: string | null
  type: "fuel" | "ev"
  operator: string | null
  fuelTypes: string[]
}

interface FuelPrices {
  dieselEur: number | null
  petrolEur: number | null
  dieselCzk: number | null
  petrolCzk: number | null
  updatedAt: number
  eurRate?: number
}

interface HistoryPoint {
  date: string
  diesel: number
}

interface OsmElement {
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}
