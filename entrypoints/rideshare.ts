import plimit from "p-limit";
import { browser } from "wxt/browser";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import type { ActivitiesResponse, Activity, GetTrip, GetTripResponse } from "../src/types/UberApi";

class RideShareStats {
  csrf: string = "x";

  activitiesMap: Record<string, Activity> = {};
  fullTripMap: Record<string, GetTrip> = {};
  ENDPOINT = "https://riders.uber.com/graphql";

  async postGraphQL<T>(body: unknown): Promise<T> {
    const response = await fetch(this.ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: {
        "x-csrf-token": this.csrf || "x",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Uber request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  updateProgress(completed: number, total?: number) {
    const progress = document.getElementById("text");
    if (!progress) {
      return;
    }

    progress.replaceChildren(
      document.createTextNode("Requests Completed"),
      document.createElement("br"),
      document.createTextNode(total === undefined ? String(completed) : `${completed} of ${total}`),
    );
  }

  setOverlayVisible(visible: boolean) {
    const overlay = document.getElementById("overlay");
    if (overlay) {
      overlay.style.display = visible ? "block" : "none";
    }
  }

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
    for (let i = 0; i < 3; i++) {
      try {
        const response = await this.postGraphQL<GetTripResponse>(body);
        const total = Object.keys(this.activitiesMap).length;
        const trips = response.data.getTrip;
        this.fullTripMap[trips.trip.uuid] = trips;
        this.updateProgress(Object.keys(this.fullTripMap).length, total);
        return;
      } catch (e) {
        console.error(e);
      }
    }
  }

  startUberRidesAnalysis() {
    if (!this.csrf) {
      const text = document.getElementById("__CSRF_TOKEN__")?.textContent ?? "";
      this.csrf = text.replace(/\\u0022/g, "") || "x";
    }
    // Insert CSS for overlay
    const style = document.createElement("style");
    style.textContent = `
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
}`;
    document.head.append(style);

    // Set text to "Processing"
    const overlay = document.createElement("div");
    overlay.id = "overlay";
    const progress = document.createElement("div");
    progress.id = "text";
    progress.textContent = "Processing API";
    overlay.append(progress);
    document.body.prepend(overlay);
    void this.fetchData();
  }

  async makeRequestByOffset(nextPageToken?: string) {
    const d = {
      operationName: "Activities",
      variables: {
        includePast: true,
        includeUpcoming: false,
        limit: 1000,
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
        uuid
        __typename
      }
      nextPageToken
      __typename
    }
    upcoming @include(if: $includeUpcoming) {
      activities {
        uuid
        __typename
      }
      __typename
    }
    __typename
  }
}

`,
    };
    for (let i = 0; i < 3; i++) {
      try {
        const response = await this.postGraphQL<ActivitiesResponse>(d);
        const pastActivities = response.data.activities.past;
        pastActivities.activities.forEach((activity) => {
          this.activitiesMap[activity.uuid] = activity;
        });
        this.updateProgress(Object.keys(this.activitiesMap).length);
        return pastActivities;
      } catch (e) {
        console.error(e);
      }
    }
  }
  sendCompletedDataToExtension() {
    // Once all requests have completed, trigger a new tab and send the data
    console.log(this.fullTripMap);
    void browser.runtime.sendMessage({ global: this.fullTripMap });
    this.setOverlayVisible(false);
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
    this.setOverlayVisible(true);
    const uuids = Object.keys(this.activitiesMap);
    const limit = plimit(150);

    const promises = uuids.map((u) => limit(() => this.requestIndividualTripInfo(u)));
    await Promise.all(promises);
  }
}

export default defineUnlistedScript(() => {
  if (window.location.hostname === "riders.uber.com") {
    new RideShareStats().startUberRidesAnalysis();
  }
});
