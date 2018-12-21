let global = {};
let filtered = {};

chrome.runtime.sendMessage({requestData: true}, function (response) {
  console.log(response);
  // global = response;
});

$(_ => {
  global.cities = new Map(global.cities);
  global.payment = new Map(global.payment);
  global.trips = new Map(global.trips);
  global.drivers = new Map(global.drivers);
  startStatistics();
  registerClickHandlers();
});

function startStatistics() {
  console.log(global);
  // Total # trips
  $("#total-rides").text(global.trips.size);

  // Total # payment methods
  $("#num-payment").text(global.payment.size);

  // Analysis of trips
  let totalSpent = {};
  let tripTypes = {};
  let surgeTrips = 0;
  let tripLengths = [];
  let canceledTrips = 0;
  let completedTrips = 0;
  let driverCanceledTrips = 0;
  global.trips.forEach(t => {
    if (t.clientFare) {
      if (!totalSpent.hasOwnProperty(t.currencyCode)) {
        totalSpent[t.currencyCode] = 0;
      }
      totalSpent[t.currencyCode] += t.clientFare;
    }
    if (t.isSurgeTrip) {
      surgeTrips++;
    }
    if (t.status === "COMPLETED") {
      let requestTime = new Date(t.requestTime);
      let dropoffTime = new Date(t.dropoffTime);
      let lengthMs = dropoffTime.getTime() - requestTime.getTime();
      tripLengths.push(lengthMs);
      completedTrips++;
    } else if (t.status === "CANCELED") {
      canceledTrips++;
    } else if (t.status === "DRIVER_CANCELED") {
      driverCanceledTrips++;
    }

    if (t.vehicleViewName) {
      if (!tripTypes.hasOwnProperty(t.vehicleViewName)) {
        tripTypes[t.vehicleViewName] = 0;
      }
      tripTypes[t.vehicleViewName]++;
    }
  });

  // Total $ spent
  let totalSpentText = "";
  for (const key of Object.keys(totalSpent)) {
    totalSpentText += `<span class="subheading">${key}</span><span class="stat"> ${totalSpent[key].toFixed(2)}</span><br>`;
  }
  $("#total-spent").html(totalSpentText);

  // Completed and canceled rides
  $("#canceled-rides").text(canceledTrips);
  $("#completed-rides").text(completedTrips);
  $("#surge-rides").text(surgeTrips);
  $("#driver-canceled-rides").text(driverCanceledTrips);

  // Trip lengths
  tripLengths.sort((a, b) => a - b);
  $("#shortest-ride").text(Math.abs(Math.round(tripLengths[0] / (60 * 1000))) + " Minutes");
  $("#longest-ride").text(Math.abs(Math.round(tripLengths[tripLengths.length - 1] / (60 * 1000))) + " Minutes");
  let totalTimeText = "";
  let totalTime = tripLengths.reduce((a, b) => a + b, 0);
  totalTimeText += `<span class="subheading">Seconds</span><span class="stat"> ${Math.round(totalTime /= 1000)}</span><br>`;
  if (totalTime > 60) {
    totalTimeText += `<span class="subheading">Minutes</span><span class="stat"> ${Math.round(totalTime /= 60)}</span><br>`;
  }
  if (totalTime > 60) {
    totalTimeText += `<span class="subheading">Hours</span><span class="stat"> ${Math.round(totalTime /= 60)}</span><br>`;
  }
  if (totalTime > 24) {
    totalTimeText += `<span class="subheading">Days</span><span class="stat"> ${(totalTime /= 24).toFixed(2)}</span><br>`;
  }

  $("#total-time").html(totalTimeText);

  let rideTypesText = "";
  let rideTypes = Object.keys(tripTypes);
  rideTypes.sort((a, b) => {
    return tripTypes[b] - tripTypes[a];
  });

  for (const key of rideTypes) {
    rideTypesText += `<span class="subheading">${key}</span><span class="stat"> ${tripTypes[key]}</span><br>`;
  }
  $("#rides-by-type").html(rideTypesText);

}

function filterData() {

}

function registerClickHandlers() {
  $("#export").click(e => {
    let trips = [...global.trips.values()];
    let csv = convertArrayOfObjectsToCSV({
      data: trips
    });
    if (csv == null) {
      return;
    }

    let hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'trips.csv';
    hiddenElement.click();
  });
}

function convertArrayOfObjectsToCSV(args) {
  let result,
    ctr,
    keys,
    columnDelimiter,
    lineDelimiter,
    data;

  data = args.data || null;
  if (data == null || !data.length) {
    return null;
  }

  columnDelimiter = args.columnDelimiter || ',';
  lineDelimiter = args.lineDelimiter || '\n';

  keys = Object.keys(data[0]);

  result = '';
  result += keys.join(columnDelimiter);
  result += lineDelimiter;

  data.forEach(function (item) {
    ctr = 0;
    keys.forEach(function (key) {
      if (ctr > 0) {
        result += columnDelimiter;
      }
      let val = item[key];
      if (val && typeof (val) === "string") {
        val = val.replace(/,/g, '-');
        val = val.normalize("NFKD").replace(/[^\w]/g, '');
      }
      result += val;
      ctr++;
    });
    result += lineDelimiter;
  });

  return result;
}