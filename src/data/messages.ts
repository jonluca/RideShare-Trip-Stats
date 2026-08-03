import type { StoredTripData } from "./storage";

export const COLLECTION_COMPLETE = "rideshare:collection-complete";
export const EATS_COLLECTION_COMPLETE = "rideshare:eats-collection-complete";
export const GET_CACHED_TRIPS = "rideshare:get-cached-trips";
export const START_COLLECTION = "rideshare:start-collection";
export const START_EATS_COLLECTION = "rideshare:start-eats-collection";

export interface CollectionCompleteMessage {
  payload: StoredTripData;
  type: typeof COLLECTION_COMPLETE;
}

export interface GetCachedTripsMessage {
  type: typeof GET_CACHED_TRIPS;
}

export interface EatsCollectionCompleteMessage {
  type: typeof EATS_COLLECTION_COMPLETE;
}

export interface StartCollectionMessage {
  type: typeof START_COLLECTION;
}

export interface StartEatsCollectionMessage {
  type: typeof START_EATS_COLLECTION;
}

export interface StartCollectionResponse {
  error?: string;
  started: boolean;
}

export type RuntimeMessage =
  | CollectionCompleteMessage
  | EatsCollectionCompleteMessage
  | GetCachedTripsMessage
  | StartCollectionMessage
  | StartEatsCollectionMessage;
