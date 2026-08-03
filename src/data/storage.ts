import type { GetTrip } from "../types/UberApi";
import type { UberEatsOrder, UberEatsRestaurant } from "../types/UberEats";

export const TRIP_DATA_STORAGE_KEY = "tripData";
export const LEGACY_TRIP_DATA_STORAGE_KEY = "global";
export const EATS_DATA_STORAGE_KEY = "eatsData";

export interface StoredTripData {
  collectedAt: string;
  failedTripCount: number;
  trips: Record<string, GetTrip>;
  version: 2;
}

export interface StoredEatsData {
  importedAt?: string;
  orders: Record<string, UberEatsOrder>;
  restaurants: Record<string, UberEatsRestaurant>;
  version: 1;
  webCollectedAt?: string;
  webHistoryComplete?: boolean;
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
  return Object.fromEntries(values.flatMap((value) => Object.entries(tripMapFromUnknown(value))));
}

export function isUberEatsOrder(value: unknown): value is UberEatsOrder {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<UberEatsOrder>;
  return Boolean(
    typeof candidate.id === "string" &&
    typeof candidate.orderedAt === "string" &&
    typeof candidate.restaurantName === "string" &&
    Array.isArray(candidate.items),
  );
}

export function eatsOrderMapFromUnknown(value: unknown): Record<string, UberEatsOrder> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const entries: Array<[string, UberEatsOrder]> = [];
  for (const record of Object.values(value)) {
    if (isUberEatsOrder(record)) {
      entries.push([record.id, record]);
    }
  }
  return Object.fromEntries(entries);
}

export function mergeEatsOrderMaps(...values: unknown[]): Record<string, UberEatsOrder> {
  return Object.fromEntries(values.flatMap((value) => Object.entries(eatsOrderMapFromUnknown(value))));
}

export function restaurantMapFromUnknown(value: unknown): Record<string, UberEatsRestaurant> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const entries: Array<[string, UberEatsRestaurant]> = [];
  for (const restaurant of Object.values(value)) {
    if (
      restaurant &&
      typeof restaurant === "object" &&
      typeof (restaurant as UberEatsRestaurant).id === "string" &&
      typeof (restaurant as UberEatsRestaurant).name === "string"
    ) {
      const record = restaurant as UberEatsRestaurant;
      entries.push([record.id, record]);
    }
  }
  return Object.fromEntries(entries);
}
