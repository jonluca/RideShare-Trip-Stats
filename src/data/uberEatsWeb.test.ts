import { describe, expect, it } from "vitest";
import { createUberEatsHistoryRequest, parseUberEatsWebPage, webOrderToUberEatsOrder } from "./uberEatsWeb";

const webOrder = {
  baseEaterOrder: {
    currencyCode: "USD",
    isCancelled: false,
    isCompleted: true,
    completedAt: "2026-07-28T14:42:58.023Z",
    orderStateChanges: [
      { stateChangeTime: "2026-07-28T14:33:56.224Z", type: "CREATED" },
      { stateChangeTime: "2026-07-28T14:42:58.023Z", type: "COMPLETED" },
    ],
    shoppingCart: {
      items: [
        {
          cartItemCustomizations: {
            size: [{ quantity: 1, title: "Large" }],
            milk: [{ defaultQuantity: 1, quantity: 0, title: "Dairy milk" }],
          },
          price: 575,
          quantity: 2,
          specialInstructions: "Extra hot",
          title: "Latte",
        },
      ],
    },
    storeUuid: "store-1",
    uuid: "order-1",
  },
  fareInfo: { totalPrice: 1264 },
  storeInfo: {
    location: { address: { city: "San Francisco", country: "US", region: "CA" } },
    title: "Coffee Shop",
    uuid: "store-1",
  },
};

describe("Uber Eats web order parsing", () => {
  it("uses Uber Eats' exact verified pagination field", () => {
    expect(createUberEatsHistoryRequest("")).toEqual({ lastWorkflowUUID: "" });
    expect(createUberEatsHistoryRequest("order-10")).toEqual({ lastWorkflowUUID: "order-10" });
  });

  it("normalizes minor-unit prices, timestamps, items, and customizations", () => {
    expect(webOrderToUberEatsOrder(webOrder)).toEqual({
      city: "San Francisco",
      currency: "USD",
      id: "order-1",
      items: [
        {
          customizations: "Large · No Dairy milk",
          name: "Latte",
          price: 5.75,
          priceText: "USD 5.75",
          quantity: 2,
          specialInstructions: "Extra hot",
        },
      ],
      orderedAt: "2026-07-28T14:33:56.224Z",
      orderPrice: 12.64,
      orderPriceText: "USD 12.64",
      restaurantId: "store-1",
      restaurantName: "Coffee Shop",
      source: "web",
      status: "COMPLETED",
      territory: "CA, US",
    });
  });

  it("uses zero-decimal currency minor units", () => {
    expect(
      webOrderToUberEatsOrder({
        ...webOrder,
        baseEaterOrder: { ...webOrder.baseEaterOrder, currencyCode: "JPY", uuid: "order-jpy" },
        fareInfo: { totalPrice: 1264 },
      })?.orderPrice,
    ).toBe(1264);
  });

  it("returns the last workflow UUID as the verified next request cursor", () => {
    const page = parseUberEatsWebPage({
      data: {
        meta: { hasMore: true },
        ordersMap: { "order-1": webOrder },
        orderUuids: ["order-1"],
      },
      status: "success",
    });

    expect(page).toMatchObject({ hasMore: true, nextWorkflowUuid: "order-1", skippedOrders: 0 });
    expect(page.orders).toHaveLength(1);
    expect(page.restaurants["store-1"]).toEqual({ city: "San Francisco", id: "store-1", name: "Coffee Shop" });
  });

  it("rejects malformed history payloads", () => {
    expect(() => parseUberEatsWebPage({ status: "success" })).toThrow("unexpected order-history response");
  });
});
