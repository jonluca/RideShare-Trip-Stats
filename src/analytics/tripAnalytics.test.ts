import { describe, expect, it } from "vitest";
import type { GetTrip } from "../types/UberApi";
import { normalizeTrips } from "../data/trips";
import { calculateTripAnalytics } from "./tripAnalytics";

function tripRecord(
  uuid: string,
  options: {
    begin: string;
    distance?: string;
    distanceLabel?: string;
    dropoff: string;
    fare: string;
    status?: string;
  },
): GetTrip {
  return {
    __typename: "GetTrip",
    concierge: null,
    mapURL: "",
    organization: null,
    polandTaxiLicense: "",
    rating: "5",
    receipt: {
      __typename: "Receipt",
      carYear: "2024",
      distance: options.distance ?? "10",
      distanceLabel: options.distanceLabel ?? "miles",
      duration: "",
      vehicleType: "UberX",
    },
    reviewer: "",
    trip: {
      __typename: "Trip",
      beginTripTime: options.begin,
      cityID: 1,
      countryID: 1,
      disableCanceling: false,
      disableRating: false,
      disableResendReceipt: false,
      driver: "",
      dropoffTime: options.dropoff,
      fare: options.fare,
      guest: "",
      isRidepoolTrip: false,
      isScheduledRide: false,
      isSurgeTrip: false,
      isUberReserve: false,
      jobUUID: uuid,
      marketplace: "",
      paymentProfileUUID: "",
      showRating: true,
      status: options.status ?? "COMPLETED",
      uuid,
      vehicleDisplayName: "UberX: Economy",
      vehicleViewID: 1,
      waypoints: [],
    },
  };
}

describe("calculateTripAnalytics", () => {
  it("uses valid intervals and paid fares for averages", () => {
    const trips = normalizeTrips([
      tripRecord("first", {
        begin: "2024-01-01T10:00:00Z",
        dropoff: "2024-01-01T10:30:00Z",
        fare: "$10.00",
      }),
      tripRecord("second", {
        begin: "2024-01-11T10:00:00Z",
        dropoff: "2024-01-11T09:30:00Z",
        fare: "$20.00",
        status: "CANCELED",
      }),
    ]);

    const analytics = calculateTripAnalytics(trips);

    expect(analytics.totalTrips).toBe(2);
    expect(analytics.completedTrips).toBe(1);
    expect(analytics.cancelledTrips).toBe(1);
    expect(analytics.averageDaysBetweenTrips).toBeCloseTo(10);
    expect(analytics.averageFareUsd).toBeCloseTo(15);
    expect(analytics.totalDurationMs).toBe(30 * 60 * 1000);
    expect(analytics.shortestTrip?.uuid).toBe("first");
    expect(analytics.longestTrip?.uuid).toBe("first");
  });

  it("normalizes kilometers and groups native currencies", () => {
    const analytics = calculateTripAnalytics(
      normalizeTrips([
        tripRecord("cad", {
          begin: "2025-04-01T10:00:00Z",
          distance: "10,5",
          distanceLabel: "kilometers",
          dropoff: "2025-04-01T11:00:00Z",
          fare: "CA$25.50",
        }),
      ]),
    );

    expect(analytics.totalDistanceMiles).toBeCloseTo(6.524, 2);
    expect(analytics.currencyTotals).toMatchObject([{ amount: 25.5, currency: "CAD" }]);
    expect(analytics.vehicleTypes).toEqual([{ count: 1, label: "UberX" }]);
  });
});
