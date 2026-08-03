import type { GetTrip } from "../types/UberApi";
import type { UberEatsOrder, UberEatsRestaurant } from "../types/UberEats";
import { csvCell, findCsvColumn, normalizeCsvHeader, parseCsv, type CsvSource } from "./csv";
import { importUberEatsSources } from "./importUberEats";
import { readUberCsvSources } from "./uberArchive";

export { parseCsv } from "./csv";

const aliases = {
  beginTime: ["begintriptime", "tripstarttime", "starttime", "requesttime", "triprequesttime"],
  currency: ["farecurrency", "currency", "currencycode"],
  distance: ["distancemiles", "distancekm", "distancekilometers", "tripdistance", "distance"],
  dropoffAddress: ["dropoffaddress", "endaddress", "destinationaddress", "dropofflocation"],
  dropoffTime: ["dropofftime", "endtriptime", "endtime"],
  fare: ["fareamount", "fare", "price", "amount"],
  pickupAddress: ["begintripaddress", "pickupaddress", "startaddress", "pickuplocation"],
  status: ["tripororderstatus", "tripstatus", "status"],
  tripId: ["tripuuid", "tripid", "tripororderid", "uuid"],
  vehicleType: ["producttype", "productname", "vehicletype", "vehicle"],
} as const;

type AliasKey = keyof typeof aliases;

export interface UberDataImport {
  eatsSourceFiles: number;
  orders: UberEatsOrder[];
  parsedRows: number;
  records: GetTrip[];
  restaurants: Record<string, UberEatsRestaurant>;
  skippedRows: number;
  sourceFiles: number;
  tripSourceFiles: number;
}

function findColumn(headers: readonly string[], key: AliasKey): number {
  return findCsvColumn(headers, aliases[key] as readonly string[]);
}

function cellFor(row: readonly string[], columns: Map<AliasKey, number>, key: AliasKey): string {
  return csvCell(row, columns.get(key) ?? -1);
}

