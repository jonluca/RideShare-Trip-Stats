import { browser } from "wxt/browser";
import type { GetTrip } from "../types/UberApi";
import { LEGACY_TRIP_DATA_STORAGE_KEY, mergeTripMaps, TRIP_DATA_STORAGE_KEY, type StoredTripData } from "./storage";

export interface LoadedTripData {
  collectedAt: string | null;
  failedTripCount: number;
  records: GetTrip[];
}

let pendingLoad: Promise<LoadedTripData> | undefined;

async function readTripData(): Promise<LoadedTripData> {
  const stored = await browser.storage.local.get([TRIP_DATA_STORAGE_KEY, LEGACY_TRIP_DATA_STORAGE_KEY]);
  const dataset = stored[TRIP_DATA_STORAGE_KEY] as Partial<StoredTripData> | undefined;
  const records = Object.values(mergeTripMaps(stored[LEGACY_TRIP_DATA_STORAGE_KEY], dataset?.version === 2 ? dataset.trips : undefined));

  if (dataset?.version === 2) {
    return {
      collectedAt: typeof dataset.collectedAt === "string" ? dataset.collectedAt : null,
      failedTripCount: typeof dataset.failedTripCount === "number" ? dataset.failedTripCount : 0,
      records,
    };
  }

  return {
    collectedAt: null,
    failedTripCount: 0,
    records,
  };
}

export function loadTripData(): Promise<LoadedTripData> {
  pendingLoad ??= readTripData();
  return pendingLoad;
}

function tripIdentity(record: GetTrip): string {
  const timestamp = Date.parse(record.trip.beginTripTime || "");
  return Number.isFinite(timestamp) ? `time:${timestamp}` : `uuid:${record.trip.uuid}`;
}

export interface MergeTripRecordsResult {
  added: number;
  data: LoadedTripData;
  duplicates: number;
  total: number;
}

export async function mergeTripRecords(records: readonly GetTrip[]): Promise<MergeTripRecordsResult> {
  const existing = await readTripData();
  const tripMap = Object.fromEntries(existing.records.map((record) => [record.trip.uuid, record]));
  const identities = new Set(existing.records.map(tripIdentity));
  let added = 0;

  for (const record of records) {
    const identity = tripIdentity(record);
    if (tripMap[record.trip.uuid] || identities.has(identity)) {
      continue;
    }
    tripMap[record.trip.uuid] = record;
    identities.add(identity);
    added++;
  }

  await browser.storage.local.set({
    [TRIP_DATA_STORAGE_KEY]: {
      collectedAt: existing.collectedAt ?? new Date().toISOString(),
      failedTripCount: existing.failedTripCount,
      trips: tripMap,
      version: 2,
    } satisfies StoredTripData,
  });

  pendingLoad = undefined;
  const data = await loadTripData();
  return { added, data, duplicates: records.length - added, total: data.records.length };
}
