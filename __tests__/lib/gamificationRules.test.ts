import { describe, expect, it } from "vitest"

import {
  badgeEventKey,
  levelFromXp,
  periodBounds,
  periodKey,
  titleForLevel,
  xpForLevel,
} from "../../convex/gamification"

describe("gamification rules", () => {
  it("uses the quadratic level curve with a hard cap", () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(250)
    expect(xpForLevel(10)).toBe(20_250)
    expect(levelFromXp(249)).toBe(1)
    expect(levelFromXp(250)).toBe(2)
    expect(levelFromXp(Number.MAX_SAFE_INTEGER)).toBe(30)
  })

  it("maps level titles at their boundaries", () => {
    expect(titleForLevel(1)).toBe("Nováček")
    expect(titleForLevel(10)).toBe("Zkušený kurýr")
    expect(titleForLevel(30)).toBe("Legenda K4Y")
  })

  it("keeps badge idempotency scoped to each driver", () => {
    expect(badgeEventKey("driver-a", "first_delivery", "bronze"))
      .toBe("badge:driver-a:first_delivery:bronze")
    expect(badgeEventKey("driver-a", "first_delivery", "bronze"))
      .not.toBe(badgeEventKey("driver-b", "first_delivery", "bronze"))
  })

  it("uses Prague calendar periods", () => {
    const sunday = Date.UTC(2026, 6, 19, 12)
    expect(periodKey("daily", sunday)).toBe("2026-07-19")
    expect(periodKey("weekly", sunday)).toBe("2026-W29")
    expect(periodKey("monthly", sunday)).toBe("2026-07")

    expect(periodBounds("daily", sunday)).toEqual({
      startsAt: Date.UTC(2026, 6, 18, 22),
      expiresAt: Date.UTC(2026, 6, 19, 22),
    })
  })

  it("handles the 25-hour DST change day", () => {
    const dstSunday = Date.UTC(2026, 9, 25, 12)
    const bounds = periodBounds("daily", dstSunday)
    expect(bounds.expiresAt - bounds.startsAt).toBe(25 * 60 * 60 * 1000)
  })
})
