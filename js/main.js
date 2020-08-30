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

  addTotalRidesStat();
  addTotalPaymentMethodsStat();

  calculateMoneySpent();
  calculateTripTypesStat();
  calculateTripCompletionStats();
  calculateTripLengthsStat();
  calculateDriverStats();
  calculateCityStats();
  calculatePickupAndDropoffStats();
  calculateMonthAndYearStats();
  calculateDistanceStats();
  calculateCarMakeStats();

  addTripsAndSpentByMonthChart();
}

function addTotalRidesStat() {
  // Total # trips
  $("#total-rides").text(global.trips.size);
}

function addTotalPaymentMethodsStat() {
  // Total # payment methods
  $("#num-payment").text(global.payment.size);
}

function calculateMoneySpent() {
  let totalSpent = {};
  let totalAcrossAllCurrencies = 0;
  let completedTrips = 0;
  let completedPaidTrips = 0;
  global.trips.forEach(t => {
    if (t.clientFare) {
      if (!totalSpent.hasOwnProperty(t.currencyCode)) {
        totalSpent[t.currencyCode] = 0;
      }
      totalSpent[t.currencyCode] += t.clientFare;

      totalAcrossAllCurrencies += getCurrencyConversionIfExists(t.currencyCode, t.clientFare);
    }
    if (t.status === "COMPLETED") {
      completedTrips++;
    }
    if(t.clientFare !== 0){
      completedPaidTrips++;
    }
  });

  // $ spent stats
  $("#total-payment").text("~$" + totalAcrossAllCurrencies.toFixed(2));
  let totalSpentText = "";
  let currencyKeys = getSortedKeysFromObject(totalSpent, true);
  for (const key of currencyKeys) {
    let currencySymbol = getSymbolFromCode(key);
    totalSpentText += `<span class="subheading">${key}</span><span class="stat"> ${currencySymbol + totalSpent[key].toFixed(2)}</span><br>`;
  }
  $("#total-spent").html(totalSpentText);
  $("#average-price").text("~$" + (totalAcrossAllCurrencies / completedTrips).toFixed(2));
  $("#average-price-nonZero").text("~$" + (totalAcrossAllCurrencies / completedPaidTrips).toFixed(2));
  addPriceChart();
}

function calculateTripTypesStat() {
  let tripTypes = {};

  global.trips.forEach(t => {
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
  });

  let rideTypesText = constructTextSpan(tripTypes, true);
  $("#rides-by-type").html(rideTypesText);
}

function _genTimeLink(id, time) {
  return `<a target="_blank" class="link" href="https://riders.uber.com/trips/${id}">${time} Minutes</a>`;
}

function calculateTripLengthsStat() {
  let tripLengths = [];
  global.trips.forEach(t => {
    if (t.status === "COMPLETED") {
      let requestTime = new Date(t.requestTime);
      let dropoffTime = new Date(t.dropoffTime);
      let lengthMs = dropoffTime.getTime() - requestTime.getTime();
      tripLengths.push({
        time: lengthMs,
        id: t.uuid
      });
    }
  });
  // Trip lengths
  tripLengths.sort((a, b) => a.time - b.time);

  const shortestTime = Math.abs(Math.round(tripLengths[0].time / (60 * 1000)));
  const longestTime = Math.abs(Math.round(tripLengths[tripLengths.length - 1].time / (60 * 1000)));

  $("#shortest-ride").html(_genTimeLink(tripLengths[0].id, shortestTime));
  $("#longest-ride").html(_genTimeLink(tripLengths[tripLengths.length - 1].id, longestTime));
  let totalTimeText = "";
  let totalTime = 0;
  for (const trip of tripLengths) {
    totalTime += trip.time;
  }
  totalTimeText += `<span class="subheading">Seconds</span><span class="stat"> ${Math.round(totalTime /= 1000)}</span><br>`;
  if (totalTime > 60) {
    totalTimeText += `<span class="subheading">Minutes</span><span id="minutes" class="stat"> ${Math.round(totalTime /= 60)}</span><br>`;
  }
  if (totalTime > 60) {
    totalTimeText += `<span class="subheading">Hours</span><span class="stat"> ${Math.round(totalTime /= 60)}</span><br>`;
  }
  if (totalTime > 24) {
    totalTimeText += `<span class="subheading">Days</span><span class="stat"> ${(totalTime /= 24).toFixed(2)}</span><br>`;
  }

  $("#total-time").html(totalTimeText);
}

