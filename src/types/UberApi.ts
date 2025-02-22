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
  buttons: Button[];
  cardURL: string;
  description: string;
  imageURL: ImageURL;
  subtitle: string;
  title: string;
  uuid: string;
  __typename: ActivityTypename;
}

export enum ActivityTypename {
  RVWebCommonActivity = "RVWebCommonActivity",
}

export interface Button {
  isDefault: boolean;
  startEnhancerIcon: StartEnhancerIcon;
  text: Text;
  url: string;
  __typename: ButtonTypename;
}

export enum ButtonTypename {
  RVWebCommonActivityButton = "RVWebCommonActivityButton",
}

export enum StartEnhancerIcon {
  ArrowClockwiseFilled = "ARROW_CLOCKWISE_FILLED",
  LifebuoyFilled = "LIFEBUOY_FILLED",
  ReceiptFilled = "RECEIPT_FILLED",
}

export enum Text {
  Details = "Details",
  Help = "Help",
  Rebook = "Rebook",
}

export interface ImageURL {
  light: string;
  dark: string;
  __typename: ImageURLTypename;
}

export enum ImageURLTypename {
  RVWebCommonColorModeImage = "RVWebCommonColorModeImage",
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
