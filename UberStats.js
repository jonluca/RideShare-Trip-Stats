// Make all global variables "var" so that they can be redeclared upon multiple executions of the script
const global = {};

global.payment = new Map();
global.drivers = new Map();
global.trips = new Map();
global.cities = new Map();

let csrf = null;
let requestsActive = 0;
const MAX_LIMIT = 50;
const TRIPS_ENDPOINT = 'https://riders.uber.com/api/getTripsForClient';

$(_ => {
  startAnalysis();
});

function startAnalysis() {
  if (!csrf) {
    let text = $("#__CSRF_TOKEN__").text();
    csrf = text.replace(/\\u0022/g, '');
  }
  requestDataFromUber(csrf, MAX_LIMIT, 0);
}

function requestDataFromUber(csrf, limit, offset) {
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
    headers: {"x-csrf-token": csrf},
    type: 'json',
    success(response, textStatus, jqXHR) {
      if (response && response.data) {
        let contents = response.data;
        let payment = contents.paymentProfiles;
        let drivers = contents.drivers;
        let cities = contents.cities;
        let trips = contents.trips;
        if (trips.pagingResult && trips.pagingResult.hasMore) {
          requestDataFromUber(csrf, MAX_LIMIT, trips.pagingResult.nextCursor);
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
          }
        });
        cities.map(c => {
          if (!global.cities.get(c.id)) {
            global.cities.set(c.id, c);
          }
        });
      }
      --requestsActive;
      if (requestsActive === 0) {
        // Once all requests have completed, trigger a new tab and send the data
        chrome.runtime.sendMessage({global: global});
      }
    }
  });
}
