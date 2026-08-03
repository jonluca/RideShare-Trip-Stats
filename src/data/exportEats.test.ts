import { describe, expect, it } from "vitest";
import type { UberEatsOrder } from "../types/UberEats";
import { eatsOrdersToCsv } from "./exportEats";

describe("eatsOrdersToCsv", () => {
  it("exports one detailed row per item with safe quoting", () => {
    const order = {
      city: "New York",
      currency: "USD",
      id: "order-1",
      items: [
        {
          customizations: "Cheese, salsa",
          name: "Tacos",
          price: 12,
          priceText: "$12.00",
          quantity: 2,
          specialInstructions: 'Say "hello"',
        },
      ],
      orderedAt: "2024-01-01T12:00:00Z",
      orderPrice: 30,
      orderPriceText: "$30.00",
      restaurantId: "restaurant-1",
      restaurantName: "Taco Place",
      status: "completed",
      territory: "New York",
    } satisfies UberEatsOrder;

    const csv = eatsOrdersToCsv([order]);

    expect(csv).toContain("order_id,status,ordered_at");
    expect(csv).toContain('"Cheese, salsa"');
    expect(csv).toContain('"Say ""hello"""');
  });
});
