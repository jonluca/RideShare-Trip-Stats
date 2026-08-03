export interface Money {
  amount: number;
  currency: CurrencyCode;
}

interface CurrencyConfig {
  symbols: readonly string[];
  maxDecimals: number;
}

export const currencyConfigs = {
  AED: { symbols: ["AED", "د.إ"], maxDecimals: 2 },
  AUD: { symbols: ["AUD", "AU$", "A$"], maxDecimals: 2 },
  BRL: { symbols: ["BRL", "R$"], maxDecimals: 2 },
  CAD: { symbols: ["CAD", "CA$", "C$"], maxDecimals: 2 },
  CHF: { symbols: ["CHF"], maxDecimals: 2 },
  CLP: { symbols: ["CLP", "CLP$"], maxDecimals: 0 },
  CNY: { symbols: ["CNY", "CN¥"], maxDecimals: 2 },
  COP: { symbols: ["COP", "COP$"], maxDecimals: 2 },
  CZK: { symbols: ["CZK", "Kč"], maxDecimals: 2 },
  DKK: { symbols: ["DKK"], maxDecimals: 2 },
  EUR: { symbols: ["EUR", "Euro", "€"], maxDecimals: 2 },
  GBP: { symbols: ["GBP", "£"], maxDecimals: 2 },
  HKD: { symbols: ["HKD", "HK$"], maxDecimals: 2 },
  HUF: { symbols: ["HUF", "Ft"], maxDecimals: 2 },
  IDR: { symbols: ["IDR", "Rp"], maxDecimals: 2 },
  ILS: { symbols: ["ILS", "₪"], maxDecimals: 2 },
  INR: { symbols: ["INR", "Rs.", "Rs", "RS.", "RS", "₹"], maxDecimals: 2 },
  JPY: { symbols: ["JPY", "円", "JP¥", "¥"], maxDecimals: 0 },
  KRW: { symbols: ["KRW", "₩"], maxDecimals: 0 },
  MXN: { symbols: ["MXN", "MX$"], maxDecimals: 2 },
  MYR: { symbols: ["MYR", "RM"], maxDecimals: 2 },
  NOK: { symbols: ["NOK"], maxDecimals: 2 },
  NZD: { symbols: ["NZD", "NZ$"], maxDecimals: 2 },
  PHP: { symbols: ["PHP", "PhP", "Php", "₱"], maxDecimals: 2 },
  PLN: { symbols: ["PLN", "zł"], maxDecimals: 2 },
  RON: { symbols: ["RON", "lei", "LEI", "Lei"], maxDecimals: 2 },
  RUB: { symbols: ["RUB", "руб", "₽"], maxDecimals: 2 },
  SEK: { symbols: ["SEK"], maxDecimals: 2 },
  SGD: { symbols: ["SGD", "S$"], maxDecimals: 2 },
  THB: { symbols: ["THB", "฿"], maxDecimals: 2 },
  TRY: { symbols: ["TRY", "₺"], maxDecimals: 2 },
  USD: { symbols: ["US dollars", "USD", "US$", "$"], maxDecimals: 2 },
  ZAR: { symbols: ["ZAR"], maxDecimals: 2 },
} as const satisfies Record<string, CurrencyConfig>;

export type CurrencyCode = keyof typeof currencyConfigs;

interface CurrencyMatch {
  config: CurrencyConfig;
  currency: CurrencyCode;
  index: number;
  symbol: string;
}

const currencySymbols = Object.entries(currencyConfigs)
  .flatMap(([currency, config]) => config.symbols.map((symbol) => ({ config, currency: currency as CurrencyCode, symbol })))
  .sort((left, right) => right.symbol.length - left.symbol.length);

function findCurrency(text: string): CurrencyMatch | null {
  const normalizedText = text.toLocaleLowerCase();

  for (const candidate of currencySymbols) {
    const index = normalizedText.indexOf(candidate.symbol.toLocaleLowerCase());
    if (index >= 0) {
      return { ...candidate, index };
    }
  }

  return null;
}

function findAmountNearSymbol(text: string, symbolIndex: number, symbolLength: number): string | null {
  const afterSymbol = text.slice(symbolIndex + symbolLength);
  const amountAfter = afterSymbol.match(/^\s*([+-]?\s*\d[\d.,\s]*)/u)?.[1];
  if (amountAfter) {
    const signBeforeSymbol = text.slice(0, symbolIndex).trimEnd().match(/[+-]$/)?.[0] ?? "";
    return `${signBeforeSymbol}${amountAfter.trim()}`;
  }

  const beforeSymbol = text.slice(0, symbolIndex);
  return beforeSymbol.match(/([+-]?\s*\d[\d.,\s]*)\s*$/u)?.[1]?.trim() ?? null;
}

function normalizeAmount(value: string, maxDecimals: number): number | null {
  const compact = value.replace(/\s/g, "");
  const sign = compact.startsWith("-") ? -1 : 1;
  const unsigned = compact.replace(/^[+-]/, "");
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);
  const decimalDigits = separatorIndex >= 0 ? unsigned.length - separatorIndex - 1 : 0;
  const occurrences = (unsigned.match(/[.,]/g) ?? []).length;

  const hasDecimalPart =
    maxDecimals > 0 && decimalDigits > 0 && decimalDigits <= maxDecimals && (occurrences === 1 || (lastComma >= 0 && lastDot >= 0));

  const normalized = hasDecimalPart
    ? `${unsigned.slice(0, separatorIndex).replace(/[.,]/g, "")}.${unsigned.slice(separatorIndex + 1).replace(/[.,]/g, "")}`
    : unsigned.replace(/[.,]/g, "");

  const amount = Number(normalized) * sign;
  return Number.isFinite(amount) ? Number(amount.toFixed(maxDecimals)) : null;
}

/** Parse the localized fare strings returned by Uber. */
export function parseMoney(text: string): Money | null {
  if (typeof text !== "string" || text.trim() === "") {
    return null;
  }

  const match = findCurrency(text);
  if (!match) {
    return null;
  }

  const amountText = findAmountNearSymbol(text, match.index, match.symbol.length);
  if (!amountText) {
    return null;
  }

  const amount = normalizeAmount(amountText, match.config.maxDecimals);
  return amount === null ? null : { amount, currency: match.currency };
}

export default parseMoney;
