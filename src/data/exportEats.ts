import type { UberEatsOrder } from "../types/UberEats";

function exportCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function eatsOrdersToCsv(orders: readonly UberEatsOrder[]): string {
  const headers = [
    "order_id",
    "status",
    "ordered_at",
    "restaurant_id",
    "restaurant_name",
    "city",
    "territory",
    "currency",
    "order_price",
    "order_price_original",
    "item_name",
    "quantity",
    "item_price",
    "item_price_original",
    "customizations",
    "special_instructions",
  ];

  const rows = orders.flatMap((order) => {
    const items = order.items.length > 0 ? order.items : [null];
    return items.map((item) => [
      order.id,
      order.status,
      order.orderedAt,
      order.restaurantId,
      order.restaurantName,
      order.city,
      order.territory,
      order.currency,
      order.orderPrice,
      order.orderPriceText,
      item?.name,
      item?.quantity,
      item?.price,
      item?.priceText,
      item?.customizations,
      item?.specialInstructions,
    ]);
  });
  return [headers, ...rows].map((row) => row.map(exportCell).join(",")).join("\n");
}
