export const ACTIVITIES_QUERY = `query Activities($cityID: Int, $endTimeMs: Float, $includePast: Boolean = true, $limit: Int = 5, $nextPageToken: String, $orderTypes: [RVWebCommonActivityOrderType!] = [RIDES, TRAVEL], $profileType: RVWebCommonActivityProfileType = PERSONAL, $startTimeMs: Float) {
  activities(cityID: $cityID) {
    past(endTimeMs: $endTimeMs, limit: $limit, nextPageToken: $nextPageToken, orderTypes: $orderTypes, profileType: $profileType, startTimeMs: $startTimeMs) @include(if: $includePast) {
      activities { uuid }
      nextPageToken
    }
  }
}`;

export const GET_TRIP_QUERY = `query GetTrip($tripUUID: String!) {
  getTrip(tripUUID: $tripUUID) {
    trip {
      beginTripTime cityID countryID disableCanceling disableRating disableResendReceipt driver dropoffTime fare guest
      isRidepoolTrip isScheduledRide isSurgeTrip isUberReserve jobUUID marketplace paymentProfileUUID showRating status
      uuid vehicleDisplayName vehicleViewID waypoints
    }
    mapURL polandTaxiLicense rating reviewer
    receipt { carYear distance distanceLabel duration vehicleType }
    concierge { sourceType }
    organization { name }
  }
}`;

export function createActivitiesRequest(nextPageToken?: string) {
  return {
    operationName: "Activities",
    variables: {
      cityID: 1,
      includePast: true,
      limit: 1000,
      nextPageToken,
      orderTypes: ["RIDES", "TRAVEL"],
      profileType: "PERSONAL",
    },
    query: ACTIVITIES_QUERY,
  };
}

export function createGetTripRequest(tripUUID: string) {
  return {
    operationName: "GetTrip",
    variables: { tripUUID },
    query: GET_TRIP_QUERY,
  };
}
