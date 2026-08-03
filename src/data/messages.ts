import type { StoredTripData } from "./storage";

export const COLLECTION_COMPLETE = "rideshare:collection-complete";
export const GET_CACHED_TRIPS = "rideshare:get-cached-trips";
export const START_COLLECTION = "rideshare:start-collection";

export interface CollectionCompleteMessage {
  payload: StoredTripData;
  type: typeof COLLECTION_COMPLETE;
}

export interface GetCachedTripsMessage {
  type: typeof GET_CACHED_TRIPS;
}

export interface StartCollectionMessage {
  type: typeof START_COLLECTION;
}

export interface StartCollectionResponse {
  error?: string;
  started: boolean;
}

export type RuntimeMessage = CollectionCompleteMessage | GetCachedTripsMessage | StartCollectionMessage;
