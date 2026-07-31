export interface Money {
  amount: number;
  currency: Currency | null;
}

// Currency configuration with additional metadata
interface CurrencyConfig {
  symbols: string[];
  thousandsSeparator: "," | "." | " ";
  decimalSeparator: "," | ".";
  maxDecimals: number;
}

export const currencyConfigs: Record<string, CurrencyConfig> = {
  BRL: { symbols: ["R$", "BRL"], thousandsSeparator: ".", decimalSeparator: ",", maxDecimals: 2 },
  RON: { symbols: ["lei", "LEI", "Lei", "RON"], thousandsSeparator: ".", decimalSeparator: ",", maxDecimals: 2 },
  USD: { symbols: ["$", "US$", "US dollars", "USD"], thousandsSeparator: ",", decimalSeparator: ".", maxDecimals: 2 },
  GBP: { symbols: ["£", "GBP"], thousandsSeparator: ",", decimalSeparator: ".", maxDecimals: 2 },
  EUR: { symbols: ["€", "Euro", "EUR"], thousandsSeparator: ".", decimalSeparator: ",", maxDecimals: 2 },
  RUB: { symbols: ["руб", "RUB"], thousandsSeparator: " ", decimalSeparator: ",", maxDecimals: 2 },
  ILS: { symbols: ["₪", "ILS"], thousandsSeparator: ",", decimalSeparator: ".", maxDecimals: 2 },
  INR: { symbols: ["Rs.", "Rs", "INR", "RS", "RS."], thousandsSeparator: ",", decimalSeparator: ".", maxDecimals: 2 },
  PHP: { symbols: ["₱", "PHP", "PhP", "Php"], thousandsSeparator: ",", decimalSeparator: ".", maxDecimals: 2 },
  JPY: { symbols: ["¥", "JPY", "円"], thousandsSeparator: ",", decimalSeparator: ".", maxDecimals: 0 },
  AUD: { symbols: ["A$", "AU$", "AUD"], thousandsSeparator: ",", decimalSeparator: ".", maxDecimals: 2 },
  CAD: { symbols: ["CA$", "C$", "CA$", "CAD"], thousandsSeparator: ",", decimalSeparator: ".", maxDecimals: 2 },
  COP: { symbols: ["COP", "COP$"], thousandsSeparator: ",", decimalSeparator: ".", maxDecimals: 2 },
} as const;
export type Currency = keyof typeof currencyConfigs;

interface ParsedCurrency {
  currency: Currency;
  symbolIndex: number;
  symbol: string;
}

const findCurrency = (text: string): ParsedCurrency | null => {
  for (const [currency, config] of Object.entries(currencyConfigs)) {
    for (const symbol of config.symbols) {
      const index = text.toLowerCase().indexOf(symbol.toLowerCase());
      if (index !== -1) {
        return {
          currency: currency as Currency,
          symbolIndex: index,
          symbol,
        };
      }
    }
  }
  return null;
};

const extractNumberString = (text: string, symbolIndex: number, symbolLength: number): string => {
  // Look for numbers within a reasonable range around the currency symbol
  const searchRadius = 40;
  const start = Math.max(0, symbolIndex - searchRadius);
  const end = Math.min(text.length, symbolIndex + symbolLength + searchRadius);

  // Extract the potential number string
  let numberStr = text.substring(start, end);

  // Remove all non-numeric characters except decimal and thousand separators
  numberStr = numberStr.replace(/[^\d.,]/g, "");

  // Remove leading/trailing separators
  numberStr = numberStr.replace(/^[.,]+|[.,]+$/g, "");

  return numberStr;
};

const normalizeNumber = (numberStr: string, config: CurrencyConfig): number | null => {
  if (!numberStr) {
    return null;
  }

  const decimalIndex = numberStr.lastIndexOf(config.decimalSeparator);
  const decimalDigits = decimalIndex === -1 ? Number.POSITIVE_INFINITY : numberStr.length - decimalIndex - 1;
  const hasDecimalPart = decimalDigits > 0 && decimalDigits <= config.maxDecimals;
  let normalized: string;

  if (hasDecimalPart) {
    const integerPart = numberStr.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fractionalPart = numberStr.slice(decimalIndex + 1).replace(/[.,]/g, "");
    normalized = `${integerPart}.${fractionalPart}`;
  } else {
    normalized = numberStr.replace(/[.,]/g, "");
  }

  const amount = parseFloat(normalized);
  return isNaN(amount) ? null : Number(amount.toFixed(config.maxDecimals));
};

/**
 * Parses a string containing a monetary value and returns a structured Money object
 * @param text - The input text containing a monetary value
 * @returns Money object with currency and amount, or null if parsing fails
 */
export const parseMoney = (text: string): Money | null => {
  if (!text || typeof text !== "string") {
    return null;
  }

  // Find currency in text
  const currencyInfo = findCurrency(text);
  if (!currencyInfo) {
    return null;
  }

  // Extract number string around the currency symbol
  const numberStr = extractNumberString(text, currencyInfo.symbolIndex, currencyInfo.symbol.length);

  // Parse and normalize the number according to currency rules
  const config = currencyConfigs[currencyInfo.currency];
  if (!config) {
    return null;
  }
  const amount = normalizeNumber(numberStr, config);
  if (amount === null) {
    return null;
  }

  return {
    amount,
    currency: currencyInfo.currency,
  };
};

export default parseMoney;
