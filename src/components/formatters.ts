const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const usdFormatter = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}

export function formatUsd(value: number): string {
  return usdFormatter.format(value);
}

export function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { currency, maximumFractionDigits: 2, style: "currency" }).format(value);
  } catch {
    return `${currency} ${decimalFormatter.format(value)}`;
  }
}

export function formatDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(value);
}

export function formatDuration(value: number): string {
  const totalMinutes = Math.round(value / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${formatInteger(days)}d ${hours}h`;
  }
  if (hours > 0) {
    return `${formatInteger(hours)}h ${minutes}m`;
  }
  return `${formatInteger(minutes)}m`;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1, style: "percent" }).format(value);
}
