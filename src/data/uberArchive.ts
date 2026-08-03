import { strFromU8, unzipSync } from "fflate";
import type { CsvSource } from "./csv";

const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
const MAX_CSV_BYTES = 75 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

function normalizedPath(value: string): string {
  return value.toLocaleLowerCase().replace(/\\/g, "/");
}

function isRelevantUberCsv(name: string): boolean {
  const path = normalizedPath(name);
  if (!path.endsWith(".csv")) {
    return false;
  }

  const fileName =
    path
      .split("/")
      .at(-1)
      ?.replace(/[^a-z0-9]/g, "") ?? "";
  const isDriverData = /(^|\/)(driver|deliverypartner)(\/|$)/u.test(path);
  if (isDriverData) {
    return false;
  }

  const relevantSection = /(^|\/)(rider|riders|eater|eats|ubereats)(\/|$)/u.test(path);
  const recognizedRootFile = /(tripsdata|tripsdatasummary|eatsorderdetails|orderdetails|eatsrestaurantnames|restaurantnames)/u.test(
    fileName,
  );
  return relevantSection || recognizedRootFile;
}

export function readUberCsvSources(name: string, bytes: Uint8Array): CsvSource[] {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error("This archive is larger than 250 MB. Extract it and select the relevant Rider or Eater CSV files instead.");
  }

  const isZip = name.toLocaleLowerCase().endsWith(".zip") || (bytes[0] === 0x50 && bytes[1] === 0x4b);
  if (!isZip) {
    return [{ name, text: strFromU8(bytes) }];
  }

  let selectedBytes = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      const selected =
        file.originalSize <= MAX_CSV_BYTES && isRelevantUberCsv(file.name) && selectedBytes + file.originalSize <= MAX_UNCOMPRESSED_BYTES;
      if (selected) {
        selectedBytes += file.originalSize;
      }
      return selected;
    },
  });

  return Object.entries(files).map(([fileName, contents]) => ({ name: fileName, text: strFromU8(contents) }));
}
