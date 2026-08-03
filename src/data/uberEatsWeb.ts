import type { UberEatsOrder, UberEatsRestaurant } from "../types/UberEats";
import type { UberEatsPastOrdersResponse, UberEatsWebCartItem, UberEatsWebOrder } from "../types/UberEatsWebApi";

const minorUnitCache = new Map<string, number>();

export interface ParsedUberEatsWebPage {
  hasMore: boolean;
  nextWorkflowUuid: string | null;
  orders: UberEatsOrder[];
  restaurants: Record<string, UberEatsRestaurant>;
  skippedOrders: number;
}

export function createUberEatsHistoryRequest(lastWorkflowUUID: string): { lastWorkflowUUID: string } {
  return { lastWorkflowUUID };
}

function validTimestamp(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function currencyCode(order: UberEatsWebOrder): string | null {
  const value = order.baseEaterOrder?.currencyCode ?? order.baseEaterOrder?.shoppingCart?.currencyCode ?? "";
  const normalized = value.trim().toLocaleUpperCase();
  return /^[A-Z]{3}$/u.test(normalized) ? normalized : null;
}

function minorUnits(currency: string): number {
  const cached = minorUnitCache.get(currency);
  if (cached !== undefined) {
    return cached;
  }
  let digits = 2;
  try {
    digits = new Intl.NumberFormat("en", { currency, style: "currency" }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    // Two decimal places is the safest fallback for an unknown code.
  }
  minorUnitCache.set(currency, digits);
  return digits;
}

function amountFromMinorUnits(value: unknown, currency: string | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value / 10 ** (currency ? minorUnits(currency) : 2);
}

function priceText(amount: number | null, currency: string | null): string {
  if (amount === null) {
    return "";
  }
  return currency ? `${currency} ${amount.toFixed(minorUnits(currency))}` : String(amount);
}

function itemCustomizations(item: UberEatsWebCartItem): string {
  const labels = new Set<string>();
  for (const options of Object.values(item.cartItemCustomizations ?? {})) {
    for (const option of options ?? []) {
      const title = option?.title?.trim();
      if (!title) {
        continue;
      }
      labels.add(option.quantity === 0 ? `No ${title}` : title);
    }
  }
  return [...labels].join(" · ");
}

function orderedAt(order: UberEatsWebOrder): string | null {
  const changes = order.baseEaterOrder?.orderStateChanges ?? [];
  const created = changes.find((change) => change.type?.toLocaleUpperCase() === "CREATED")?.stateChangeTime;
  return (
    validTimestamp(created) ?? validTimestamp(order.baseEaterOrder?.completedAt) ?? validTimestamp(order.baseEaterOrder?.lastStateChangeAt)
  );
}

function orderStatus(order: UberEatsWebOrder): string {
  if (order.baseEaterOrder?.isCancelled) {
    return "CANCELLED";
  }
  if (order.baseEaterOrder?.isCompleted) {
    return "COMPLETED";
  }
  const changes = order.baseEaterOrder?.orderStateChanges ?? [];
  return changes.at(-1)?.type?.trim().toLocaleUpperCase() || "UNKNOWN";
}

export function webOrderToUberEatsOrder(order: UberEatsWebOrder, fallbackId = ""): UberEatsOrder | null {
  const id = order.baseEaterOrder?.uuid?.trim() || fallbackId.trim();
  const timestamp = orderedAt(order);
  if (!id || !timestamp) {
    return null;
  }

  const currency = currencyCode(order);
  const restaurantId = order.storeInfo?.uuid?.trim() || order.baseEaterOrder?.storeUuid?.trim() || "";
  const restaurantName = order.storeInfo?.title?.trim() || "Unknown restaurant";
  const orderPrice = amountFromMinorUnits(order.fareInfo?.totalPrice, currency);
  const items = (order.baseEaterOrder?.shoppingCart?.items ?? []).flatMap((item) => {
    const name = item.title?.trim();
    if (!name) {
      return [];
    }
    const price = amountFromMinorUnits(item.price, currency);
    const quantity = typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
    return [
      {
        customizations: itemCustomizations(item),
        name,
        price,
        priceText: priceText(price, currency),
        quantity,
        specialInstructions: item.specialInstructions?.trim() || "",
      },
    ];
  });
  const address = order.storeInfo?.location?.address;

  return {
    city: address?.city?.trim() || "",
    currency,
    id,
    items,
    orderedAt: timestamp,
    orderPrice,
    orderPriceText: priceText(orderPrice, currency),
    restaurantId,
    restaurantName,
    source: "web",
    status: orderStatus(order),
    territory: [address?.region, address?.country].filter(Boolean).join(", "),
  };
}

export function parseUberEatsWebPage(value: unknown): ParsedUberEatsWebPage {
  if (!value || typeof value !== "object") {
    throw new Error("Uber Eats returned an unexpected order-history response.");
  }
  const response = value as UberEatsPastOrdersResponse;
  const orderUuids = response.data?.orderUuids;
  const ordersMap = response.data?.ordersMap;
  if (!Array.isArray(orderUuids) || !ordersMap || typeof ordersMap !== "object") {
    throw new Error("Uber Eats returned an unexpected order-history response.");
  }

  const orders: UberEatsOrder[] = [];
  const restaurants = new Map<string, UberEatsRestaurant>();
  let skippedOrders = 0;
  for (const orderId of orderUuids) {
    const order = typeof orderId === "string" ? webOrderToUberEatsOrder(ordersMap[orderId] ?? {}, orderId) : null;
    if (!order) {
      skippedOrders++;
      continue;
    }
    orders.push(order);
    if (order.restaurantId) {
      restaurants.set(order.restaurantId, {
        city: order.city,
        id: order.restaurantId,
        name: order.restaurantName,
      });
    }
  }

  const nextWorkflowUuid = orderUuids.length > 0 ? orderUuids.at(-1) : null;
  return {
    hasMore: response.data?.meta?.hasMore === true,
    nextWorkflowUuid: typeof nextWorkflowUuid === "string" && nextWorkflowUuid ? nextWorkflowUuid : null,
    orders,
    restaurants: Object.fromEntries(restaurants),
    skippedOrders,
  };
}
