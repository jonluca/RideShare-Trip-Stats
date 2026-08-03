export interface UberEatsItem {
  customizations: string;
  name: string;
  price: number | null;
  priceText: string;
  quantity: number;
  specialInstructions: string;
}

export interface UberEatsOrder {
  city: string;
  currency: string | null;
  id: string;
  items: UberEatsItem[];
  orderedAt: string;
  orderPrice: number | null;
  orderPriceText: string;
  restaurantId: string;
  restaurantName: string;
  source?: "archive" | "web";
  status: string;
  territory: string;
}

export interface UberEatsRestaurant {
  city: string;
  id: string;
  name: string;
}
