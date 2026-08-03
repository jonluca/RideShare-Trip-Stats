import type { GetTrip } from "../types/UberApi";

export const TRIP_DATA_STORAGE_KEY = "tripData";
export const LEGACY_TRIP_DATA_STORAGE_KEY = "global";

export interface StoredTripData {
  collectedAt: string;
  failedTripCount: number;
  trips: Record<string, GetTrip>;
  version: 2;
}
