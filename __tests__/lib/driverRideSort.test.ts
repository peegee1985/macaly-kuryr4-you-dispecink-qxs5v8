import { describe, expect, it } from "vitest";

import {
  sortActiveRides,
  sortAvailableRides,
  sortRideHistory,
} from "../../mobile/src/lib/rideSort";
import type { Ride, RideStatus } from "../../mobile/src/types";

function ride(id: string, status: RideStatus, pickupAt: number, deliveryAt = pickupAt + 1): Ride {
  return {
    _id: id,
    rideNumber: id,
    status,
    pickupAddress: "A",
    deliveryAddress: "B",
    requestedPickupAt: pickupAt,
    requestedDeliveryAt: deliveryAt,
  };
}

describe("driver ride sorting", () => {
  it("puts an in-progress ride before assigned rides, then sorts by nearest pickup", () => {
    const result = sortActiveRides([
      ride("assigned-soon", "assigned", 10),
      ride("transit", "transit", 30),
      ride("assigned-later", "assigned", 20),
      ride("pickup", "pickup", 40),
    ]);

    expect(result.map((item) => item._id)).toEqual([
      "transit",
      "pickup",
      "assigned-soon",
      "assigned-later",
    ]);
  });

  it("sorts available rides by nearest realization date", () => {
    const result = sortAvailableRides([
      ride("later", "approved", 20),
      ride("overdue", "approved", 5),
      ride("soon", "approved", 10),
    ]);

    expect(result.map((item) => item._id)).toEqual(["overdue", "soon", "later"]);
  });

  it("sorts history by actual POD time when available", () => {
    const older = ride("older", "delivered", 1, 30);
    older.podDeliveredAt = 50;
    const newer = ride("newer", "delivered", 2, 20);
    newer.podDeliveredAt = 80;

    expect(sortRideHistory([older, newer]).map((item) => item._id)).toEqual([
      "newer",
      "older",
    ]);
  });
});
