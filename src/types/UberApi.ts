export interface ActivitiesResponse {
  data: Data;
}
export interface GetTripResponse {
  data: { getTrip: GetTrip };
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
  nextPageToken: string;
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
  receipt: Receipt;
  concierge: null;
  organization: null;
  __typename: string;
}

export interface Receipt {
  carYear: string;
  distance: string;
  distanceLabel: string;
  duration: string;
  vehicleType: string;
  __typename: string;
}

export interface Trip {
  beginTripTime: string;
  cityID: number;
  countryID: number;
  disableCanceling: boolean;
  disableRating: boolean;
  disableResendReceipt: boolean;
  driver: string;
  dropoffTime: string;
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
  vehicleDisplayName: string;
  vehicleViewID: number;
  waypoints: string[];
  __typename: string;
}
