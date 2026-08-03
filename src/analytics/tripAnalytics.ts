import type { NormalizedTrip } from "../data/trips";
import { convertToUsd, exchangeRateDate } from "../utils/currencies";

const DAY_MS = 86_400_000;
const MONTH_DAYS = 30.4375;

export interface CountedValue {
  count: number;
  label: string;
}

export interface CurrencyTotal {
  amount: number;
  currency: string;
  usdAmount: number | null;
}

export interface TripExtreme {
  uuid: string;
  value: number;
}

export interface YearActivity {
  rides: number;
  usdSpent: number;
  year: number;
}

export interface TripAnalytics {
  activeDays: number;
  averageDaysBetweenTrips: number | null;
  averageDistanceMiles: number | null;
  averageDurationMs: number | null;
  averageFareUsd: number | null;
  averageTripsPerMonth: number | null;
  busiestMonth: CountedValue | null;
  busiestWeekday: CountedValue | null;
  cancelledTrips: number;
  completedTrips: number;
  completionRate: number | null;
  convertedFareCount: number;
  currencyTotals: CurrencyTotal[];
  dateSpanDays: number;
  distanceTripCount: number;
  exchangeRateDate: string;
  firstTripTime: number | null;
  flags: {
    pool: number;
    reserve: number;
    scheduled: number;
    surge: number;
  };
  lastTripTime: number | null;
  longestTrip: TripExtreme | null;
  maxFare: TripExtreme | null;
  minFare: TripExtreme | null;
  otherTrips: number;
  paidTripCount: number;
  shortestTrip: TripExtreme | null;
  statusCounts: CountedValue[];
  totalDistanceMiles: number;
  totalDurationMs: number;
  totalTrips: number;
  totalUsd: number;
  unconvertedCurrencies: string[];
  vehicleTypes: CountedValue[];
  yearlyActivity: YearActivity[];
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function topCount(map: Map<string, number>, labelForKey: (key: string) => string): CountedValue | null {
  let result: CountedValue | null = null;
  for (const [key, count] of map) {
    if (!result || count > result.count) {
      result = { count, label: labelForKey(key) };
    }
  }
  return result;
}

function sortedCounts(map: Map<string, number>): CountedValue[] {
  return [...map.entries()]
    .map(([label, count]) => ({ count, label }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(year!, month! - 1, 1));
}

export function calculateTripAnalytics(trips: readonly NormalizedTrip[]): TripAnalytics {
  const activeDateKeys = new Set<string>();
  const currencies = new Map<string, number>();
  const months = new Map<string, number>();
  const statuses = new Map<string, number>();
  const unconvertedCurrencies = new Set<string>();
  const vehicles = new Map<string, number>();
  const weekdays = new Map<string, number>();
  const years = new Map<number, { rides: number; usdSpent: number }>();

  let cancelledTrips = 0;
  let completedTrips = 0;
  let convertedFareCount = 0;
  let datedTripCount = 0;
  let distanceTripCount = 0;
  let firstTripTime: number | null = null;
  let lastTripTime: number | null = null;
  let longestTrip: TripExtreme | null = null;
  let maxFare: TripExtreme | null = null;
  let minFare: TripExtreme | null = null;
  let otherTrips = 0;
  let paidTripCount = 0;
  let shortestTrip: TripExtreme | null = null;
  let totalDistanceMiles = 0;
  let totalDurationMs = 0;
  let timedTripCount = 0;
  let totalUsd = 0;
  const flags = { pool: 0, reserve: 0, scheduled: 0, surge: 0 };

  for (const trip of trips) {
    increment(statuses, trip.status);
    increment(vehicles, trip.vehicleType);

    if (trip.status === "COMPLETED") {
      completedTrips++;
    } else if (trip.status.includes("CANCEL")) {
      cancelledTrips++;
    } else {
      otherTrips++;
    }

    if (trip.record.trip.isRidepoolTrip) {
      flags.pool++;
    }
    if (trip.record.trip.isUberReserve) {
      flags.reserve++;
    }
    if (trip.record.trip.isScheduledRide) {
      flags.scheduled++;
    }
    if (trip.record.trip.isSurgeTrip) {
      flags.surge++;
    }

    if (trip.beginTime !== null) {
      const date = new Date(trip.beginTime);
      const year = date.getFullYear();
      datedTripCount++;
      activeDateKeys.add(toDateKey(date));
      increment(months, toMonthKey(date));
      increment(weekdays, String(date.getDay()));
      const yearActivity = years.get(year) ?? { rides: 0, usdSpent: 0 };
      yearActivity.rides++;
      years.set(year, yearActivity);
      firstTripTime = firstTripTime === null ? trip.beginTime : Math.min(firstTripTime, trip.beginTime);
      lastTripTime = lastTripTime === null ? trip.beginTime : Math.max(lastTripTime, trip.beginTime);
    }

    if (trip.durationMs !== null) {
      totalDurationMs += trip.durationMs;
      timedTripCount++;
      if (!shortestTrip || trip.durationMs < shortestTrip.value) {
        shortestTrip = { uuid: trip.uuid, value: trip.durationMs };
      }
      if (!longestTrip || trip.durationMs > longestTrip.value) {
        longestTrip = { uuid: trip.uuid, value: trip.durationMs };
      }
    }

    if (trip.distanceMiles !== null) {
      totalDistanceMiles += trip.distanceMiles;
      distanceTripCount++;
    }

    if (trip.currency && trip.fareAmount !== null) {
      increment(currencies, trip.currency, trip.fareAmount);
      if (trip.fareAmount !== 0) {
        paidTripCount++;
      }

      if (trip.usdAmount !== null) {
        totalUsd += trip.usdAmount;
        if (trip.fareAmount !== 0) {
          convertedFareCount++;
        }

        if (trip.beginTime !== null) {
          const year = new Date(trip.beginTime).getFullYear();
          const yearActivity = years.get(year)!;
          yearActivity.usdSpent += trip.usdAmount;
        }

        if (trip.usdAmount > 0) {
          if (!minFare || trip.usdAmount < minFare.value) {
            minFare = { uuid: trip.uuid, value: trip.usdAmount };
          }
          if (!maxFare || trip.usdAmount > maxFare.value) {
            maxFare = { uuid: trip.uuid, value: trip.usdAmount };
          }
        }
      } else {
        unconvertedCurrencies.add(trip.currency);
      }
    }
  }

  const dateSpanDays = firstTripTime !== null && lastTripTime !== null ? Math.max(0, (lastTripTime - firstTripTime) / DAY_MS) : 0;
  const averageDaysBetweenTrips = datedTripCount > 1 ? dateSpanDays / (datedTripCount - 1) : null;
  const monthSpan = dateSpanDays > 0 ? Math.max(1, dateSpanDays / MONTH_DAYS) : datedTripCount > 0 ? 1 : 0;
  const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });

