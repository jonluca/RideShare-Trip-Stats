import { convertToUsd } from "../utils/currencies";
import type { UberEatsOrder } from "../types/UberEats";

export interface NormalizedEatsOrder {
  currency: string | null;
  itemCount: number;
  orderedAt: number | null;
  orderPrice: number | null;
  record: UberEatsOrder;
  restaurantName: string;
  status: string;
  usdAmount: number | null;
}

export function normalizeEatsOrder(record: UberEatsOrder): NormalizedEatsOrder {
  const timestamp = Date.parse(record.orderedAt);
  const orderPrice = Number.isFinite(record.orderPrice) ? record.orderPrice : null;
  return {
    currency: record.currency?.trim().toLocaleUpperCase() || null,
    itemCount: record.items.reduce((total, item) => total + Math.max(1, item.quantity), 0),
    orderedAt: Number.isFinite(timestamp) ? timestamp : null,
    orderPrice,
    record,
    restaurantName: record.restaurantName.trim() || "Unknown restaurant",
    status: record.status.trim().toLocaleUpperCase() || "UNKNOWN",
    usdAmount: orderPrice !== null && record.currency ? convertToUsd(record.currency, orderPrice) : null,
  };
}

export function normalizeEatsOrders(records: readonly UberEatsOrder[]): NormalizedEatsOrder[] {
  return records.map(normalizeEatsOrder);
}
