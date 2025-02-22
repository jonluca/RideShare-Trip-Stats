import $ from "jquery";
import axios from "axios";

import type { Trip } from "../types/UberApi";

window.$ = $;
window.jQuery = $;

class EatsStats {
  csrf: string = "x";
  total: number = 0;

  tripMap: Record<string, Trip> = {};
  constructor() {
    $(() => {
      if (window.location.hostname === "riders.uber.com") {
        this.startUberEatsAnalysis();
      }
    });
  }

  ENDPOINT = "https://riders.uber.com/graphql";

  startUberEatsAnalysis() {
    if (!this.csrf) {
      // csrf = window.csrfToken; // lol
      this.csrf = "x";
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

  async fetchData() {
    let data = await this.makeRequestByCursor(null);
    while (data?.meta?.hasMore) {
      const uuids = data.orderUuids;
      data = await this.makeRequestByCursor(uuids[uuids.length - 1]);
    }
    this.complete();
  }

  async makeRequestByCursor(cursor: string | null) {
    const headers = {
      "x-csrf-token": this.csrf || "x",
      "Content-Type": "application/json",
    };
    let limit = 10;
    for (let i = 0; i < 3; i++) {
      try {
        const body = {
          lastWorkflowUUID: cursor,
          limit,
        };
        const response = await axios.post("EATS_ENDPOINT", body, {
          headers,
        });
        const data = response?.data;
        const uuids = data.orderUuids;
        if (data?.ordersMap) {
          const orders = data.ordersMap;
          for (const order of Object.keys(orders)) {
            this.tripMap[order] = orders[order];
          }
        }
        if (uuids.length === 0 && limit === 10) {
          limit = 1;
          continue;
        }
        $("#text").html(
          `Processing API <br>Loaded ${Object.keys(this.tripMap).length} orders`
        );
        return data;
      } catch (e) {
        console.error(e);
      }
    }
  }

  complete() {
    chrome.runtime.sendMessage({ globalEats: this.tripMap });
    $("#overlay").hide();
  }
}

new EatsStats();