function calculateTripCompletionStats() {
  let canceledTrips = 0;
  let completedTrips = 0;
  let driverCanceledTrips = 0;
  let surgeTrips = 0;

  global.trips.forEach(t => {
    if (t.isSurgeTrip) {
      surgeTrips++;
    }
    if (t.status === "COMPLETED") {
      completedTrips++;
    } else if (t.status === "CANCELED") {
      canceledTrips++;
    } else if (t.status === "DRIVER_CANCELED") {
      driverCanceledTrips++;
    }
  });

  // Completed and canceled rides
  $("#canceled-rides").text(canceledTrips);
  $("#completed-rides").text(completedTrips);
  $("#surge-rides").text(surgeTrips);
  $("#driver-canceled-rides").text(driverCanceledTrips);
}

function calculateDriverStats() {
  let driverCounts = {};

  global.trips.forEach(t => {
    if (t.driverUUID) {
      if (!driverCounts.hasOwnProperty(t.driverUUID)) {
        driverCounts[t.driverUUID] = 0;
      }
      driverCounts[t.driverUUID]++;
    }
  });
  let drivers = getSortedKeysFromObject(driverCounts, true);
  let iterNum = Math.min(5, drivers.length);
  let driverText = "";
  for (let i = 0; i < iterNum; i++) {
    const favoriteDriver = global.drivers.get(drivers[i]);
    const firstname = favoriteDriver.firstname || "";
    driverText += `<span class="subheading">${firstname}</span><span class="stat"> ${driverCounts[favoriteDriver.uuid]} rides</span><br>`;
  }
  $("#same-driver").html(driverText);
}

function calculateCityStats() {
  let cityCounts = {};

  global.trips.forEach(t => {
    if (t.cityID) {
      if (!cityCounts.hasOwnProperty(t.cityID)) {
        cityCounts[t.cityID] = 0;
      }
      cityCounts[t.cityID]++;
    }
  });

  let cities = getSortedKeysFromObject(cityCounts, true);
  let cityCountsText = '';
  for (const key of cities) {
    cityCountsText += `<span class="subheading">${global.cities.get(parseInt(key)).name}</span><span class="stat"> ${cityCounts[key]}</span><br>`;
  }
  $("#rides-by-city").html(cityCountsText);
}