  return {
    activeDays: activeDateKeys.size,
    averageDaysBetweenTrips,
    averageDistanceMiles: distanceTripCount > 0 ? totalDistanceMiles / distanceTripCount : null,
    averageDurationMs: timedTripCount > 0 ? totalDurationMs / timedTripCount : null,
    averageFareUsd: convertedFareCount > 0 ? totalUsd / convertedFareCount : null,
    averageTripsPerMonth: monthSpan > 0 ? datedTripCount / monthSpan : null,
    busiestMonth: topCount(months, monthLabel),
    busiestWeekday: topCount(weekdays, (key) => weekdayFormatter.format(new Date(2024, 0, 7 + Number(key)))),
    cancelledTrips,
    completedTrips,
    completionRate: trips.length > 0 ? completedTrips / trips.length : null,
    convertedFareCount,
    currencyTotals: [...currencies.entries()]
      .map(([currency, amount]) => ({ amount, currency, usdAmount: convertToUsd(currency, amount) }))
      .sort((left, right) => (right.usdAmount ?? 0) - (left.usdAmount ?? 0)),
    dateSpanDays,
    distanceTripCount,
    exchangeRateDate,
    firstTripTime,
    flags,
    lastTripTime,
    longestTrip,
    maxFare,
    minFare,
    otherTrips,
    paidTripCount,
    shortestTrip,
    statusCounts: sortedCounts(statuses),
    totalDistanceMiles,
    totalDurationMs,
    totalTrips: trips.length,
    totalUsd,
    unconvertedCurrencies: [...unconvertedCurrencies].sort(),
    vehicleTypes: sortedCounts(vehicles),
    yearlyActivity: [...years.entries()].map(([year, activity]) => ({ ...activity, year })).sort((left, right) => left.year - right.year),
  };
}
