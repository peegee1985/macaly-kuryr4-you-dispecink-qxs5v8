// Android GPS chip někdy u fixů nevrátí rychlost (0 nebo undefined) — typicky
// u zařízení s agresivní úsporou baterie. Jako záložní zdroj dopočítáme
// rychlost z posunu mezi dvěma po sobě jdoucími polohami.

const EARTH_RADIUS_M = 6_371_000;
const MIN_INTERVAL_S = 2;
const MAX_INTERVAL_S = 120;
const MIN_DISTANCE_M = 5; // ignorovat šum GPS na místě
const MAX_PLAUSIBLE_SPEED_MS = 60; // ~216 km/h – nad tím jde o chybný fix

export type Fix = { lat: number; lng: number; timestamp: number };

function haversineMeters(a: Fix, b: Fix): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Vrátí rychlost v m/s naměřenou GPS čipem, pokud vypadá důvěryhodně
 * (> 0.5 m/s), jinak ji dopočítá z posunu vůči předchozí poloze.
 */
export function resolveSpeed(
  deviceSpeed: number | null | undefined,
  current: Fix,
  previous: Fix | null,
): number | undefined {
  if (typeof deviceSpeed === "number" && Number.isFinite(deviceSpeed) && deviceSpeed > 0.5) {
    return deviceSpeed;
  }
  if (!previous) return deviceSpeed ?? undefined;

  const elapsedS = (current.timestamp - previous.timestamp) / 1000;
  if (elapsedS < MIN_INTERVAL_S || elapsedS > MAX_INTERVAL_S) return deviceSpeed ?? undefined;

  const distanceM = haversineMeters(previous, current);
  if (distanceM < MIN_DISTANCE_M) return 0;

  const computed = distanceM / elapsedS;
  if (computed > MAX_PLAUSIBLE_SPEED_MS) return deviceSpeed ?? undefined;
  return computed;
}