function calculatePickupAndDropoffStats() {
  let pickups = {};
  let dropoffs = {};
  global.trips.forEach(t => {
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

  let pickupText = constructTextSpan(pickups, true, 3);
  $("#fave-pickup").html(pickupText);

  let dropoffText = constructTextSpan(dropoffs, true, 3);
  $("#fave-dropoff").html(dropoffText);
}

function calculateMonthAndYearStats() {
  let years = {};
  let months = {};
  const today = new Date();
  let totalSpentThisYear = {};
  global.trips.forEach(t => {
    let date = new Date(t.requestTime);
    let year = date.getFullYear();
    let month = date.toLocaleString("en-us", {
      month: "long"
    });

    if (date.getFullYear() === today.getFullYear()) {
      if (!totalSpentThisYear.hasOwnProperty(month)) {
        totalSpentThisYear[month] = 0;
      }
      totalSpentThisYear[month] += getCurrencyConversionIfExists(t.currencyCode, t.clientFare)
    }

    if (!years.hasOwnProperty(year)) {
      years[year] = 0;
    }
    years[year]++;
    if (!months.hasOwnProperty(month)) {
      months[month] = 0;
    }
    months[month]++;
  });

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

  let monthSpentKeys = Object.keys(totalSpentThisYear);
  monthSpentKeys.sort((a, b) => {
    return monthNames[a] - monthNames[b];
  });
  let monthlySpendSoFar = '';
  for (const key of monthSpentKeys) {
    monthlySpendSoFar += `<span class="subheading">${key}</span><span class="stat">$${totalSpentThisYear[key].toFixed(2)}</span><br>`;
  }
  $("#monthly-prices").html(monthlySpendSoFar);

}

function calculateDistanceStats() {
  let distances = {};

  global.trips.forEach(t => {

    if (t.receipt) {
      let receipt = t.receipt;
      if (!distances.hasOwnProperty(receipt.distance_label)) {
        distances[receipt.distance_label] = 0;
      }
      distances[receipt.distance_label] += parseFloat(receipt.distance);
    }
  });

  let distanceKeys = getSortedKeysFromObject(distances, true);
  if (distanceKeys.length) {
    $(".hidden").removeClass("hidden");
    let distanceText = '';
    for (const key of distanceKeys) {
      distanceText += `<span class="subheading">${uppercaseFirst(key)}</span><span class="stat"> ${Math.round(distances[key])}</span><br>`;
    }
    $("#distances").html(distanceText);
    addDistanceChart();
  }
}

function calculateCarMakeStats() {
  let carMakes = {};

  global.trips.forEach(t => {
    if (t.receipt) {
      let receipt = t.receipt;
      if (!carMakes.hasOwnProperty(receipt.car_make)) {
        carMakes[receipt.car_make] = 0;
      }
      carMakes[receipt.car_make]++;
    }
  });

  if (Object.keys(carMakes).length) {
    $(".hidden").removeClass("hidden");
    let carText = constructTextSpan(carMakes, true, 3);
    $("#rides-by-car").html(carText);
  }
}

function addTripsAndSpentByMonthChart() {
  const numTripsByMonthCtx = document.getElementById("rides-chart").getContext('2d');
  const amountSpentByMonthCtx = document.getElementById("monthly-spend-chart").getContext('2d');
  /*
   data is an object that stores unix timestamps, by month, along with stats for that month
   This includes the number of trips and the amount spent.

   example:

   data = {
   1559101412066: {
   numTrips: 0,
   amountSpent: 0
   }
   }
   */
  let data = {};
  global.trips.forEach(t => {
    let requestTime = new Date(t.requestTime);
    // Get date that is first of the month to provide lower bound
    let lowerBound = new Date(requestTime.getFullYear(), requestTime.getMonth(), 1);
    if (!data.hasOwnProperty(lowerBound.getTime())) {
      data[lowerBound.getTime()] = {
        numTrips: 0,
        amountSpent: 0
      };
    }
    if (t.clientFare) {
      const amountSpentOnTrip = getCurrencyConversionIfExists(t.currencyCode, t.clientFare);
      data[lowerBound.getTime()].amountSpent += amountSpentOnTrip;
    }
    data[lowerBound.getTime()].numTrips++;
  });
  let times = Object.keys(data);
  // times stores Unix time stamp kv pairs
  times.sort((a, b) => a - b);
  // Fill in 0s for months with no rides
  if (times.length) {
    // Month of first uber ride ever
    let monthToCheck = new Date(parseInt(times[0]));
    let now = new Date();
    while (monthToCheck < now) {
      if (!data.hasOwnProperty((monthToCheck.getTime()))) {
        data[monthToCheck.getTime()] = {
          numTrips: 0,
          amountSpent: 0
        };
      }
      monthToCheck = monthToCheck.next().month();
    }
  }
  // Get the keys again, as we might've just added some 0 months
  times = Object.keys(data);
  times.sort((a, b) => a - b);
  let finalCountsTripCounts = [];
  let finalCountsSpendCounts = [];
  for (const key of times) {
    finalCountsTripCounts.push({
      x: new Date(parseInt(key)),
      y: data[key].numTrips
    });
    finalCountsSpendCounts.push({
      x: new Date(parseInt(key)),
      y: data[key].amountSpent
    });
  }

  const chart = new Chart(numTripsByMonthCtx, {
    type: 'line',
    data: {
      datasets: [{
        label: "Rides Taken",
        data: finalCountsTripCounts,
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
            // xlabel is always in the format Month 1, Year
            // remove the '1, ' so that it's just "Month Year"
            return tooltipItem[0].xLabel.replace("1, ", "");
          }
        }
      }
    }
  });
  $("#rides-chart").css('background-color', 'white');
  chart.render();

  const monthlySpend = new Chart(amountSpentByMonthCtx, {
    type: 'line',
    data: {
      datasets: [{
        label: "Amount Spent",
        data: finalCountsSpendCounts,
        fill: false,
        borderColor: 'black'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: true,
        text: "Amount Spent by Month"
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
          },
          label: function (tooltipItem, data) {
            var label = data.datasets[tooltipItem.datasetIndex].label || '';

            if (label) {
              label += ': ';
            }
            label += Math.round(tooltipItem.yLabel * 100) / 100;
            return label;
          }
        }
      }
    }
  });
  $("#monthly-spend-chart").css('background-color', 'white');
  monthlySpend.render();

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
          distance *= 0.62137119; // convert km to miles
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
        fill: true,
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
  chart.render();

}

