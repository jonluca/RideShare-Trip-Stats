// Make all global variables "var" so that they can be redeclared upon multiple executions of the script
var global = {};

global.orders = new Map();

var csrf = null;
var requestsActive = 0;
var EATS_ENDPOINT = 'https://www.ubereats.com/api/getPastOrdersV1';

$(_ => {
  if (window.location.hostname.endsWith("ubereats.com")) {
    startUberEatsAnalysis();
  } else {
    if (confirm("You must be on ubereats.com to use this tool! Redirecting now.")) {
      window.location.href = "https://www.ubereats.com/en-US/orders/";
    }
  }
});

function startUberEatsAnalysis() {
  if (!csrf) {
    // csrf = window.csrfToken; // lol
    csrf = 'x';
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
  requestDataFromUber(csrf, null, true);
}

function requestDataFromUber(csrf, cursor, isFirstRun) {
  ++requestsActive;

  fetch(EATS_ENDPOINT, {
    method: 'POST',
    headers: {
      "x-csrf-token": csrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cursor: cursor,
      limit: 200
    })
  }).then(function (response) {
    return response.json();
  }).then(response => {
    const data = response?.data;
    if (data?.ordersMap) {
      const orders = data.ordersMap;
      for (const order of Object.keys(orders)) {
        global.orders.set(order, orders[order]);
      }
      if (data.paginationData.nextCursor) {
        requestDataFromUber(csrf, data.paginationData.nextCursor, false);
      }
    }
    $("#text").html(`Processing API <br>Loaded ${global.orders.size} orders`);
    checkIfCompleteOriginalAPI();
  }).catch(error => {
    $("#text").html(`Processing API <br>Loaded ${global.orders.size} orders`);
    if (isFirstRun) {
      $("#overlay").hide();
      alert(`Please sign in and click UberStats icon again! Make sure you are on https://www.ubereats.com/en-US/orders/. Error: ${error}`);
      return;
    }
    checkIfCompleteOriginalAPI();
  });

}

function checkIfCompleteOriginalAPI() {
  --requestsActive;
  if (requestsActive === 0) {
    $("#overlay").hide();
    let serialized = {};
    serialized.orders = [...global.orders];
    chrome.runtime.sendMessage({globalEats: serialized});
    $("#overlay").hide();
  }
}
