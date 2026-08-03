import { describe, expect, it } from "vitest";
import type { NormalizedTrip } from "./trips";
import { tripsToCsv } from "./exportTrips";

describe("tripsToCsv", () => {
  it("escapes user-facing fields and exports normalized values", () => {
    const trip = {
      beginTime: 0,
      currency: "USD",
      distanceMiles: 1.5,
      durationMs: 600_000,
      endTime: 600_000,
      fareAmount: 12.5,
      record: {
        rating: "5",
        receipt: { distance: "1.5", distanceLabel: "miles" },
        trip: {
          beginTripTime: "2024-01-01",
          cityID: 1,
          countryID: 1,
          dropoffTime: "2024-01-01",
          fare: "$12.50",
          isRidepoolTrip: false,
          isScheduledRide: false,
          isSurgeTrip: false,
          isUberReserve: false,
        },
      },
      status: "COMPLETED",
      usdAmount: 12.5,
      uuid: "trip,one",
      vehicleType: "UberX",
    } as NormalizedTrip;

    const csv = tripsToCsv([trip]);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain('"trip,one"');
    expect(csv).toContain(",10,$12.50,USD,12.5,12.5,");
  });
});
