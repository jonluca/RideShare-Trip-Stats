export interface GetTripsResponse {
  data: Data;
}
export interface GetTripResponse {
  data: Data;
}

export interface Data {
  getTrip: GetTrip;
}

export interface GetTrip {
  trip: Trip;
  mapURL: string;
  polandTaxiLicense: string;
  rating: string;
  receipt: Receipt;
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
  driver: string;
  dropoffTime: string;
  fare: string;
  isRidepoolTrip: boolean;
  isScheduledRide: boolean;
  isSurgeTrip: boolean;
  isUberReserve: boolean;
  jobUUID: string;
  marketplace: Marketplace;
  paymentProfileUUID: string;
  status: Status;
  uuid: string;
  vehicleDisplayName: VehicleDisplayName;
  vehicleViewID: number;
  waypoints: string[];
  __typename: string;
}

export interface Data {
  getTrips: GetTrips;
}

export interface GetTrips {
  count: number;
  pagingResult: PagingResult;
  reservations: any[];
  trips: Trip[];
  __typename: string;
}

export interface PagingResult {
  hasMore: boolean;
  nextCursor: string;
  __typename: string;
}

export enum Marketplace {
  PersonalTransport = "personal_transport",
}

export enum Status {
  Completed = "COMPLETED",
}

export enum VehicleDisplayName {
  UberX = "UberX",
}
