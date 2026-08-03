import parseMoney from "../parseMoney";
import type { UberEatsItem, UberEatsOrder, UberEatsRestaurant } from "../types/UberEats";
import { csvCell, findCsvColumn, normalizeCsvHeader, parseCsv, parseLocalizedNumber, type CsvSource } from "./csv";

const orderAliases = {
  currency: ["ordercurrency", "farecurrency", "currency", "currencycode"],
  customizations: ["customizations", "customization", "modifiers", "itemcustomizations"],
  itemName: ["itemname", "itemtitle", "item", "title"],
  itemPrice: ["itemprice", "itemamount", "unitprice"],
  orderId: ["orderid", "orderuuid", "triporeatsid", "tripeatsid", "uuid"],
  orderedAt: ["ordertime", "orderdatetime", "orderedat", "placedat", "requesttime", "createdtime"],
  orderPrice: ["orderprice", "ordertotal", "totalprice", "totalamount", "total"],
  quantity: ["itemquantity", "quantity", "qty"],
  restaurantId: ["restaurantid", "merchantid", "storeid"],
  restaurantName: ["restaurantname", "merchantname", "storename"],
  specialInstructions: ["specialinstructions", "instructions", "iteminstructions", "notes"],
  status: ["orderstatus", "status"],
  territory: ["territory", "market", "region"],
} as const;

const restaurantAliases = {
  city: ["city", "restaurantcity"],
  id: ["restaurantid", "merchantid", "storeid"],
  name: ["restaurantname", "merchantname", "storename"],
} as const;

type OrderAliasKey = keyof typeof orderAliases;

interface OrderBuilder extends UberEatsOrder {
  itemIndexes: Map<string, number>;
}

export interface UberEatsDataImport {
  orders: UberEatsOrder[];
  parsedRows: number;
  restaurants: Record<string, UberEatsRestaurant>;
  skippedRows: number;
  sourceFiles: number;
}

function orderColumns(headers: readonly string[]): Map<OrderAliasKey, number> {
  return new Map(
    (Object.keys(orderAliases) as OrderAliasKey[]).map((key) => [key, findCsvColumn(headers, orderAliases[key] as readonly string[])]),
  );
}

function orderCell(row: readonly string[], columns: Map<OrderAliasKey, number>, key: OrderAliasKey): string {
  return csvCell(row, columns.get(key) ?? -1);
}

function normalizeCurrency(explicitCurrency: string, ...prices: string[]): string | null {
  const code = explicitCurrency.trim().toLocaleUpperCase();
  if (/^[A-Z]{3}$/u.test(code)) {
    return code;
  }
  for (const price of prices) {
    const parsed = parseMoney(price);
    if (parsed) {
      return parsed.currency;
    }
  }
  return null;
}

function priceAmount(value: string): number | null {
  return parseMoney(value)?.amount ?? parseLocalizedNumber(value);
}

function rowItem(row: readonly string[], columns: Map<OrderAliasKey, number>): UberEatsItem | null {
  const name = orderCell(row, columns, "itemName");
  if (!name) {
    return null;
  }
  const quantityValue = Number.parseInt(orderCell(row, columns, "quantity"), 10);
  const priceText = orderCell(row, columns, "itemPrice");
  return {
    customizations: orderCell(row, columns, "customizations"),
    name,
    price: priceAmount(priceText),
    priceText,
    quantity: Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1,
    specialInstructions: orderCell(row, columns, "specialInstructions"),
  };
}

function itemIdentity(item: UberEatsItem): string {
  return [item.name, item.customizations, item.specialInstructions, item.priceText].join("|");
}

function readRestaurantSource(source: CsvSource): { parsedRows: number; restaurants: UberEatsRestaurant[]; skippedRows: number } | null {
  const rows = parseCsv(source.text);
  const headers = (rows[0] ?? []).map(normalizeCsvHeader);
  const idColumn = findCsvColumn(headers, restaurantAliases.id);
  const nameColumn = findCsvColumn(headers, restaurantAliases.name);
  const cityColumn = findCsvColumn(headers, restaurantAliases.city);
  const looksLikeOrderDetails = findCsvColumn(headers, orderAliases.orderId) >= 0 || findCsvColumn(headers, orderAliases.itemName) >= 0;
  if (idColumn < 0 || nameColumn < 0 || looksLikeOrderDetails) {
    return null;
  }

  const restaurants: UberEatsRestaurant[] = [];
  let skippedRows = 0;
  for (const row of rows.slice(1)) {
    const id = csvCell(row, idColumn);
    const name = csvCell(row, nameColumn);
    if (!id || !name) {
      skippedRows++;
      continue;
    }
    restaurants.push({ city: csvCell(row, cityColumn), id, name });
  }
  return { parsedRows: Math.max(0, rows.length - 1), restaurants, skippedRows };
}

