import type { GetTrip } from "../types/UberApi";

export const TRIP_DATA_STORAGE_KEY = "tripData";
export const LEGACY_TRIP_DATA_STORAGE_KEY = "global";

export interface StoredTripData {
  collectedAt: string;
  failedTripCount: number;
  trips: Record<string, GetTrip>;
  version: 2;
}

export function isTripRecord(value: unknown): value is GetTrip {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GetTrip>;
  return Boolean(candidate.trip && typeof candidate.trip === "object" && typeof candidate.trip.uuid === "string");
}

export function tripMapFromUnknown(value: unknown): Record<string, GetTrip> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries: Array<[string, GetTrip]> = [];
  for (const record of Object.values(value)) {
    if (isTripRecord(record)) {
      entries.push([record.trip.uuid, record]);
    }
  }
  return Object.fromEntries(entries);
}

export function mergeTripMaps(...values: unknown[]): Record<string, GetTrip> {
  return Object.assign({}, ...values.map(tripMapFromUnknown));
}
