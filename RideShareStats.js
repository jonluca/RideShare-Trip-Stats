// Make all global variables "var" so that they can be redeclared upon multiple executions of the script
var global = {};

global.payment = new Map();
global.drivers = new Map();
global.trips = new Map();
global.cities = new Map();

var csrf = null;
var requestsActive = 0;
var MAX_LIMIT = 50;
var TRIPS_ENDPOINT = 'https://riders.uber.com/api/getTripsForClient';
var TRIP_ENDPOINT = 'https://riders.uber.com/api/getTrip';

$(_ => {

  if (window.location.hostname === "riders.uber.com") {
    startUberRidesAnalysis();

  } else {
    if (confirm("You must be on https://riders.uber.com/trips or ubereats.com to use this tool! Redirecting now.")) {
      window.location.href = "https://riders.uber.com/trips";
    }
  }
});

function startUberRidesAnalysis() {
  if (!csrf) {
    let text = $("#__CSRF_TOKEN__").text();
    csrf = text.replace(/\\u0022/g, '');
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
  $('body').prepend(`<div id="overlay"><div id="text">Processing API</div></div>`);
  requestDataFromUber(csrf, MAX_LIMIT, 0, true);
}

function requestDataFromUber(csrf, limit, offset, isFirstRun) {
  ++requestsActive;
  $.ajax({
    method: 'POST',
    url: TRIPS_ENDPOINT,
    data: {
      "limit": limit,
      "offset": `${offset}`,
      "range": {
        "fromTime": null,
        "toTime": null
      }
    },
    headers: {
      "x-csrf-token": csrf
    },
    type: 'json',
    success(response, textStatus, jqXHR) {
      if (response && response.data) {
        let contents = response.data || {};
        let payment = contents.paymentProfiles || [];
        let drivers = contents.drivers || [];
        let cities = contents.cities || [];
        let trips = contents.trips || [];
        if (trips.pagingResult && trips.pagingResult.hasMore && isFirstRun) {
          // Request all results in increments of MAX_LIMIT until we've reached the total amount of trips
          let next = MAX_LIMIT;
          while (next < trips.count) {
            requestDataFromUber(csrf, MAX_LIMIT, next, false);
            next += MAX_LIMIT;
          }
        }
        payment.map(pm => {
          if (!global.payment.get(pm.uuid)) {
            global.payment.set(pm.uuid, pm);
          }
        });
        drivers.map(d => {
          if (!global.drivers.get(d.uuid)) {
            global.drivers.set(d.uuid, d);
          }
        });
        trips.trips.map(t => {
          if (!global.trips.get(t.uuid)) {
            global.trips.set(t.uuid, t);
            $("#text").html(`Processing API <br>${global.trips.size} of ${trips.count}`);
          }
        });
        cities.map(c => {
          if (!global.cities.get(c.id)) {
            global.cities.set(c.id, c);
          }
        });
      }
      checkIfCompleteOriginalAPI();
    },
    error: function (xhr, ajaxOptions, thrownError) {
      if (isFirstRun) {
        $("#overlay").hide();
        alert("Please sign in and click UberStats icon again!");
        return;
      }
      checkIfCompleteOriginalAPI();
    }
  });
}

function checkIfCompleteOriginalAPI() {
  --requestsActive;
  if (requestsActive === 0) {
    $("#overlay").hide();
    window.Swal({
      title: 'Request individual trip data?',
      html: "Takes significantly longer, and might trigger email receipts due to Uber's cache!<br><br>Clicking No will still show most stats.",
      type: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes!',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.value) {
        requestAllTripInfo();
      } else {
        // Once all requests have completed, trigger a new tab and send the data
        let serialized = {};
        serialized.payment = [...global.payment];
        serialized.drivers = [...global.drivers];
        serialized.trips = [...global.trips];
        serialized.cities = [...global.cities];
        chrome.runtime.sendMessage({global: serialized});
        $("#overlay").hide();
      }
    });

  }
}

function requestAllTripInfo() {
  $("#overlay").show();
  let uuids = global.trips.keys();
  for (const uuid of uuids) {
    requestIndividualTripInfo(uuid);
  }
}

function requestIndividualTripInfo(tripUUID) {
  ++requestsActive;
  $.ajax({
    method: 'POST',
    url: TRIP_ENDPOINT,
    data: {
      "tripUUID": tripUUID
    },
    headers: {
      "x-csrf-token": csrf
    },
    type: 'json',
    success(response, textStatus, jqXHR) {
      if (response && response.data) {
        let contents = response.data;
        let trip = global.trips.get(tripUUID);
        // Add new information to original trip and save back into global trip map
        trip.tripMap = contents.tripMap;
        trip.receipt = contents.receipt;
        global.trips.set(tripUUID, trip);
      }
      checkIfCompleteAdditionalTripInfo();
    },
    error: function (xhr, ajaxOptions, thrownError) {
      checkIfCompleteAdditionalTripInfo();
    }
  });
}

function checkIfCompleteAdditionalTripInfo() {
  --requestsActive;
  $("#text").html(`Requests Left <br>${requestsActive} of ${global.trips.size}`);
  if (requestsActive === 0) {
    // Once all requests have completed, trigger a new tab and send the data
    let serialized = {};
    serialized.payment = [...global.payment];
    serialized.drivers = [...global.drivers];
    serialized.trips = [...global.trips];
    serialized.cities = [...global.cities];
    chrome.runtime.sendMessage({global: serialized});
    $("#overlay").hide();
  }
}
