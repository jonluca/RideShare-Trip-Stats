import $ from "jquery";
import { chunk } from "lodash-es";
import axios from "axios";
import Swal from "sweetalert2";
import plimit from "p-limit";
import {
  GetTrip,
  GetTripResponse,
  GetTripsResponse,
  Trip,
} from "../types/UberApi";
// export for others scripts to use
window.$ = $;
window.jQuery = $;

class RideShareStats {
  csrf: string = "x";
  total: number = 0;

  tripMap: Record<string, Trip> = {};
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
    let body = {
      operationName: "GetTrip",
      variables: {
        tripUUID: tripUUID,
      },
      query:
        "query GetTrip($tripUUID: String!) {\n  getTrip(tripUUID: $tripUUID) {\n    trip {\n      beginTripTime\n      cityID\n      countryID\n      disableCanceling\n      driver\n      dropoffTime\n      fare\n      isRidepoolTrip\n      isScheduledRide\n      isSurgeTrip\n      isUberReserve\n      jobUUID\n      marketplace\n      paymentProfileUUID\n      status\n      uuid\n      vehicleDisplayName\n      vehicleViewID\n      waypoints\n      __typename\n    }\n    mapURL\n    polandTaxiLicense\n    rating\n    receipt {\n      carYear\n      distance\n      distanceLabel\n      duration\n      vehicleType\n      __typename\n    }\n    __typename\n  }\n}\n",
    };
    const headers = {
      "x-csrf-token": this.csrf,
      "Content-Type": "application/json",
    };
    for (let i = 0; i < 3; i++) {
      try {
        const response = await axios.post<GetTripResponse>(
          this.ENDPOINT,
          body,
          {
            headers,
          }
        );
        let trips = response.data.data.getTrip;
        this.fullTripMap[trips.trip.uuid] = trips;
        const suffix = this.total ? ` of ${this.total}` : "";
        $("#text").html(
          `Requests Completed <br>${
            Object.keys(this.fullTripMap).length
          }${suffix}`
        );
        return;
      } catch (e) {
        console.error(e);
      }
    }
  }

  startUberRidesAnalysis() {
    if (!this.csrf) {
      let text = $("#__CSRF_TOKEN__").text();
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
    $("body").prepend(
      `<div id="overlay"><div id="text">Processing API</div></div>`
    );
    this.fetchData();
  }

  async makeRequestByOffset(offset: number) {
    const d = {
      operationName: "GetTrips",
      variables: {
        cursor: `${offset}`,
        fromTime: null,
        toTime: null,
      },
      query:
        "query GetTrips($cursor: String, $fromTime: Float, $toTime: Float) {\n  getTrips(cursor: $cursor, fromTime: $fromTime, toTime: $toTime) {\n    count\n    pagingResult {\n      hasMore\n      nextCursor\n      __typename\n    }\n    reservations {\n      ...TripFragment\n      __typename\n    }\n    trips {\n      ...TripFragment\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment TripFragment on Trip {\n  beginTripTime\n  disableCanceling\n  driver\n  dropoffTime\n  fare\n  isRidepoolTrip\n  isScheduledRide\n  isSurgeTrip\n  isUberReserve\n  jobUUID\n  marketplace\n  paymentProfileUUID\n  status\n  uuid\n  vehicleDisplayName\n  waypoints\n  __typename\n}\n",
    };
    const headers = {
      "x-csrf-token": this.csrf || "x",
      "Content-Type": "application/json",
    };
    for (let i = 0; i < 3; i++) {
      try {
        const resp = await axios.post<GetTripsResponse>(this.ENDPOINT, d, {
          headers,
        });
        let trips = resp.data.data.getTrips;
        trips.trips.forEach((trip) => {
          this.tripMap[trip.uuid] = trip;
        });
        const suffix = this.total ? ` of ${this.total}` : "";
        $("#text").html(
          `Requests Completed <br>${Object.keys(this.tripMap).length}${suffix}`
        );
        return trips;
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
    const trips = await this.makeRequestByOffset(0);
    this.total = trips?.count || 0;
    const promises = [];
    let offset = Object.keys(this.tripMap).length;
    while (offset < this.total) {
      promises.push(this.makeRequestByOffset(offset));
      offset += 10;
    }
    await Promise.all(promises);
    this.completeBaseApiRequests();
  }

  async completeBaseApiRequests() {
    $("#overlay").hide();
    const result = await Swal.fire({
      title: "Request individual trip data?",
      html: "Takes significantly longer, and might trigger email receipts due to Uber's cache!<br><br>Clicking No will still show most stats.",
      showDenyButton: true,
      confirmButtonText: "Yes",
      denyButtonText: "No",
    });
    if (result.value) {
      this.requestAllTripInfo();
    } else {
      this.sendCompletedDataToExtension();
    }
  }

  async requestAllTripInfo() {
    $("#overlay").show();
    const uuids = Object.keys(this.tripMap);
    const limit = plimit(150);

    const promises = uuids.map((u) =>
      limit(() => this.requestIndividualTripInfo(u))
    );
    await Promise.all(promises);
    this.sendCompletedDataToExtension();
  }
}

new RideShareStats();
