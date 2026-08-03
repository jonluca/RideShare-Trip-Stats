import type { StoredTripData } from "./storage";

export const COLLECTION_COMPLETE = "rideshare:collection-complete";
export const GET_CACHED_TRIPS = "rideshare:get-cached-trips";

export interface CollectionCompleteMessage {
  payload: StoredTripData;
  type: typeof COLLECTION_COMPLETE;
}

export interface GetCachedTripsMessage {
  type: typeof GET_CACHED_TRIPS;
}

export type RuntimeMessage = CollectionCompleteMessage | GetCachedTripsMessage;
