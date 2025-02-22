import currencyConversionToUSD from "./currency.json";

const currencyMappings = {
  ALL: "Lek",
  AFN: "؋",
  ARS: "$",
  AWG: "ƒ",
  AUD: "$",
  AZN: "₼",
  BSD: "$",
  BBD: "$",
  BYN: "Br",
  BZD: "BZ$",
  BMD: "$",
  BOB: "$b",
  BAM: "KM",
  BWP: "P",
  BGN: "лв",
  BRL: "R$",
  BND: "$",
  KHR: "៛",
  CAD: "$",
  KYD: "$",
  CLP: "$",
  CNY: "¥",
  COP: "$",
  CRC: "₡",
  HRK: "kn",
  CUP: "₱",
  CZK: "Kč",
  DKK: "kr",
  DOP: "RD$",
  XCD: "$",
  EGP: "£",
  SVC: "$",
  EUR: "€",
  FKP: "£",
  FJD: "$",
  GHS: "¢",
  GIP: "£",
  GTQ: "Q",
  GGP: "£",
  GYD: "$",
  HNL: "L",
  HKD: "$",
  HUF: "Ft",
  ISK: "kr",
  INR: "",
  IDR: "Rp",
  IRR: "﷼",
  IMP: "£",
  ILS: "₪",
  JMD: "J$",
  JPY: "¥",
  JEP: "£",
  KZT: "лв",
  KPW: "₩",
  KRW: "₩",
  KGS: "лв",
  LAK: "₭",
  LBP: "£",
  LRD: "$",
  MKD: "ден",
  MYR: "RM",
  MUR: "₨",
  MXN: "$",
  MNT: "₮",
  MZN: "MT",
  NAD: "$",
  NPR: "₨",
  ANG: "ƒ",
  NZD: "$",
  NIO: "C$",
  NGN: "₦",
  NOK: "kr",
  OMR: "﷼",
  PKR: "₨",
  PAB: "B/.",
  PYG: "Gs",
  PEN: "S/.",
  PHP: "₱",
  PLN: "zł",
  QAR: "﷼",
  RON: "lei",
  RUB: "₽",
  SHP: "£",
  SAR: "﷼",
  RSD: "Дин.",
  SCR: "₨",
  SGD: "$",
  SBD: "$",
  SOS: "S",
  ZAR: "R",
  LKR: "₨",
  SEK: "kr",
  CHF: "CHF",
  SRD: "$",
  SYP: "£",
  TWD: "NT$",
  THB: "฿",
  TTD: "TT$",
  TRY: "",
  TVD: "$",
  UAH: "₴",
  GBP: "£",
  USD: "$",
  UYU: "$U",
  UZS: "лв",
  VEF: "Bs",
  VND: "₫",
  YER: "﷼",
  ZWD: "Z$",
};

/**
 * Returns the currency symbol ($) from its 3 letter code (USD)
 *
 * @param {string} code - 3 letter currency code
 * @returns {string} - either empty string if not found or the currency code
 */
export function getSymbolFromCode(code: string): string {
  if (!code) {
    return "";
  }
  const codeToUse = code.toUpperCase().trim() as keyof typeof currencyMappings;
  return currencyMappings[codeToUse] || "$";
}

/**
 * Returns the currency conversion, if its known (i.e. Euro to USD)
 *
 * @param {string} code - 3 letter currency code
 * @param {number} currencyAmount - the amount of the currency
 * @returns {number} returns either 0, if invalid values were passed to the function or its unable to do the
 *   conversion, or the currency conversion to USD
 */
export function getCurrencyConversionIfExists(code: string, currencyAmount: number | string) {
  if (typeof currencyAmount !== "number") {
    try {
      currencyAmount = parseFloat(currencyAmount);
    } catch {
      return 0; // Failed to parse number, bail and return 0 as exchange
    }
  }

  if (!currencyConversionToUSD || !currencyConversionToUSD.rates || !code) {
    return 0;
  }
  code = code.toUpperCase();
  code = code.trim();
  if (currencyConversionToUSD.rates.hasOwnProperty(code)) {
    const exchangeToUSD = currencyConversionToUSD.rates[code as keyof (typeof currencyConversionToUSD)["rates"]];
    return Number(exchangeToUSD) * Number(currencyAmount);
  }
  return 0; // return nothing if we weren't able to convert
}
