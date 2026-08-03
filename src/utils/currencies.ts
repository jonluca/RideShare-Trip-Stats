import currencyConversionToUSD from "./currency.json";

export const exchangeRateDate = currencyConversionToUSD.date;

/** Convert a currency amount using the bundled, dated rate snapshot. */
export function convertToUsd(code: string, amount: number): number | null {
  if (!Number.isFinite(amount) || !code) {
    return null;
  }

  const normalizedCode = code.toUpperCase().trim() as keyof (typeof currencyConversionToUSD)["rates"];
  const rate = currencyConversionToUSD.rates[normalizedCode];
  if (rate === undefined) {
    return null;
  }

  const converted = Number(rate) * amount;
  return Number.isFinite(converted) ? converted : null;
}