function addPriceChart() {
  const ctx = document.getElementById("price-chart").getContext('2d');
  let data = {};
  global.trips.forEach(t => {
    if (t && t.clientFare) {
      let requestTime = new Date(t.requestTime);
      if (!data.hasOwnProperty(requestTime.getTime())) {
        data[requestTime.getTime()] = getCurrencyConversionIfExists(t.currencyCode, parseFloat(t.clientFare));
      }
    }
  });
  const times = Object.keys(data);
  times.sort((a, b) => a - b);
  let finalCounts = [];
  let totalSpent = 0;
  for (const key of times) {
    totalSpent += data[key];
    finalCounts.push({
      x: new Date(parseInt(key)),
      y: totalSpent
    });
  }
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: "Total Spent (Aggregate, no currency conversion)",
        data: finalCounts,
        fill: true,
        borderColor: 'black'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: true,
        text: "Total Spent"
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
  $("#price-chart").css('background-color', 'white');
  chart.render();

}

function registerClickHandlers() {
  $("#export").click(async e => {
    let trips = [...global.trips.values()];
    const {value} = await Swal.fire({
      title: 'CSV or JSON',
      input: 'radio',
      inputOptions: {
        csv: "CSV",
        json: "JSON",
        full: "JSON (Full Details)",
      }
    });
    if (value) {
      if (value === 'csv') {
        let csv = convertArrayOfObjectsToCSV({
          data: trips
        });
        if (csv == null) {
          return;
        }
        downloadFile('trips.csv', csv);
        alert("Note: Fields that are JSON objects are base64 encoded");

      } else if (value === "json") {
        let json = JSON.stringify(trips);
        downloadFile('trips.json', json);
      } else if (value === "full") {
        let json = JSON.stringify({
          trips,
          cities: [...global.cities.values()],
          drivers: [...global.drivers.values()],
          payment: [...global.payment.values()],
        });
        downloadFile('trips-full.json', json);
      }
    }
  });

  $("#share").click(e => {
    let minutes = $("#minutes").text();
    if (minutes) {
      minutes = minutes.trim();
    }
    let numUbers = global.trips.size;
    let text = `I've taken ${numUbers} Ubers, and have spent ${minutes} minutes in Ubers! Check out your numbers using RideShareStats by @jonlucadecaro here: `;
    window.open("https://twitter.com/share?url=https://chrome.google.com/webstore/detail/uber-trip-stats/kddlnbejbpknoedebeojobofnbdfhpnm&text=" + encodeURIComponent(text), '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');
    return false;
  });

  $("#export-image").click(e => {
    $(".should-hide-in-image").hide();
    let options = {backgroundColor: '#000'};
    html2canvas($('.container')[0], options).then(function (canvas) {
      console.log(canvas);
      let a = document.createElement('a');
      // toDataURL defaults to png, so we need to request a jpeg, then convert for file download.
      a.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      a.download = 'stats.png';
      a.style.display = 'none';
      a.click();
      $(".should-hide-in-image").show();
    });
  });
}
