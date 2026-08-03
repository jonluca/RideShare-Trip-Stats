import { describe, expect, it } from "vitest";
import { normalizeEatsOrders } from "../data/eatsOrders";
import type { UberEatsOrder } from "../types/UberEats";
import { calculateEatsAnalytics } from "./eatsAnalytics";

function order(
  id: string,
  options: { currency?: string | null; date: string; item: string; price: number; restaurant: string; status?: string },
): UberEatsOrder {
  return {
    city: "London",
    currency: options.currency === undefined ? "GBP" : options.currency,
    id,
    items: [
      {
        customizations: "",
        name: options.item,
        price: 8,
        priceText: "8",
        quantity: 2,
        specialInstructions: "",
      },
    ],
    orderedAt: options.date,
    orderPrice: options.price,
    orderPriceText: String(options.price),
    restaurantId: `${options.restaurant}-id`,
    restaurantName: options.restaurant,
    status: options.status ?? "completed",
    territory: "London",
  };
}

describe("calculateEatsAnalytics", () => {
  it("calculates completed-order spending, favorites, items, and cadence", () => {
    const analytics = calculateEatsAnalytics(
      normalizeEatsOrders([
        order("one", { date: "2024-01-01T12:00:00Z", item: "Pizza", price: 20, restaurant: "Pizzeria" }),
        order("two", { date: "2024-01-11T12:00:00Z", item: "Pizza", price: 30, restaurant: "Pizzeria" }),
        order("three", {
          date: "2024-02-01T12:00:00Z",
          item: "Burger",
          price: 15,
          restaurant: "Burger Place",
          status: "canceled",
        }),
      ]),
    );

    expect(analytics).toMatchObject({
      cancelledOrders: 1,
      completedOrders: 2,
      pricedOrderCount: 2,
      totalItems: 4,
      totalOrders: 3,
      uniqueRestaurants: 1,
    });
    expect(analytics.currencyTotals).toEqual([expect.objectContaining({ amount: 50, currency: "GBP" })]);
    expect(analytics.restaurantCounts[0]).toEqual({ count: 2, label: "Pizzeria" });
    expect(analytics.itemCounts[0]).toEqual({ count: 4, label: "Pizza" });
    expect(analytics.averageDaysBetweenOrders).toBeCloseTo(15.5);
  });

  it("keeps currency-free amounts out of converted spending", () => {
    const analytics = calculateEatsAnalytics(
      normalizeEatsOrders([
        order("unknown-currency", { currency: null, date: "2025-03-01T12:00:00Z", item: "Tacos", price: 24.5, restaurant: "Taco" }),
      ]),
    );

    expect(analytics.totalUsd).toBe(0);
    expect(analytics.unlabelledAmount).toBe(24.5);
    expect(analytics.unlabelledPriceCount).toBe(1);
  });
});
