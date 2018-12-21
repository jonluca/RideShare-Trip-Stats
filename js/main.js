let global = {};
let filtered = {};

$(_ => {
  chrome.runtime.sendMessage({requestData: true}, function (response) {
    global.cities = new Map(response.data.cities);
    global.payment = new Map(response.data.payment);
    global.trips = new Map(response.data.trips);
    global.drivers = new Map(response.data.drivers);
    startStatistics();
    registerClickHandlers();
  });
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
  let driverCounts = {};
  let cityCounts = {};
  let pickups = {};
  let dropoffs = {};

  let totalAcrossAllCurrencies = 0;
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
      totalAcrossAllCurrencies += t.clientFare;
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

    if (t.driverUUID) {
      if (!driverCounts.hasOwnProperty(t.driverUUID)) {
        driverCounts[t.driverUUID] = 0;
      }
      driverCounts[t.driverUUID]++;
    }
    if (t.cityID) {
      if (!cityCounts.hasOwnProperty(t.cityID)) {
        cityCounts[t.cityID] = 0;
      }
      cityCounts[t.cityID]++;
    }
    if (t.dropoffFormattedAddress) {
      if (!dropoffs.hasOwnProperty(t.dropoffFormattedAddress)) {
        dropoffs[t.dropoffFormattedAddress] = 0;
      }
      dropoffs[t.dropoffFormattedAddress]++;
    }
    if (t.begintripFormattedAddress) {
      if (!pickups.hasOwnProperty(t.begintripFormattedAddress)) {
        pickups[t.begintripFormattedAddress] = 0;
      }
      pickups[t.begintripFormattedAddress]++;
    }
  });

  // $ spent stats
  $("#total-payment").text("$" + totalAcrossAllCurrencies.toFixed(2));
  let totalSpentText = "";
  for (const key of Object.keys(totalSpent)) {
    let currencySymbol = getSymbolFromCode(key);
    totalSpentText += `<span class="subheading">${key}</span><span class="stat"> ${currencySymbol + totalSpent[key].toFixed(2)}</span><br>`;
  }
  $("#total-spent").html(totalSpentText);
  $("#average-price").text("$" + (totalAcrossAllCurrencies / completedTrips).toFixed(2));

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

  let drivers = Object.keys(driverCounts);
  drivers.sort((a, b) => {
    return driverCounts[b] - driverCounts[a];
  });

  let favoriteDriver = global.drivers.get(drivers[0]);
  $("#same-driver").text(`${favoriteDriver.firstname} ${favoriteDriver.lastname} - ${driverCounts[favoriteDriver.uuid]} rides`);

  let cities = Object.keys(cityCounts);
  cities.sort((a, b) => {
    return cityCounts[b] - cityCounts[a];
  });

  let cityCountsText = '';
  for (const key of cities) {
    cityCountsText += `<span class="subheading">${global.cities.get(parseInt(key)).name}</span><span class="stat"> ${cityCounts[key]}</span><br>`;
  }
  $("#rides-by-city").html(cityCountsText);

  let pickupKeys = Object.keys(pickups);
  pickupKeys.sort((a, b) => {
    return pickups[b] - pickups[a];
  });
  let max = Math.min(3, pickupKeys.length);
  let pickupText = '';
  for (let i = 0; i < max; i++) {
    pickupText += `<span class="stat">${pickupKeys[i]}</span> <span class="subheading">${pickups[pickupKeys[i]]}</span><br>`;
  }
  $("#fave-pickup").html(pickupText);

  let dropoffKeys = Object.keys(dropoffs);
  dropoffKeys.sort((a, b) => {
    return dropoffs[b] - dropoffs[a];
  });
  let maxDropoff = Math.min(3, pickupKeys.length);
  let dropoffText = '';
  for (let i = 0; i < maxDropoff; i++) {
    dropoffText += `<span class="stat"> ${dropoffKeys[i]}</span> <span class="subheading">${dropoffs[dropoffKeys[i]]}</span><br>`;
  }
  $("#fave-dropoff").html(dropoffText);
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