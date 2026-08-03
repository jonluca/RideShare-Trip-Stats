import { describe, expect, it } from "vitest";
import type { GetTrip } from "../types/UberApi";
import { mergeTripMaps, tripMapFromUnknown } from "./storage";

function trip(uuid: string, driver: string): GetTrip {
  return { trip: { driver, uuid } } as GetTrip;
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
});