function readOrderSource(source: CsvSource, orders: Map<string, OrderBuilder>): { parsedRows: number; skippedRows: number } | null {
  const rows = parseCsv(source.text);
  const headers = (rows[0] ?? []).map(normalizeCsvHeader);
  const columns = orderColumns(headers);
  if ((columns.get("orderId") ?? -1) < 0 || (columns.get("orderedAt") ?? -1) < 0) {
    return null;
  }
  if ((columns.get("itemName") ?? -1) < 0 && (columns.get("orderPrice") ?? -1) < 0) {
    return null;
  }

  let skippedRows = 0;
  for (const row of rows.slice(1)) {
    const id = orderCell(row, columns, "orderId");
    const orderedAtValue = orderCell(row, columns, "orderedAt");
    const timestamp = Date.parse(orderedAtValue);
    if (!id || !Number.isFinite(timestamp)) {
      skippedRows++;
      continue;
    }

    const orderPriceText = orderCell(row, columns, "orderPrice");
    const item = rowItem(row, columns);
    let order = orders.get(id);
    if (!order) {
      order = {
        city: "",
        currency: normalizeCurrency(orderCell(row, columns, "currency"), orderPriceText, item?.priceText ?? ""),
        id,
        itemIndexes: new Map<string, number>(),
        items: [],
        orderedAt: new Date(timestamp).toISOString(),
        orderPrice: priceAmount(orderPriceText),
        orderPriceText,
        restaurantId: orderCell(row, columns, "restaurantId"),
        restaurantName: orderCell(row, columns, "restaurantName"),
        status: orderCell(row, columns, "status") || "UNKNOWN",
        territory: orderCell(row, columns, "territory"),
      };
      orders.set(id, order);
    } else {
      order.currency ??= normalizeCurrency(orderCell(row, columns, "currency"), orderPriceText, item?.priceText ?? "");
      order.orderPrice ??= priceAmount(orderPriceText);
      order.orderPriceText ||= orderPriceText;
      order.restaurantId ||= orderCell(row, columns, "restaurantId");
      order.restaurantName ||= orderCell(row, columns, "restaurantName");
    }

    if (item) {
      const identity = itemIdentity(item);
      const existingIndex = order.itemIndexes.get(identity);
      if (existingIndex === undefined) {
        order.itemIndexes.set(identity, order.items.length);
        order.items.push(item);
      } else {
        order.items[existingIndex]!.quantity += item.quantity;
      }
    }
  }
  return { parsedRows: Math.max(0, rows.length - 1), skippedRows };
}

export function importUberEatsSources(sources: readonly CsvSource[]): UberEatsDataImport {
  const orders = new Map<string, OrderBuilder>();
  const restaurantMap = new Map<string, UberEatsRestaurant>();
  let parsedRows = 0;
  let skippedRows = 0;
  let sourceFiles = 0;

  for (const source of sources) {
    const restaurantResult = readRestaurantSource(source);
    if (restaurantResult) {
      sourceFiles++;
      parsedRows += restaurantResult.parsedRows;
      skippedRows += restaurantResult.skippedRows;
      for (const restaurant of restaurantResult.restaurants) {
        restaurantMap.set(restaurant.id, restaurant);
      }
      continue;
    }

    const orderResult = readOrderSource(source, orders);
    if (orderResult) {
      sourceFiles++;
      parsedRows += orderResult.parsedRows;
      skippedRows += orderResult.skippedRows;
    }
  }

  const records = [...orders.values()].map(({ itemIndexes: _itemIndexes, ...order }) => {
    const restaurant = restaurantMap.get(order.restaurantId);
    return {
      ...order,
      city: order.city || restaurant?.city || "",
      restaurantName: order.restaurantName || restaurant?.name || "Unknown restaurant",
    };
  });
  const restaurants = Object.fromEntries(restaurantMap);
  return { orders: records, parsedRows, restaurants, skippedRows, sourceFiles };
}
