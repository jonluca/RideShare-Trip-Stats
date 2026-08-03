export interface CsvSource {
  name: string;
  text: string;
}

export function normalizeCsvHeader(value: string): string {
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

export function findCsvColumn(headers: readonly string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index >= 0) {
      return index;
    }
  }
  return -1;
}

export function csvCell(row: readonly string[], index: number): string {
  return index >= 0 ? (row[index]?.trim() ?? "") : "";
}

export function parseLocalizedNumber(value: string): number | null {
  const numeric = value.replace(/[^0-9.,+\-\s]/g, "").replace(/\s/g, "");
  if (!numeric) {
    return null;
  }

  const sign = numeric.startsWith("-") ? -1 : 1;
  const unsigned = numeric.replace(/^[+-]/u, "");
  const commaIndex = unsigned.lastIndexOf(",");
  const dotIndex = unsigned.lastIndexOf(".");
  const separatorIndex = Math.max(commaIndex, dotIndex);
  const decimalDigits = separatorIndex >= 0 ? unsigned.length - separatorIndex - 1 : 0;
  const normalized =
    separatorIndex >= 0 && decimalDigits > 0 && decimalDigits <= 2
      ? `${unsigned.slice(0, separatorIndex).replace(/[.,]/g, "")}.${unsigned.slice(separatorIndex + 1)}`
      : unsigned.replace(/[.,]/g, "");
  const amount = Number(normalized) * sign;
  return Number.isFinite(amount) ? amount : null;
}
