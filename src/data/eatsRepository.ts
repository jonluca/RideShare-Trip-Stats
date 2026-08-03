import { browser } from "wxt/browser";
import type { UberEatsItem, UberEatsOrder, UberEatsRestaurant } from "../types/UberEats";
import { EATS_DATA_STORAGE_KEY, eatsOrderMapFromUnknown, restaurantMapFromUnknown, type StoredEatsData } from "./storage";

export interface LoadedEatsData {
  importedAt: string | null;
  records: UberEatsOrder[];
  restaurants: Record<string, UberEatsRestaurant>;
}

export interface MergeEatsRecordsResult {
  added: number;
  data: LoadedEatsData;
  duplicates: number;
  restaurants: number;
  total: number;
}

let pendingLoad: Promise<LoadedEatsData> | undefined;

async function readEatsData(): Promise<LoadedEatsData> {
  const stored = await browser.storage.local.get(EATS_DATA_STORAGE_KEY);
  const dataset = stored[EATS_DATA_STORAGE_KEY] as Partial<StoredEatsData> | undefined;
  if (dataset?.version !== 1) {
    return { importedAt: null, records: [], restaurants: {} };
  }
  return {
    importedAt: typeof dataset.importedAt === "string" ? dataset.importedAt : null,
    records: Object.values(eatsOrderMapFromUnknown(dataset.orders)),
    restaurants: restaurantMapFromUnknown(dataset.restaurants),
  };
}

export function loadEatsData(): Promise<LoadedEatsData> {
  pendingLoad ??= readEatsData();
  return pendingLoad;
}

function itemIdentity(item: UberEatsItem): string {
  return [item.name, item.customizations, item.specialInstructions, item.priceText, item.quantity].join("|");
}

function mergeOrder(existing: UberEatsOrder, incoming: UberEatsOrder): UberEatsOrder {
  const itemKeys = new Set(existing.items.map(itemIdentity));
  const items = [...existing.items];
  for (const item of incoming.items) {
    const identity = itemIdentity(item);
    if (!itemKeys.has(identity)) {
      itemKeys.add(identity);
      items.push(item);
    }
  }
  return {
    ...existing,
    city: existing.city || incoming.city,
    currency: existing.currency ?? incoming.currency,
    items,
    orderPrice: existing.orderPrice ?? incoming.orderPrice,
    orderPriceText: existing.orderPriceText || incoming.orderPriceText,
    restaurantId: existing.restaurantId || incoming.restaurantId,
    restaurantName:
      existing.restaurantName && existing.restaurantName !== "Unknown restaurant" ? existing.restaurantName : incoming.restaurantName,
    status: existing.status === "UNKNOWN" ? incoming.status : existing.status,
    territory: existing.territory || incoming.territory,
  };
}

export async function mergeEatsRecords(
  records: readonly UberEatsOrder[],
  importedRestaurants: Readonly<Record<string, UberEatsRestaurant>>,
): Promise<MergeEatsRecordsResult> {
  const existing = await readEatsData();
  const restaurants = { ...existing.restaurants, ...importedRestaurants };
  const orderMap = new Map(existing.records.map((record) => [record.id, record]));
  let added = 0;

  for (const record of records) {
    const current = orderMap.get(record.id);
    if (current) {
      orderMap.set(record.id, mergeOrder(current, record));
    } else {
      orderMap.set(record.id, record);
      added++;
    }
  }

  for (const order of orderMap.values()) {
    const restaurant = restaurants[order.restaurantId];
    if (restaurant) {
      order.city ||= restaurant.city;
      if (!order.restaurantName || order.restaurantName === "Unknown restaurant") {
        order.restaurantName = restaurant.name;
      }
    }
  }

  await browser.storage.local.set({
    [EATS_DATA_STORAGE_KEY]: {
      importedAt: new Date().toISOString(),
      orders: Object.fromEntries(orderMap),
      restaurants,
      version: 1,
    } satisfies StoredEatsData,
  });

  pendingLoad = undefined;
  const data = await loadEatsData();
  return {
    added,
    data,
    duplicates: records.length - added,
    restaurants: Object.keys(importedRestaurants).length,
    total: data.records.length,
  };
}
