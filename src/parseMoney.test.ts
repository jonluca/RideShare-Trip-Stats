import { describe, expect, it } from "vitest";
import { parseMoney } from "./parseMoney";

describe("parseMoney", () => {
  it.each([
    ["$1,234.56", "USD", 1234.56],
    ["CA$42.10", "CAD", 42.1],
    ["HK$88.00", "HKD", 88],
    ["MX$1,250.50", "MXN", 1250.5],
    ["1.234,56 €", "EUR", 1234.56],
    ["¥1,234", "JPY", 1234],
    ["-£12.40", "GBP", -12.4],
  ])("parses %s as %s", (input, currency, amount) => {
    expect(parseMoney(input)).toEqual({ amount, currency });
  });

  it("returns null when no supported currency or amount is present", () => {
    expect(parseMoney("No fare available")).toBeNull();
    expect(parseMoney("USD")).toBeNull();
  });
});
