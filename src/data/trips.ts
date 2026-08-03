import parseMoney from "../parseMoney";
import type { GetTrip } from "../types/UberApi";
import { convertToUsd } from "../utils/currencies";

export interface NormalizedTrip {
  beginTime: number | null;
  currency: string | null;
  distanceMiles: number | null;
  durationMs: number | null;
  endTime: number | null;
  fareAmount: number | null;
  record: GetTrip;
  status: string;
  usdAmount: number | null;
  uuid: string;
  vehicleType: string;
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseDecimal(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/[+-]?\d[\d.,\s]*/u)?.[0];
  if (!match) {
    return null;
  }

  const compact = match.replace(/\s/g, "");
  const commaIndex = compact.lastIndexOf(",");
  const dotIndex = compact.lastIndexOf(".");
  const separatorIndex = Math.max(commaIndex, dotIndex);
  const decimalDigits = separatorIndex >= 0 ? compact.length - separatorIndex - 1 : 0;
  const normalized =
    separatorIndex >= 0 && decimalDigits > 0 && decimalDigits <= 2
      ? `${compact.slice(0, separatorIndex).replace(/[.,]/g, "")}.${compact.slice(separatorIndex + 1)}`
      : compact.replace(/[.,]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function getDistanceInMiles(distance: string | null | undefined, label: string | null | undefined): number | null {
  const amount = parseDecimal(distance);
  if (amount === null || amount < 0 || !label) {
    return null;
  }

  const unit = label.trim().toLocaleLowerCase();
  if (unit.includes("mile") || unit === "mi") {
    return amount;
  }
  if (unit.includes("kilomet") || unit === "km") {
    return amount * 0.6213711922;
  }

  return null;
}

function getVehicleType(value: string | null | undefined): string {
  const vehicleType = value?.split(":", 1)[0]?.trim();
  return vehicleType || "Unknown";
}

export function normalizeTrip(record: GetTrip): NormalizedTrip {
  const beginTime = parseTimestamp(record.trip.beginTripTime);
  const endTime = parseTimestamp(record.trip.dropoffTime);
  const durationMs = beginTime !== null && endTime !== null && endTime > beginTime ? endTime - beginTime : null;
  const money = parseMoney(record.trip.fare);

  return {
    beginTime,
    currency: money?.currency ?? null,
    distanceMiles: getDistanceInMiles(record.receipt?.distance, record.receipt?.distanceLabel),
    durationMs,
    endTime,
    fareAmount: money?.amount ?? null,
    record,
    status: record.trip.status?.trim().toUpperCase() || "UNKNOWN",
    usdAmount: money ? convertToUsd(money.currency, money.amount) : null,
    uuid: record.trip.uuid,
    vehicleType: getVehicleType(record.trip.vehicleDisplayName || record.receipt?.vehicleType),
  };
}

export function normalizeTrips(records: readonly GetTrip[]): NormalizedTrip[] {
  return records.map(normalizeTrip);
}
