export interface UberEatsWebCustomization {
  defaultQuantity?: number;
  quantity?: number;
  title?: string;
}

export interface UberEatsWebCartItem {
  cartItemCustomizations?: Record<string, UberEatsWebCustomization[]>;
  price?: number;
  quantity?: number;
  specialInstructions?: string;
  title?: string;
}

export interface UberEatsWebOrderStateChange {
  stateChangeTime?: string;
  type?: string;
}

export interface UberEatsWebOrder {
  baseEaterOrder?: {
    completedAt?: string;
    currencyCode?: string;
    isCancelled?: boolean;
    isCompleted?: boolean;
    lastStateChangeAt?: string;
    orderStateChanges?: UberEatsWebOrderStateChange[];
    shoppingCart?: {
      currencyCode?: string;
      items?: UberEatsWebCartItem[];
    };
    storeUuid?: string;
    uuid?: string;
  };
  fareInfo?: {
    totalPrice?: number;
  };
  storeInfo?: {
    location?: {
      address?: {
        city?: string;
        country?: string;
        region?: string;
      };
    };
    title?: string;
    uuid?: string;
  };
}

export interface UberEatsPastOrdersResponse {
  data?: {
    meta?: {
      hasMore?: boolean;
    };
    ordersMap?: Record<string, UberEatsWebOrder>;
    orderUuids?: string[];
  };
  status?: string;
}
