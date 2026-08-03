import { browser } from "wxt/browser";
import type { GetTrip } from "../types/UberApi";
import { LEGACY_TRIP_DATA_STORAGE_KEY, TRIP_DATA_STORAGE_KEY, type StoredTripData } from "./storage";

function isTripRecord(value: unknown): value is GetTrip {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GetTrip>;
  return Boolean(candidate.trip && typeof candidate.trip === "object" && typeof candidate.trip.uuid === "string");
}

function recordsFromMap(value: unknown): GetTrip[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value).filter(isTripRecord);
}

export interface LoadedTripData {
  collectedAt: string | null;
  failedTripCount: number;
  records: GetTrip[];
}

let pendingLoad: Promise<LoadedTripData> | undefined;

async function readTripData(): Promise<LoadedTripData> {
  const stored = await browser.storage.local.get([TRIP_DATA_STORAGE_KEY, LEGACY_TRIP_DATA_STORAGE_KEY]);
  const dataset = stored[TRIP_DATA_STORAGE_KEY] as Partial<StoredTripData> | undefined;

  if (dataset?.version === 2) {
    return {
      collectedAt: typeof dataset.collectedAt === "string" ? dataset.collectedAt : null,
      failedTripCount: typeof dataset.failedTripCount === "number" ? dataset.failedTripCount : 0,
      records: recordsFromMap(dataset.trips),
    };
  }

  return {
    collectedAt: null,
    failedTripCount: 0,
    records: recordsFromMap(stored[LEGACY_TRIP_DATA_STORAGE_KEY]),
  };
}

export function loadTripData(): Promise<LoadedTripData> {
  pendingLoad ??= readTripData();
  return pendingLoad;
}
