import { browser } from "wxt/browser";
import type { UberEatsItem, UberEatsOrder, UberEatsRestaurant } from "../types/UberEats";
import { EATS_DATA_STORAGE_KEY, eatsOrderMapFromUnknown, restaurantMapFromUnknown, type StoredEatsData } from "./storage";

export interface LoadedEatsData {
  importedAt: string | null;
  records: UberEatsOrder[];
  restaurants: Record<string, UberEatsRestaurant>;
  updatedAt: string | null;
  webCollectedAt: string | null;
  webHistoryComplete: boolean;
}

export interface MergeEatsRecordsResult {
  added: number;
  data: LoadedEatsData;
  duplicates: number;
  restaurants: number;
  total: number;
}

export interface MergeEatsRecordsOptions {
  source?: "archive" | "web";
  webHistoryComplete?: boolean;
}

let pendingLoad: Promise<LoadedEatsData> | undefined;

function latestTimestamp(...values: Array<string | null>): string | null {
  return (
    values
      .filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
}

async function readEatsData(): Promise<LoadedEatsData> {
  const stored = await browser.storage.local.get(EATS_DATA_STORAGE_KEY);
  const dataset = stored[EATS_DATA_STORAGE_KEY] as Partial<StoredEatsData> | undefined;
  if (dataset?.version !== 1) {
    return {
      importedAt: null,
      records: [],
      restaurants: {},
      updatedAt: null,
      webCollectedAt: null,
      webHistoryComplete: false,
    };
  }
  const importedAt = typeof dataset.importedAt === "string" ? dataset.importedAt : null;
  const webCollectedAt = typeof dataset.webCollectedAt === "string" ? dataset.webCollectedAt : null;
  return {
    importedAt,
    records: Object.values(eatsOrderMapFromUnknown(dataset.orders)),
    restaurants: restaurantMapFromUnknown(dataset.restaurants),
    updatedAt: latestTimestamp(importedAt, webCollectedAt),
    webCollectedAt,
    webHistoryComplete: dataset.webHistoryComplete === true,
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
  let items: UberEatsItem[];
  if (incoming.source === "web" && incoming.items.length > 0) {
    items = [...incoming.items];
  } else if (existing.source === "web" && existing.items.length > 0) {
    items = [...existing.items];
  } else {
    const itemKeys = new Set(existing.items.map(itemIdentity));
    items = [...existing.items];
    for (const item of incoming.items) {
      const identity = itemIdentity(item);
      if (!itemKeys.has(identity)) {
        itemKeys.add(identity);
        items.push(item);
      }
    }
  }
  return {
    ...existing,
    city: incoming.source === "web" ? incoming.city || existing.city : existing.city || incoming.city,
    currency: incoming.source === "web" ? (incoming.currency ?? existing.currency) : (existing.currency ?? incoming.currency),
    items,
    orderedAt: incoming.source === "web" ? incoming.orderedAt : existing.orderedAt,
    orderPrice: incoming.source === "web" ? (incoming.orderPrice ?? existing.orderPrice) : (existing.orderPrice ?? incoming.orderPrice),
    orderPriceText:
      incoming.source === "web" ? incoming.orderPriceText || existing.orderPriceText : existing.orderPriceText || incoming.orderPriceText,
    restaurantId:
      incoming.source === "web" ? incoming.restaurantId || existing.restaurantId : existing.restaurantId || incoming.restaurantId,
    restaurantName:
      incoming.source === "web" && incoming.restaurantName !== "Unknown restaurant"
        ? incoming.restaurantName
        : existing.restaurantName && existing.restaurantName !== "Unknown restaurant"
          ? existing.restaurantName
          : incoming.restaurantName,
    source: existing.source === "web" || incoming.source === "web" ? "web" : (existing.source ?? incoming.source),
    status: incoming.source === "web" ? incoming.status : existing.status === "UNKNOWN" ? incoming.status : existing.status,
    territory: incoming.source === "web" ? incoming.territory || existing.territory : existing.territory || incoming.territory,
  };
}

export async function mergeEatsRecords(
  records: readonly UberEatsOrder[],
  importedRestaurants: Readonly<Record<string, UberEatsRestaurant>>,
  options: MergeEatsRecordsOptions = {},
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

  const updatedAt = new Date().toISOString();
  const dataset: StoredEatsData = {
    orders: Object.fromEntries(orderMap),
    restaurants,
    version: 1,
  };
  if (options.source === "web") {
    if (existing.importedAt) {
      dataset.importedAt = existing.importedAt;
    }
    dataset.webCollectedAt = updatedAt;
    dataset.webHistoryComplete = options.webHistoryComplete === true;
  } else {
    dataset.importedAt = updatedAt;
    if (existing.webCollectedAt) {
      dataset.webCollectedAt = existing.webCollectedAt;
    }
    dataset.webHistoryComplete = existing.webHistoryComplete;
  }

  await browser.storage.local.set({ [EATS_DATA_STORAGE_KEY]: dataset });

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
