export interface ActivitiesResponse {
  data: Data;
}
export interface GetTripResponse {
  data: { getTrip: GetTrip | null };
}

export interface Data {
  activities: Activities;
}

export interface Activities {
  cityID: number;
  past: Past;
  __typename: string;
}

export interface Past {
  activities: Activity[];
  nextPageToken: string | null;
  __typename: string;
}

export interface Activity {
  uuid: string;
}
export interface GetTrip {
  trip: Trip;
  mapURL: string;
  polandTaxiLicense: string;
  rating: string;
  reviewer: string;
  receipt: Receipt | null;
  concierge: { sourceType?: string } | null;
  organization: { name?: string } | null;
  __typename: string;
}

export interface Receipt {
  carYear: string | null;
  distance: string | null;
  distanceLabel: string | null;
  duration: string | null;
  vehicleType: string | null;
  __typename: string;
}

export interface Trip {
  beginTripTime: string | null;
  cityID: number;
  countryID: number;
  disableCanceling: boolean;
  disableRating: boolean;
  disableResendReceipt: boolean;
  driver: string;
  dropoffTime: string | null;
  fare: string;
  guest: string;
  isRidepoolTrip: boolean;
  isScheduledRide: boolean;
  isSurgeTrip: boolean;
  isUberReserve: boolean;
  jobUUID: string;
  marketplace: string;
  paymentProfileUUID: string;
  showRating: boolean;
  status: string;
  uuid: string;
  vehicleDisplayName: string | null;
  vehicleViewID: number;
  waypoints: string[];
  __typename: string;
}
