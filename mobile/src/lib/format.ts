import type { RideStatus } from "../types";
import { colors } from "../theme";

export const rideStatusLabel: Record<RideStatus, string> = {
  pending: "Čeká na schválení",
  approved: "Volná",
  assigned: "Přiřazena",
  pickup: "Vyzvednutí",
  transit: "Na cestě",
  delivered: "Doručena",
  cancelled: "Zrušena",
  failed: "Nedoručena",
};

export const rideStatusColor: Record<RideStatus, string> = {
  pending: colors.textMuted,
  approved: colors.info,
  assigned: "#A78BFA",
  pickup: colors.warning,
  transit: colors.info,
  delivered: colors.success,
  cancelled: colors.textMuted,
  failed: colors.danger,
};

export const visitStatusLabel: Record<string, string> = {
  scheduled: "Naplánováno",
  assigned: "Přiřazeno",
  accepted: "Přijato",
  en_route: "Na cestě",
  in_progress: "Probíhá",
  completed: "Dokončeno",
  cancelled: "Zrušeno",
  incident: "Incident",
};

export function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("cs-CZ", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).format(new Date(timestamp));
}

export function formatMoney(value?: number, currency = "CZK") {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
