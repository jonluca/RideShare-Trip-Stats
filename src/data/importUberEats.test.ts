import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { combineUberDataImports, importUberDataBytes, importUberDataFiles } from "./importUberData";

const orderDetails = `Territory,Restaurant ID,Order ID,Order Time,Order Status,Item Name,Customizations,Special Instructions,Item Price,Order Price,Currency
8a,restaurant-1,order-1,2022-05-14 18:25:00 +0000 UTC,completed,Tacos,"Cheese, Salsa",No onions,17,49.6,CHF
8a,restaurant-1,order-1,2022-05-14 18:25:00 +0000 UTC,completed,Horchata,,,4.5,49.6,CHF
8a,restaurant-2,order-2,2023-01-02T12:00:00Z,canceled,Burger,,,12,20,CHF
`;

const restaurantNames = `City,Restaurant ID,Restaurant Name,Order Time
Geneva,restaurant-1,Taco House,2022-05-14 18:25:00
Geneva,restaurant-2,Burger Place,2023-01-02 12:00:00
`;

describe("Uber Eats data import", () => {
  it("joins official Eats order details with restaurant names", () => {
    const archive = zipSync({
      "Eater/Eater App Analytics.csv": strToU8("Start Time,Event\n2022-01-01T00:00:00Z,open\n"),
      "Eater/eats_order_details.csv": strToU8(orderDetails),
      "Eater/eats_restaurant_names.csv": strToU8(restaurantNames),
    });

    const result = importUberDataBytes("uber-data.zip", archive);

    expect(result).toMatchObject({ eatsSourceFiles: 2, sourceFiles: 2, tripSourceFiles: 0 });
    expect(result.orders).toHaveLength(2);
    expect(result.orders[0]).toMatchObject({
      city: "Geneva",
      currency: "CHF",
      id: "order-1",
      orderPrice: 49.6,
      restaurantName: "Taco House",
      status: "completed",
    });
    expect(result.orders[0]?.items).toEqual([
      expect.objectContaining({ customizations: "Cheese, Salsa", name: "Tacos", price: 17, quantity: 1 }),
      expect.objectContaining({ name: "Horchata", price: 4.5, quantity: 1 }),
    ]);
  });

  it("preserves unlabelled prices without guessing a currency", () => {
    const result = importUberDataBytes("eats_order_details.csv", strToU8(orderDetails.replace(/,CHF$/gmu, "")));

    expect(result.orders[0]).toMatchObject({ currency: null, orderPrice: 49.6, orderPriceText: "49.6" });
  });

  it("combines separately selected order and restaurant CSV files", () => {
    const combined = combineUberDataImports([
      importUberDataBytes("eats_order_details.csv", strToU8(orderDetails)),
      importUberDataBytes("eats_restaurant_names.csv", strToU8(restaurantNames)),
    ]);

    expect(combined.orders[0]).toMatchObject({ city: "Geneva", restaurantName: "Taco House" });
    expect(combined.orders).toHaveLength(2);
  });

  it("ignores unrelated selected CSV files when a supported file is present", async () => {
    const result = await importUberDataFiles([
      new File(["Email,First Name\nuser@example.com,Test\n"], "Profile.csv", { type: "text/csv" }),
      new File([orderDetails], "Eats Order Details.csv", { type: "text/csv" }),
    ]);

    expect(result.orders).toHaveLength(2);
    expect(result.eatsSourceFiles).toBe(1);
  });

  it("reports a useful error when none of the selected files are supported", async () => {
    await expect(
      importUberDataFiles([new File(["Email,First Name\nuser@example.com,Test\n"], "Profile.csv", { type: "text/csv" })]),
    ).rejects.toThrow("No supported Uber trip or Eats order CSV was found");
  });
});
