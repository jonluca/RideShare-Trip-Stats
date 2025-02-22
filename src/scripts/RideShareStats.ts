import $ from "jquery";
import axios from "axios";
import plimit from "p-limit";
import type { ActivitiesResponse, Activity, GetTrip, GetTripResponse, Trip } from "../types/UberApi";
// export for others scripts to use
window.$ = $;
window.jQuery = $;

class RideShareStats {
  csrf: string = "x";

  tripMap: Record<string, Trip> = {};
  activitiesMap: Record<string, Activity> = {};
  fullTripMap: Record<string, GetTrip> = {};
  constructor() {
    $(() => {
      if (window.location.hostname === "riders.uber.com") {
        this.startUberRidesAnalysis();
      }
    });
  }

  ENDPOINT = "https://riders.uber.com/graphql";

  async requestIndividualTripInfo(tripUUID: string) {
    const body = {
      operationName: "GetTrip",
      variables: {
        tripUUID,
      },
      query: `query GetTrip($tripUUID: String!) {
  getTrip(tripUUID: $tripUUID) {
    trip {
      beginTripTime
      cityID
      countryID
      disableCanceling
      disableRating
      disableResendReceipt
      driver
      dropoffTime
      fare
      guest
      isRidepoolTrip
      isScheduledRide
      isSurgeTrip
      isUberReserve
      jobUUID
      marketplace
      paymentProfileUUID
      showRating
      status
      uuid
      vehicleDisplayName
      vehicleViewID
      waypoints
      __typename
    }
    mapURL
    polandTaxiLicense
    rating
    reviewer
    receipt {
      carYear
      distance
      distanceLabel
      duration
      vehicleType
      __typename
    }
    concierge {
      sourceType
      __typename
    }
    organization {
      name
      __typename
    }
    __typename
  }
}
`,
    };
    const headers = {
      "x-csrf-token": this.csrf,
      "Content-Type": "application/json",
    };
    for (let i = 0; i < 3; i++) {
      try {
        const response = await axios.post<GetTripResponse>(this.ENDPOINT, body, {
          headers,
        });
        const trips = response.data.data.getTrip;
        this.fullTripMap[trips.trip.uuid] = trips;
        $("#text").html(`Requests Completed <br>${Object.keys(this.fullTripMap).length}`);
        return;
      } catch (e) {
        console.error(e);
      }
    }
  }

  startUberRidesAnalysis() {
    if (!this.csrf) {
      const text = $("#__CSRF_TOKEN__").text();
      this.csrf = text.replace(/\\u0022/g, "") || "x";
    }
    // Insert CSS for overlay
    $(document.head).append(`<style>
#overlay {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  z-index: 999;
  cursor: pointer;
}

#text{
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 50px;
  color: white;
  transform: translate(-50%,-50%);
  -ms-transform: translate(-50%,-50%);
  text-align: center;
}</style>`);

    // Set text to "Processing"
    $("body").prepend(`<div id="overlay"><div id="text">Processing API</div></div>`);
    this.fetchData();
  }

  async makeRequestByOffset(nextPageToken?: string) {
    const d = {
      operationName: "Activities",
      variables: {
        includePast: true,
        includeUpcoming: false,
        limit: 100,
        orderTypes: ["RIDES", "TRAVEL"],
        profileType: "PERSONAL",
        cityID: 1,
        nextPageToken,
      },
      query: `query Activities($cityID: Int, $endTimeMs: Float, $includePast: Boolean = true, $includeUpcoming: Boolean = true, $limit: Int = 5, $nextPageToken: String, $orderTypes: [RVWebCommonActivityOrderType!] = [RIDES, TRAVEL], $profileType: RVWebCommonActivityProfileType = PERSONAL, $startTimeMs: Float) {
  activities(cityID: $cityID) {
    cityID
    past(
      endTimeMs: $endTimeMs
      limit: $limit
      nextPageToken: $nextPageToken
      orderTypes: $orderTypes
      profileType: $profileType
      startTimeMs: $startTimeMs
    ) @include(if: $includePast) {
      activities {
        ...RVWebCommonActivityFragment
        __typename
      }
      nextPageToken
      __typename
    }
    upcoming @include(if: $includeUpcoming) {
      activities {
        ...RVWebCommonActivityFragment
        __typename
      }
      __typename
    }
    __typename
  }
}

fragment RVWebCommonActivityFragment on RVWebCommonActivity {
  buttons {
    isDefault
    startEnhancerIcon
    text
    url
    __typename
  }
  cardURL
  description
  imageURL {
    light
    dark
    __typename
  }
  subtitle
  title
  uuid
  __typename
}
`,
    };
    const headers = {
      "x-csrf-token": this.csrf || "x",
      "Content-Type": "application/json",
    };
    for (let i = 0; i < 3; i++) {
      try {
        const resp = await axios.post<ActivitiesResponse>(this.ENDPOINT, d, {
          headers,
        });
        const pastActivities = resp.data.data.activities.past;
        pastActivities.activities.forEach((activity) => {
          this.activitiesMap[activity.uuid] = activity;
        });
        $("#text").html(`Requests Completed <br>${Object.keys(this.tripMap).length}`);
        return pastActivities;
      } catch (e) {
        console.error(e);
      }
    }
  }
  sendCompletedDataToExtension() {
    // Once all requests have completed, trigger a new tab and send the data
    const full: Record<string, Trip | GetTrip> = {};
    Object.keys(this.tripMap).forEach((key) => {
      full[key] = this.fullTripMap[key] || { trip: this.tripMap[key] };
    });
    console.log(full);
    chrome.runtime.sendMessage({ global: full });
    $("#overlay").hide();
  }
  async fetchData() {
    const trips = await this.makeRequestByOffset();
    if (trips) {
      let nextPageToken = trips.nextPageToken;
      while (true) {
        const trips = await this.makeRequestByOffset(nextPageToken);
        if (!trips || !trips.nextPageToken) {
          break;
        }
        nextPageToken = trips.nextPageToken;
      }
    }
    await this.completeBaseApiRequests();
  }

  async completeBaseApiRequests() {
    await this.requestAllTripInfo();
    this.sendCompletedDataToExtension();
  }

  async requestAllTripInfo() {
    $("#overlay").show();
    const uuids = Object.keys(this.activitiesMap);
    const limit = plimit(150);

    const promises = uuids.map((u) => limit(() => this.requestIndividualTripInfo(u)));
    await Promise.all(promises);
    this.sendCompletedDataToExtension();
  }
}

new RideShareStats();
