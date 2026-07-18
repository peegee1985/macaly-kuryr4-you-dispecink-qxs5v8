import { colors } from "../theme";
import type { CargoType, RideStatus } from "../types";

export const rideStatusLabel: Record<RideStatus, string> = {
  pending: "Čeká na schválení",
  approved: "Schváleno",
  assigned: "Přiřazen řidič",
  pickup: "Řidič jede vyzvednout",
  transit: "Zásilka je na cestě",
  delivered: "Doručeno",
  cancelled: "Zrušeno",
  failed: "Nedoručeno",
};

export const rideStatusColor: Record<RideStatus, string> = {
  pending: colors.warning,
  approved: colors.info,
  assigned: "#A78BFA",
  pickup: colors.warning,
  transit: colors.info,
  delivered: colors.success,
  cancelled: colors.textMuted,
  failed: colors.danger,
};

export const cargoLabel: Record<CargoType, string> = {
  envelope: "Obálka",
  parcel: "Balík",
  box: "Krabice",
  pallet: "Paleta",
  other: "Jiné",
};

export function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function formatMoney(value?: number, currency = "CZK") {
  if (value === undefined) return "Cena bude stanovena";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function isActiveRide(status: RideStatus) {
  return ["pending", "approved", "assigned", "pickup", "transit"].includes(status);
}
