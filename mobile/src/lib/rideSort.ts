import type { Ride, RideStatus } from "../types";

const ACTIVE_STATUS_PRIORITY: Partial<Record<RideStatus, number>> = {
  transit: 0,
  pickup: 1,
  assigned: 2,
  approved: 3,
  pending: 4,
};

function activePriority(status: RideStatus) {
  return ACTIVE_STATUS_PRIORITY[status] ?? Number.MAX_SAFE_INTEGER;
}

export function sortActiveRides(rides: Ride[]) {
  return [...rides].sort((a, b) => {
    const statusDifference = activePriority(a.status) - activePriority(b.status);
    if (statusDifference !== 0) return statusDifference;
    return a.requestedPickupAt - b.requestedPickupAt;
  });
}

export function sortAvailableRides(rides: Ride[]) {
  return [...rides].sort((a, b) => a.requestedPickupAt - b.requestedPickupAt);
}

export function sortRideHistory(rides: Ride[]) {
  return [...rides].sort((a, b) => {
    const aCompletedAt = a.podDeliveredAt ?? a.requestedDeliveryAt;
    const bCompletedAt = b.podDeliveredAt ?? b.requestedDeliveryAt;
    return bCompletedAt - aCompletedAt;
  });
}
