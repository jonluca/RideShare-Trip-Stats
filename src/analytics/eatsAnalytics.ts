import type { NormalizedEatsOrder } from "../data/eatsOrders";
import { convertToUsd, exchangeRateDate } from "../utils/currencies";

const DAY_MS = 86_400_000;
const MONTH_DAYS = 30.4375;

export interface EatsCountedValue {
  count: number;
  label: string;
}

export interface EatsCurrencyTotal {
  amount: number;
  currency: string;
  usdAmount: number | null;
}

export interface EatsYearActivity {
  orders: number;
  usdSpent: number;
  year: number;
}

export interface EatsAnalytics {
  activeDays: number;
  averageDaysBetweenOrders: number | null;
  averageItemsPerOrder: number | null;
  averageOrderUsd: number | null;
  averageOrdersPerMonth: number | null;
  busiestMonth: EatsCountedValue | null;
  busiestWeekday: EatsCountedValue | null;
  cancelledOrders: number;
  completedOrders: number;
  completionRate: number | null;
  convertedOrderCount: number;
  currencyTotals: EatsCurrencyTotal[];
  exchangeRateDate: string;
  firstOrderTime: number | null;
  itemCounts: EatsCountedValue[];
  lastOrderTime: number | null;
  otherOrders: number;
  pricedOrderCount: number;
  restaurantCounts: EatsCountedValue[];
  statusCounts: EatsCountedValue[];
  totalItems: number;
  totalOrders: number;
  totalUsd: number;
  unconvertedCurrencies: string[];
  unlabelledAmount: number;
  unlabelledPriceCount: number;
  uniqueRestaurants: number;
  yearlyActivity: EatsYearActivity[];
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sortedCounts(map: Map<string, number>): EatsCountedValue[] {
  return [...map.entries()]
    .map(([label, count]) => ({ count, label }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function topCount(map: Map<string, number>, labelForKey: (key: string) => string): EatsCountedValue | null {
  let result: EatsCountedValue | null = null;
  for (const [key, count] of map) {
    if (!result || count > result.count) {
      result = { count, label: labelForKey(key) };
    }
  }
  return result;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(year!, month! - 1, 1));
}

function isCompleted(status: string): boolean {
  return status.includes("COMPLET") || status.includes("DELIVER") || status.includes("FINISH");
}

function isCancelled(status: string): boolean {
  return status.includes("CANCEL") || status.includes("DENIED") || status.includes("FAIL");
}

export function calculateEatsAnalytics(orders: readonly NormalizedEatsOrder[]): EatsAnalytics {
  const activeDates = new Set<string>();
  const currencies = new Map<string, number>();
  const items = new Map<string, number>();
  const months = new Map<string, number>();
  const restaurants = new Map<string, number>();
  const statuses = new Map<string, number>();
  const unconvertedCurrencies = new Set<string>();
  const weekdays = new Map<string, number>();
  const years = new Map<number, { orders: number; usdSpent: number }>();

  let cancelledOrders = 0;
  let completedOrders = 0;
  let convertedOrderCount = 0;
  let datedOrderCount = 0;
  let firstOrderTime: number | null = null;
  let lastOrderTime: number | null = null;
  let otherOrders = 0;
  let pricedOrderCount = 0;
  let totalItems = 0;
  let totalUsd = 0;
  let unlabelledAmount = 0;
  let unlabelledPriceCount = 0;

  for (const order of orders) {
    increment(statuses, order.status);
    const completed = isCompleted(order.status);
    if (completed) {
      completedOrders++;
    } else if (isCancelled(order.status)) {
      cancelledOrders++;
    } else {
      otherOrders++;
    }

    if (order.orderedAt !== null) {
      const date = new Date(order.orderedAt);
      const year = date.getFullYear();
      datedOrderCount++;
      activeDates.add(dateKey(date));
      increment(months, monthKey(date));
      increment(weekdays, String(date.getDay()));
      const activity = years.get(year) ?? { orders: 0, usdSpent: 0 };
      activity.orders++;
      years.set(year, activity);
      firstOrderTime = firstOrderTime === null ? order.orderedAt : Math.min(firstOrderTime, order.orderedAt);
      lastOrderTime = lastOrderTime === null ? order.orderedAt : Math.max(lastOrderTime, order.orderedAt);
    }

    if (!completed) {
      continue;
    }

    increment(restaurants, order.restaurantName);
    totalItems += order.itemCount;
    for (const item of order.record.items) {
      increment(items, item.name, Math.max(1, item.quantity));
    }

    if (order.orderPrice !== null) {
      pricedOrderCount++;
      if (order.currency) {
        increment(currencies, order.currency, order.orderPrice);
        if (order.usdAmount !== null) {
          totalUsd += order.usdAmount;
          convertedOrderCount++;
          if (order.orderedAt !== null) {
            years.get(new Date(order.orderedAt).getFullYear())!.usdSpent += order.usdAmount;
          }
        } else {
          unconvertedCurrencies.add(order.currency);
        }
      } else {
        unlabelledAmount += order.orderPrice;
        unlabelledPriceCount++;
      }
    }
  }

  const dateSpan = firstOrderTime !== null && lastOrderTime !== null ? Math.max(0, (lastOrderTime - firstOrderTime) / DAY_MS) : 0;
  const monthSpan = dateSpan > 0 ? Math.max(1, dateSpan / MONTH_DAYS) : datedOrderCount > 0 ? 1 : 0;
  const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });

  return {
    activeDays: activeDates.size,
    averageDaysBetweenOrders: datedOrderCount > 1 ? dateSpan / (datedOrderCount - 1) : null,
    averageItemsPerOrder: completedOrders > 0 ? totalItems / completedOrders : null,
    averageOrderUsd: convertedOrderCount > 0 ? totalUsd / convertedOrderCount : null,
    averageOrdersPerMonth: monthSpan > 0 ? datedOrderCount / monthSpan : null,
    busiestMonth: topCount(months, monthLabel),
    busiestWeekday: topCount(weekdays, (key) => weekdayFormatter.format(new Date(2024, 0, 7 + Number(key)))),
    cancelledOrders,
    completedOrders,
    completionRate: orders.length > 0 ? completedOrders / orders.length : null,
    convertedOrderCount,
    currencyTotals: [...currencies.entries()]
      .map(([currency, amount]) => ({ amount, currency, usdAmount: convertToUsd(currency, amount) }))
      .sort((left, right) => (right.usdAmount ?? 0) - (left.usdAmount ?? 0)),
    exchangeRateDate,
    firstOrderTime,
    itemCounts: sortedCounts(items),
    lastOrderTime,
    otherOrders,
    pricedOrderCount,
    restaurantCounts: sortedCounts(restaurants),
    statusCounts: sortedCounts(statuses),
    totalItems,
    totalOrders: orders.length,
    totalUsd,
    unconvertedCurrencies: [...unconvertedCurrencies].sort(),
    unlabelledAmount,
    unlabelledPriceCount,
    uniqueRestaurants: restaurants.size,
    yearlyActivity: [...years.entries()].map(([year, activity]) => ({ ...activity, year })).sort((left, right) => left.year - right.year),
  };
}
