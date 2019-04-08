let global = {};

$(_ => {
  chrome.runtime.sendMessage({requestDataEats: true}, function (response) {
    global.orders = new Map(response.data.orders);
    global.stores = new Map();
    global.orders.forEach(e => {
      global.stores.set(e.store.uuid, e.store);
    });
    startStatistics();
    registerClickHandlers();
  });
});

function startStatistics() {
  console.log(global);

  addTotalOrdersStat();
  calculateTotalSpent();
  calculateEndOrderStates();
  calculateTimeStats();
  calculateIndivItemStats();
  calculateFavoriteRestaurants();
  addPriceChart();
}

function addTotalOrdersStat() {
  // Total # trips
  $("#total-orders").text(global.orders.size);
}

function calculateEndOrderStates() {
  const counts = {
    success: 0,
    restaurant_canceled: 0,
    other: 0
  };
  global.orders.forEach(o => {
    if (o.completionStatus && o.completionStatus.completionState) {
      const state = o.completionStatus.completionState;
      if (state === "SUCCESS") {
        counts.success++;
      } else if (state === "RESTAURANT_CANCELLED") {
        counts.restaurant_canceled++;
      } else {
        counts.other++;
      }
    }
  });
  $("#completed-orders").text(counts.success);
  $("#restaurant-canceled-orders").text(counts.restaurant_canceled);
  $("#other-orders").text(counts.other);
}

function calculateIndivItemStats() {
  let counts = {};
  let favoriteItem = null;
  let favoriteCount = null;
  global.orders.forEach(o => {
    if (o.items && o.items.length) {
      for (const item of o.items) {
        if (!counts.hasOwnProperty(item.uuid)) {
          counts[item.uuid] = 0;
        }
        counts[item.uuid]++;
        if (counts[item.uuid] > favoriteCount) {
          favoriteCount = counts[item.uuid];
          favoriteItem = {
            item,
            restaurant: o.uuid
          };
        }
      }
    }
  });
  console.log(favoriteItem);
  const faveItemPrice = (favoriteItem.item.price / favoriteItem.item.quantity) / 100;
  const totalSpentOnFaveItem = faveItemPrice * favoriteCount;
  let faveItemText = `<span class="subheading">Favorite Item</span><span class="stat-eats">${favoriteItem.item.title}</span><br>`;
  faveItemText += `<span class="subheading">Total Spent on Fav. Item</span><span class="stat-eats">${totalSpentOnFaveItem.toFixed(2)}</span><br>`;
  faveItemText += `<span class="subheading">Location of Fav. Item</span><span class="stat-eats">${(global.orders.get(favoriteItem.restaurant)).storeName}</span><br>`;
  $("#favorite-item").html(faveItemText);

}

function calculateTimeStats() {
  let longest = {
    uid: null,
    length: null
  };
  let shortest = {
    uid: null,
    length: null
  };
  let totalTime = 0;
  global.orders.forEach(o => {
    if (o.states) {
      let start = null;
      let end = null;
      for (const entry of o.states) {
        if (entry.type === "orderReceived") {
          start = entry.timeStarted;
        } else if (entry.type === "orderArrived") {
          end = entry.timeStarted;
        }
      }
      if (start && end) {
        const total = end - start;
        totalTime += total;
        if (!longest.uid) {
          longest.uid = o.uuid;
          longest.length = total;
        }
        if (!shortest.uid) {
          shortest.uid = o.uuid;
          shortest.length = total;
        }

        if (total > longest.length) {
          longest.uid = o.uuid;
          longest.length = total;
        }
        if (total < shortest.length) {
          shortest.uid = o.uuid;
          shortest.length = total;
        }
      }
    }
  });
  const averageTime = totalTime / global.orders.size;
  const longestTime = secondsToMinutes(longest.length / 1000);
  const shortestTime = secondsToMinutes(shortest.length / 1000);
  const totalTimeString = secondsToMinutes(totalTime / 1000);
  const averageTimeString = secondsToMinutes(averageTime / 1000);

  $("#longest-order").text(longestTime);
  $("#shortest-order").text(shortestTime);
  $("#total-time").text(totalTimeString);
  $("#average-time-order").text(averageTimeString);
}

