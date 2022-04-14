// Make all global variables "var" so that they can be redeclared upon multiple executions of the script
var global = {};

global.payment = new Map();
global.drivers = new Map();
global.trips = new Map();
global.cities = new Map();

var csrf = null;
var requestsActive = 0;
var MAX_LIMIT = 50;
var TRIPS_ENDPOINT = "https://riders.uber.com/api/getTripsForClient";
var TRIP_ENDPOINT = "https://riders.uber.com/api/getTrip";

$((_) => {
  if (window.location.hostname === "riders.uber.com") {
    startUberRidesAnalysis();
  }
});

function startUberRidesAnalysis() {
  if (!csrf) {
    let text = $("#__CSRF_TOKEN__").text();
    csrf = text.replace(/\\u0022/g, "");
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
  fetchData();
}

async function makeRequestByOffset(offset) {
  const data = {
    limit: MAX_LIMIT,
    offset: `${offset}`,
    range: {
      fromTime: null,
      toTime: null,
    },
    tenancy: "uber/production",
  };
  const headers = {
    "x-csrf-token": csrf,
    "Content-Type": "application/json",
  };
  for (let i = 0; i < 3; i++) {
    try {
      const resp = await fetch(TRIPS_ENDPOINT, {
        url: TRIPS_ENDPOINT,
        method: "POST",
        body: JSON.stringify(data),
        headers,
      });
      const response = await resp.json();
      const { paymentProfiles, drivers, cities, trips } = response?.data || {};

      (paymentProfiles || []).map((pm) => {
        global.payment.set(pm.uuid, pm);
      });
      (drivers || []).map((d) => {
        global.drivers.set(d.uuid, d);
      });
      (trips || []).trips.map((t) => {
        global.trips.set(t.uuid, t);
        $("#text").html(
          `Processing API <br>${global.trips.size} of ${trips.count}`
        );
      });
      (cities || []).map((c) => {
        global.cities.set(c.id, c);
      });
      // retry 3 times when 0 response
      if (trips.trips.length === 0) {
        continue;
      }
      return trips;
    } catch (e) {
      console.error(e);
    }
  }
}
async function fetchData() {
  const trips = await makeRequestByOffset(0);
  let offset = global.trips.size;
  const total = trips?.count;
  const promises = [];
  while (offset < total) {
    promises.push(makeRequestByOffset(offset));
    offset += MAX_LIMIT;
  }
  await Promise.all(promises);
  completeBaseApiRequests();
}

async function completeBaseApiRequests() {
  $("#overlay").hide();
  const result = await window.Swal({
    title: "Request individual trip data?",
    html: "Takes significantly longer, and might trigger email receipts due to Uber's cache!<br><br>Clicking No will still show most stats.",
    type: "question",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes!",
    cancelButtonText: "No",
  });
  if (result.value) {
    requestAllTripInfo();
  } else {
    sendCompletedDataToExtension();
  }
}

function chunk(arr, chunkSize) {
  if (chunkSize <= 0) throw "Invalid chunk size";
  var R = [];
  for (var i = 0, len = arr.length; i < len; i += chunkSize)
    R.push(arr.slice(i, i + chunkSize));
  return R;
}
async function requestAllTripInfo() {
  $("#overlay").show();
  let uuids = Array.from(global.trips.keys());
  const chunked = chunk(uuids, 150);
  for (const uuidChunk of chunked) {
    await Promise.all(uuidChunk.map((uuid) => requestIndividualTripInfo(uuid)));
  }
  sendCompletedDataToExtension();
}

async function requestIndividualTripInfo(tripUUID) {
  let body = {
    tripUUID: tripUUID,
    tenancy: "uber/production",
  };
  const headers = {
    "x-csrf-token": csrf,
    "Content-Type": "application/json",
  };
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(TRIP_ENDPOINT, {
        method: "POST",
        url: TRIP_ENDPOINT,
        body: JSON.stringify(body),
        headers,
      });
      const contents = await response.json();
      let trip = global.trips.get(tripUUID);
      // Add new information to original trip and save back into global trip map
      trip.tripMap = contents?.data?.tripMap;
      trip.receipt = contents?.data?.receipt;
      global.trips.set(tripUUID, trip);
      const hasTripMap = Array.from(global.trips.values()).filter(
        (l) => l.tripMap
      );
      $("#text").html(
        `Requests Completed <br>${hasTripMap.length} of ${global.trips.size}`
      );
      return;
    } catch (e) {
      console.error(e);
    }
  }
}

function sendCompletedDataToExtension() {
  // Once all requests have completed, trigger a new tab and send the data
  let serialized = {};
  serialized.payment = [...global.payment];
  serialized.drivers = [...global.drivers];
  serialized.trips = [...global.trips];
  serialized.cities = [...global.cities];
  chrome.runtime.sendMessage({ global: serialized });
  $("#overlay").hide();
}
