let global = {};

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
  let years = {};
  let months = {};
  let distances = {};
  let carMakes = {};

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
      let name = t.vehicleViewName;
      // Some have :MATCHED appended, randomly?
      name = name.split(":")[0];
      name = uppercaseFirst(name);
      if (!tripTypes.hasOwnProperty(name)) {
        tripTypes[name] = 0;
      }
      tripTypes[name]++;
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
    let date = new Date(t.requestTime);
    let year = date.getFullYear();
    let month = date.toLocaleString("en-us", {
      month: "long"
    });
    if (!years.hasOwnProperty(year)) {
      years[year] = 0;
    }
    years[year]++;
    if (!months.hasOwnProperty(month)) {
      months[month] = 0;
    }
    months[month]++;

    if (t.receipt) {
      let receipt = t.receipt;
      if (!distances.hasOwnProperty(receipt.distance_label)) {
        distances[receipt.distance_label] = 0;
      }
      distances[receipt.distance_label] += parseFloat(receipt.distance);

      if (!carMakes.hasOwnProperty(receipt.car_make)) {
        carMakes[receipt.car_make] = 0;
      }
      carMakes[receipt.car_make]++;
    }
  });

  // $ spent stats
  $("#total-payment").text("$" + totalAcrossAllCurrencies.toFixed(2));
  let totalSpentText = "";
  let currencyKeys = Object.keys(totalSpent);
  currencyKeys.sort((a, b) => totalSpent[b] - totalSpent[a]);
  for (const key of currencyKeys) {
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

  let iterNum = Math.min(5, drivers.length);
  let driverText = "";
  for (let i = 0; i < iterNum; i++) {
    let favoriteDriver = global.drivers.get(drivers[i]);
    driverText += `<span class="subheading">${favoriteDriver.firstname} ${favoriteDriver.lastname}</span><span class="stat"> ${driverCounts[favoriteDriver.uuid]} rides</span><br>`;
  }
  $("#same-driver").html(driverText);

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

  let yearKeys = Object.keys(years);
  yearKeys.sort((a, b) => {
    return yearKeys[a] - yearKeys[b];
  });
  let yearText = '';
  for (const key of yearKeys) {
    yearText += `<span class="subheading">${key}</span><span class="stat"> ${years[key]}</span><br>`;
  }
  $("#rides-by-year").html(yearText);
  // object which holds the order value of the month
  const monthNames = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12
  };

  let monthKeys = Object.keys(months);
  monthKeys.sort((a, b) => {
    return monthNames[a] - monthNames[b];
  });
  let monthText = '';
  for (const key of monthKeys) {
    monthText += `<span class="subheading">${key}</span><span class="stat"> ${months[key]}</span><br>`;
  }
  $("#rides-by-month").html(monthText);

  let carMakeKeys = Object.keys(carMakes);
  if (carMakeKeys.length) {
    $(".hidden").removeClass("hidden");
    carMakeKeys.sort((a, b) => {
      return carMakes[b] - carMakes[a];
    });
    let carText = '';
    let iter = Math.min(3, carMakeKeys.length);
    for (let i = 0; i < iter; i++) {
      carText += `<span class="subheading">${carMakeKeys[i]}</span><span class="stat"> ${carMakes[carMakeKeys[i]]}</span><br>`;

    }
    $("#rides-by-car").html(carText);
  }

  let distanceKeys = Object.keys(distances);
  if (distanceKeys.length) {
    $(".hidden").removeClass("hidden");
    distanceKeys.sort((a, b) => {
      return distances[b] - distances[a];
    });
    let distanceText = '';
    for (const key of distanceKeys) {
      distanceText += `<span class="subheading">${uppercaseFirst(key)}</span><span class="stat"> ${distances[key].toFixed(2)}</span><br>`;
    }
    $("#distances").html(distanceText);
    addDistanceChart();
  }

  addNumTripsChart();
}

function addNumTripsChart() {
  const ctx = document.getElementById("rides-chart").getContext('2d');
  let data = {};
  global.trips.forEach(t => {
    let requestTime = new Date(t.requestTime);
    let lowerBound = new Date(requestTime.getFullYear(), requestTime.getMonth(), 1);
    if (!data.hasOwnProperty(lowerBound.getTime())) {
      data[lowerBound.getTime()] = 0;
    }
    data[lowerBound.getTime()]++;
  });
  const times = Object.keys(data);
  times.sort((a, b) => a - b);
  let finalCounts = [];
  for (const key of times) {
    finalCounts.push({
      x: new Date(parseInt(key)),
      y: data[key]
    });

  }
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: "Rides Taken",
        data: finalCounts,
        fill: false,
        borderColor: 'black'

      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: true,
        text: "Rides by Month"
      },
      scales: {
        xAxes: [{
          type: "time",
          time: {
            unit: 'month'
          },
          display: true,
          scaleLabel: {
            display: true,
            labelString: 'Date'
          }
        }],
        yAxes: [{
          display: true,
          scaleLabel: {
            display: true,
            labelString: 'value'
          }
        }]
      },
      tooltips: {
        enabled: true,
        mode: 'single',
        callbacks: {
          title: function (tooltipItem, data) {
            return tooltipItem[0].xLabel.replace("1, ", "");
          }
        }
      }
    }
  });
  $("#rides-chart").css('background-color', 'white');
  window.chart = chart;
  chart.render();

}

function addDistanceChart() {
  const ctx = document.getElementById("distance-chart").getContext('2d');
  let data = {};
  global.trips.forEach(t => {
    if (t && t.receipt) {
      let requestTime = new Date(t.requestTime);
      if (!data.hasOwnProperty(requestTime.getTime())) {
        let distance = parseFloat(t.receipt.distance);
        if (t.receipt.distance_label_short === "km") {
          distance /= 0.62137119; // convert km to miles
        }
        data[requestTime.getTime()] = distance;
      }
    }
  });
  const times = Object.keys(data);
  times.sort((a, b) => a - b);
  let finalCounts = [];
  let distanceTraveled = 0;
  for (const key of times) {
    distanceTraveled += data[key];
    finalCounts.push({
      x: new Date(parseInt(key)),
      y: distanceTraveled
    });
  }
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: "Total Traveled",
        data: finalCounts,
        fill: false,
        borderColor: 'black'

      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: true,
        text: "Total Distance Traveled (miles)"
      },
      scales: {
        xAxes: [{
          type: "time",
          time: {
            unit: 'month'
          },
          display: true,
          scaleLabel: {
            display: true,
            labelString: 'Date'
          }
        }],
        yAxes: [{
          display: true,
          scaleLabel: {
            display: true,
            labelString: 'value'
          }
        }]
      }
    }
  });
  $("#distance-chart").css('background-color', 'white');
  window.chart = chart;
  chart.render();

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