function calculateTotalSpent() {
  let totalSpent = {};
  let totalAcrossAllCurrencies = 0;
  let totalTaxAcrossAllCurrencies = 0;
  let totalFoodAcrossAllCurrencies = 0;
  let totalDelivFeesAcrossAllCurrencies = 0;
  let completedOrders = 0;
  global.orders.forEach(o => {
    if (o.checkoutInfo) {
      if (!totalSpent.hasOwnProperty(o.currencyCode)) {
        totalSpent[o.currencyCode] = 0;
      }
      for (const priceEntry of o.checkoutInfo) {
        if (priceEntry.key === "eats_fare.total") {
          totalSpent[o.currencyCode] += parseFloat(priceEntry.rawValue);
          totalAcrossAllCurrencies += getCurrencyConversionIfExists(o.currencyCode, priceEntry.rawValue);
        } else if (priceEntry.key === "eats.mp.charges.booking_fee") {
          totalDelivFeesAcrossAllCurrencies += getCurrencyConversionIfExists(o.currencyCode, priceEntry.rawValue);
        } else if (priceEntry.key === "eats_fare.subtotal") {
          totalFoodAcrossAllCurrencies += getCurrencyConversionIfExists(o.currencyCode, priceEntry.rawValue);
        } else if (priceEntry.key === "eats.tax.base") {
          totalTaxAcrossAllCurrencies += getCurrencyConversionIfExists(o.currencyCode, priceEntry.rawValue);
        }
      }
    }
    if (o.completionStatus.completionState === "SUCCESS") {
      completedOrders++;
    }
  });

  // $ spent stats
  $("#total-payment").text("~$" + totalAcrossAllCurrencies.toFixed(2));
  let totalSpentText = "";
  let currencyKeys = getSortedKeysFromObject(totalSpent, true);
  for (const key of currencyKeys) {
    let currencySymbol = getSymbolFromCode(key);
    totalSpentText += `<span class="subheading">${key}</span><span class="stat-eats"> ${currencySymbol + totalSpent[key].toFixed(2)}</span><br>`;
  }
  $("#total-spent").html(totalSpentText);
  $("#average-price").text("~$" + (totalAcrossAllCurrencies / completedOrders).toFixed(2));
  $("#total-tax").text("~$" + (totalTaxAcrossAllCurrencies).toFixed(2));
  $("#total-deliv").text("~$" + (totalDelivFeesAcrossAllCurrencies).toFixed(2));
  $("#total-food").text("~$" + (totalFoodAcrossAllCurrencies).toFixed(2));
  // addPriceChart();
}

function calculateFavoriteRestaurants() {
  let counts = {};
  global.orders.forEach(o => {
    if (!counts.hasOwnProperty(o.store.uuid)) {
      counts[o.store.uuid] = 0;
    }
    counts[o.store.uuid]++;
  });
  let sortedCounts = getSortedKeysFromObject(counts, true);
  let max = sortedCounts.length > 5 ? 5 : sortedCounts.length;
  let faveString = "";
  for (let i = 0; i < max; i++) {
    const restaurant = global.stores.get(sortedCounts[i]);
    faveString += `<span class="subheading">${restaurant.title}</span><span class="stat-eats"> ${counts[sortedCounts[i]]}</span><br>`;
  }
  $("#fave-restaurants").html(faveString);
}

function registerClickHandlers() {
  $("#export").click(async (e) => {
    let orders = [...global.orders.values()];
    const {value} = await Swal.fire({
      title: 'CSV or JSON',
      input: 'radio',
      inputOptions: {
        csv: "CSV",
        json: "JSON"
      }
    });
    if (value) {
      if (value === 'csv') {
        let csv = convertArrayOfObjectsToCSV({
          data: orders
        });
        if (csv == null) {
          return;
        }
        let hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'orders.csv';
        hiddenElement.click();
        alert("Note: Fields that are JSON objects are base64 encoded");

      } else if (value === "json") {
        let json = JSON.stringify(orders);
        let hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/json;charset=utf-8,' + encodeURI(json);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'orders.json';
        hiddenElement.click();
      }
    }
  });

  $("#share").click(e => {
    let orders = $("#total-orders").text();
    if (orders) {
      orders = orders.trim();
    }
    let text = `I've ordered ${orders} orders from UberEats, and have spent ${$("#total-spent").text()}! Check out your numbers using RideShareStats by @jonlucadecaro here: `;
    window.open("https://twitter.com/share?url=https://chrome.google.com/webstore/detail/rideshare-trip-stats/kddlnbejbpknoedebeojobofnbdfhpnm&text=" + encodeURIComponent(text), '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');
    return false;
  });

  $("#export-image").click(e => {
    $(".should-hide-in-image").hide();
    let options = {backgroundColor: '#75b437'};
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

function addPriceChart() {
  const ctx = document.getElementById("spent-chart").getContext('2d');
  let data = {};
  global.orders.forEach(o => {
    if (o.checkoutInfo) {
      for (const priceEntry of o.checkoutInfo) {
        if (priceEntry.key === "eats_fare.total") {
          for (const state of o.states) {
            if (state.type === "orderReceived") {
              let requestTime = new Date(state.timeStarted);
              if (!data.hasOwnProperty(requestTime.getTime())) {
                data[requestTime.getTime()] = getCurrencyConversionIfExists(o.currencyCode, priceEntry.rawValue);
              }
            }
          }
        }
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
  $("#spent-chart").css('background-color', 'white');
  chart.render();

}
