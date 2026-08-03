import type { NormalizedTrip } from "./trips";

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function tripsToCsv(trips: readonly NormalizedTrip[]): string {
  const headers = [
    "uuid",
    "status",
    "begin_time",
    "dropoff_time",
    "duration_minutes",
    "fare_original",
    "currency",
    "fare_amount",
    "estimated_usd",
    "distance_original",
    "distance_unit",
    "distance_miles",
    "vehicle_type",
    "city_id",
    "country_id",
    "rating",
    "surge",
    "pool",
    "scheduled",
    "reserve",
  ];

  const rows = trips.map((trip) => {
    const { record } = trip;
    return [
      trip.uuid,
      trip.status,
      record.trip.beginTripTime,
      record.trip.dropoffTime,
      trip.durationMs === null ? null : trip.durationMs / 60_000,
      record.trip.fare,
      trip.currency,
      trip.fareAmount,
      trip.usdAmount,
      record.receipt?.distance,
      record.receipt?.distanceLabel,
      trip.distanceMiles,
      trip.vehicleType,
      record.trip.cityID,
      record.trip.countryID,
      record.rating,
      record.trip.isSurgeTrip,
      record.trip.isRidepoolTrip,
      record.trip.isScheduledRide,
      record.trip.isUberReserve,
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