function numericCell(value: string): string {
  return value.replace(/[^0-9.,+-]/g, "").trim();
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function importedUuid(row: readonly string[], columns: Map<AliasKey, number>): string {
  const provided = cellFor(row, columns, "tripId");
  if (/^[a-z0-9_-]{8,128}$/iu.test(provided) && provided !== "__proto__") {
    return provided;
  }
  const signature = [
    cellFor(row, columns, "beginTime"),
    cellFor(row, columns, "dropoffTime"),
    cellFor(row, columns, "pickupAddress"),
    cellFor(row, columns, "dropoffAddress"),
    cellFor(row, columns, "fare"),
  ].join("|");
  return `uber-import-${hashString(signature)}-${hashString([...signature].reverse().join(""))}`;
}

function rowToTrip(row: readonly string[], headers: readonly string[], columns: Map<AliasKey, number>): GetTrip | null {
  const beginTripTime = cellFor(row, columns, "beginTime");
  if (!beginTripTime || !Number.isFinite(Date.parse(beginTripTime))) {
    return null;
  }

  const currency = cellFor(row, columns, "currency").toLocaleUpperCase();
  const rawFare = cellFor(row, columns, "fare");
  const fare = rawFare && currency && !rawFare.toLocaleUpperCase().includes(currency) ? `${currency} ${numericCell(rawFare)}` : rawFare;
  const distance = cellFor(row, columns, "distance");
  const distanceColumn = columns.get("distance") ?? -1;
  const sourceDistanceHeader = distanceColumn >= 0 ? (headers[distanceColumn] ?? "") : "";
  const distanceLabel = sourceDistanceHeader.includes("km") || sourceDistanceHeader.includes("kilomet") ? "kilometers" : "miles";
  const pickup = cellFor(row, columns, "pickupAddress");
  const dropoff = cellFor(row, columns, "dropoffAddress");

  return {
    __typename: "ImportedGetTrip",
    concierge: null,
    mapURL: "",
    organization: null,
    polandTaxiLicense: "",
    rating: "",
    receipt: {
      __typename: "ImportedReceipt",
      carYear: null,
      distance: numericCell(distance) || null,
      distanceLabel: distance ? distanceLabel : null,
      duration: null,
      vehicleType: cellFor(row, columns, "vehicleType") || null,
    },
    reviewer: "",
    trip: {
      __typename: "ImportedTrip",
      beginTripTime,
      cityID: 0,
      countryID: 0,
      disableCanceling: false,
      disableRating: false,
      disableResendReceipt: false,
      driver: "",
      dropoffTime: cellFor(row, columns, "dropoffTime") || null,
      fare,
      guest: "",
      isRidepoolTrip: false,
      isScheduledRide: false,
      isSurgeTrip: false,
      isUberReserve: false,
      jobUUID: "",
      marketplace: "",
      paymentProfileUUID: "",
      showRating: false,
      status: cellFor(row, columns, "status") || "COMPLETED",
      uuid: importedUuid(row, columns),
      vehicleDisplayName: cellFor(row, columns, "vehicleType") || null,
      vehicleViewID: 0,
      waypoints: [pickup, dropoff].filter(Boolean),
    },
  };
}

function recordsFromCsv(source: CsvSource): { parsedRows: number; records: GetTrip[]; skippedRows: number } | null {
  const rows = parseCsv(source.text);
  const headers = (rows[0] ?? []).map(normalizeCsvHeader);
  const columns = new Map<AliasKey, number>();
  for (const key of Object.keys(aliases) as AliasKey[]) {
    columns.set(key, findColumn(headers, key));
  }

  const tripSignals = ["distance", "dropoffAddress", "dropoffTime", "fare", "pickupAddress", "status", "tripId"].filter(
    (key) => (columns.get(key as AliasKey) ?? -1) >= 0,
  ).length;
  if ((columns.get("beginTime") ?? -1) < 0 || tripSignals === 0) {
    return null;
  }

  const records: GetTrip[] = [];
  let skippedRows = 0;
  for (const row of rows.slice(1)) {
    const record = rowToTrip(row, headers, columns);
    if (record) {
      records.push(record);
    } else {
      skippedRows++;
    }
  }
  return { parsedRows: Math.max(0, rows.length - 1), records, skippedRows };
}

export function importUberDataBytes(name: string, bytes: Uint8Array): UberDataImport {
  const sources = readUberCsvSources(name, bytes);
  const records: GetTrip[] = [];
  let tripParsedRows = 0;
  let tripSkippedRows = 0;
  let tripSourceFiles = 0;

  for (const source of sources) {
    const result = recordsFromCsv(source);
    if (!result) {
      continue;
    }
    tripSourceFiles++;
    records.push(...result.records);
    tripParsedRows += result.parsedRows;
    tripSkippedRows += result.skippedRows;
  }

  const eats = importUberEatsSources(sources);
  const sourceFiles = tripSourceFiles + eats.sourceFiles;
  if (sourceFiles === 0) {
    throw new Error("No supported Uber trip or Eats order CSV was found. Select the official Uber data ZIP or its Rider/Eater CSV files.");
  }
  return {
    eatsSourceFiles: eats.sourceFiles,
    orders: eats.orders,
    parsedRows: tripParsedRows + eats.parsedRows,
    records,
    restaurants: eats.restaurants,
    skippedRows: tripSkippedRows + eats.skippedRows,
    sourceFiles,
    tripSourceFiles,
  };
}

export async function importUberDataFile(file: File): Promise<UberDataImport> {
  return importUberDataBytes(file.name, new Uint8Array(await file.arrayBuffer()));
}

function orderItemIdentity(orderId: string, item: UberEatsOrder["items"][number]): string {
  return [orderId, item.name, item.customizations, item.specialInstructions, item.priceText, item.quantity].join("|");
}

export function combineUberDataImports(imports: readonly UberDataImport[]): UberDataImport {
  const restaurants = Object.fromEntries(imports.flatMap((result) => Object.entries(result.restaurants)));
  const orderMap = new Map<string, UberEatsOrder>();
  for (const result of imports) {
    for (const order of result.orders) {
      const existing = orderMap.get(order.id);
      if (!existing) {
        orderMap.set(order.id, { ...order, items: [...order.items] });
        continue;
      }
      const itemKeys = new Set(existing.items.map((item) => orderItemIdentity(order.id, item)));
      for (const item of order.items) {
        const identity = orderItemIdentity(order.id, item);
        if (!itemKeys.has(identity)) {
          existing.items.push(item);
          itemKeys.add(identity);
        }
      }
      existing.currency ??= order.currency;
      existing.orderPrice ??= order.orderPrice;
      existing.orderPriceText ||= order.orderPriceText;
      existing.restaurantId ||= order.restaurantId;
      if (existing.restaurantName === "Unknown restaurant") {
        existing.restaurantName = order.restaurantName;
      }
    }
  }

  const orders = [...orderMap.values()].map((order) => {
    const restaurant = restaurants[order.restaurantId];
    return {
      ...order,
      city: order.city || restaurant?.city || "",
      restaurantName:
        order.restaurantName && order.restaurantName !== "Unknown restaurant"
          ? order.restaurantName
          : restaurant?.name || "Unknown restaurant",
    };
  });
  return {
    eatsSourceFiles: imports.reduce((total, result) => total + result.eatsSourceFiles, 0),
    orders,
    parsedRows: imports.reduce((total, result) => total + result.parsedRows, 0),
    records: imports.flatMap((result) => result.records),
    restaurants,
    skippedRows: imports.reduce((total, result) => total + result.skippedRows, 0),
    sourceFiles: imports.reduce((total, result) => total + result.sourceFiles, 0),
    tripSourceFiles: imports.reduce((total, result) => total + result.tripSourceFiles, 0),
  };
}

export async function importUberDataFiles(files: readonly File[]): Promise<UberDataImport> {
  const attempts = await Promise.all(
    files.map(async (file) => {
      try {
        return await importUberDataFile(file);
      } catch (reason) {
        if (reason instanceof Error && reason.message.startsWith("No supported Uber trip or Eats order CSV was found")) {
          return null;
        }
        throw reason;
      }
    }),
  );
  const imports = attempts.filter((result): result is UberDataImport => result !== null);
  if (imports.length === 0) {
    throw new Error("No supported Uber trip or Eats order CSV was found. Select the official Uber data ZIP or its Rider/Eater CSV files.");
  }
  return combineUberDataImports(imports);
}
