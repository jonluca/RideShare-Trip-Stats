import { describe, expect, it } from "vitest";
import type { GetTrip } from "../types/UberApi";
import type { UberEatsOrder } from "../types/UberEats";
import { eatsOrderMapFromUnknown, mergeEatsOrderMaps, mergeTripMaps, tripMapFromUnknown } from "./storage";

function trip(uuid: string, driver: string): GetTrip {
  return { trip: { driver, uuid } } as GetTrip;
}

function order(id: string, restaurantName: string): UberEatsOrder {
  return {
    city: "",
    currency: null,
    id,
    items: [],
    orderedAt: "2024-01-01T00:00:00Z",
    orderPrice: null,
    orderPriceText: "",
    restaurantId: "restaurant-1",
    restaurantName,
    status: "completed",
    territory: "",
  };
}

describe("trip storage migration", () => {
  it("recovers valid records from legacy storage", () => {
    expect(tripMapFromUnknown({ old: trip("2014-trip", "legacy"), invalid: { value: true } })).toEqual({
      "2014-trip": trip("2014-trip", "legacy"),
    });
  });

  it("preserves old trips while newer records win duplicate UUIDs", () => {
    const merged = mergeTripMaps(
      { old: trip("2014-trip", "legacy"), duplicate: trip("same-trip", "old") },
      { recent: trip("2026-trip", "current"), duplicate: trip("same-trip", "new") },
    );

    expect(Object.keys(merged)).toEqual(["2014-trip", "same-trip", "2026-trip"]);
    expect(merged["same-trip"]?.trip.driver).toBe("new");
  });

  it("validates and merges Eats orders by their own IDs", () => {
    expect(eatsOrderMapFromUnknown({ valid: order("order-1", "Old Name"), invalid: { id: "missing-fields" } })).toEqual({
      "order-1": order("order-1", "Old Name"),
    });
    expect(mergeEatsOrderMaps({ old: order("order-1", "Old Name") }, { current: order("order-1", "New Name") })).toEqual({
      "order-1": order("order-1", "New Name"),
    });
  });

  it("keeps unusual imported IDs as data properties", () => {
    const unusualId = "__proto__";
    const merged = mergeEatsOrderMaps(Object.fromEntries([[unusualId, order(unusualId, "Safe Name")]]));

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(Object.hasOwn(merged, unusualId)).toBe(true);
    expect(merged[unusualId]?.restaurantName).toBe("Safe Name");
  });
});
