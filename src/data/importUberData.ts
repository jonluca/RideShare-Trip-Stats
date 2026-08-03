import { strFromU8, unzipSync } from "fflate";
import type { GetTrip } from "../types/UberApi";

const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
const MAX_CSV_BYTES = 75 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

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

interface CsvSource {
  name: string;
  text: string;
}

export interface UberDataImport {
  parsedRows: number;
  records: GetTrip[];
  skippedRows: number;
  sourceFiles: number;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/u, "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = "";
  let quoted = false;
  let row: string[] = [];

  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell.replace(/\r$/u, ""));
  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }
  return rows;
}

function findColumn(headers: readonly string[], key: AliasKey): number {
  for (const alias of aliases[key] as readonly string[]) {
    const index = headers.indexOf(alias);
    if (index >= 0) {
      return index;
    }
  }
  return -1;
}

function cellFor(row: readonly string[], columns: Map<AliasKey, number>, key: AliasKey): string {
  const index = columns.get(key) ?? -1;
  return index >= 0 ? (row[index]?.trim() ?? "") : "";
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
  const headers = (rows[0] ?? []).map(normalizeHeader);
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

function isRiderTripArchiveEntry(name: string): boolean {
  const normalized = name.toLocaleLowerCase().replace(/\\/g, "/");
  const fileName = normalized.split("/").at(-1) ?? "";
  const excludedSection = /(^|\/)(driver|delivery|eater|restaurant|order)(\/|$)/u.test(normalized);
  const riderSection = /(^|\/)(rider|riders)(\/|$)/u.test(normalized);
  const tripFile = /\b(trip|trips|ride|rides)\b/u.test(fileName.replace(/[_-]/g, " "));
  return !excludedSection && tripFile && (riderSection || !normalized.includes("/"));
}

function sourcesFromBytes(name: string, bytes: Uint8Array): CsvSource[] {
  const isZip = name.toLocaleLowerCase().endsWith(".zip") || (bytes[0] === 0x50 && bytes[1] === 0x4b);
  if (!isZip) {
    return [{ name, text: strFromU8(bytes) }];
  }

  let selectedBytes = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      const selected =
        file.name.toLocaleLowerCase().endsWith(".csv") &&
        file.originalSize <= MAX_CSV_BYTES &&
        isRiderTripArchiveEntry(file.name) &&
        selectedBytes + file.originalSize <= MAX_UNCOMPRESSED_BYTES;
      if (selected) {
        selectedBytes += file.originalSize;
      }
      return selected;
    },
  });
  return Object.entries(files).map(([fileName, contents]) => ({ name: fileName, text: strFromU8(contents) }));
}

export function importUberDataBytes(name: string, bytes: Uint8Array): UberDataImport {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error("This archive is larger than 250 MB. Extract it and select the rider trips CSV instead.");
  }

  const sources = sourcesFromBytes(name, bytes);
  const records: GetTrip[] = [];
  let parsedRows = 0;
  let skippedRows = 0;
  let sourceFiles = 0;

  for (const source of sources) {
    const result = recordsFromCsv(source);
    if (!result) {
      continue;
    }
    sourceFiles++;
    records.push(...result.records);
    parsedRows += result.parsedRows;
    skippedRows += result.skippedRows;
  }

  if (sourceFiles === 0) {
    throw new Error("No Uber rider trips CSV was found. Select the Uber data ZIP or its Trips Data CSV file.");
  }
  return { parsedRows, records, skippedRows, sourceFiles };
}

export async function importUberDataFile(file: File): Promise<UberDataImport> {
  return importUberDataBytes(file.name, new Uint8Array(await file.arrayBuffer()));
}
