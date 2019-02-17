// Make all global variables "var" so that they can be redeclared upon multiple executions of the script
var global = {};

global.orders = new Map();

var csrf = null;
var requestsActive = 0;
var MAX_LIMIT = 100;
var EATS_ENDPOINT = 'https://www.ubereats.com/rtapi/eats/v1/eaters/me/orders';
var STORE_ENDPOINT = 'https://www.ubereats.com/rtapi/eats/v2/eater-store/';

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
    csrf = window.csrfToken; // lol
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
  requestDataFromUber(csrf, MAX_LIMIT, '', true);
}

function requestDataFromUber(csrf, limit, lastWorkflowUuid, isFirstRun) {
  ++requestsActive;
  const params = {
    limit: limit,
    lastWorkflowUuid: lastWorkflowUuid,
    status: 'inactive'
  };
  const urlParams = $.param(params);
  $.ajax({
    method: 'GET',
    url: `${EATS_ENDPOINT}?${urlParams}`,
    headers: {
      "x-csrf-token": csrf
    },
    type: 'json',
    success(response, textStatus, jqXHR) {
      if (response && response.orders) {
        for (const order of response.orders) {
          global.orders.set(order.uuid, order);
        }
        if (response.orders.length) {
          const lastOrder = response.orders.pop();
          requestDataFromUber(csrf, limit, lastOrder.uuid, false);
        }
      }
      $("#text").html(`Processing API <br>Loaded ${global.orders.size} orders`);
      checkIfCompleteOriginalAPI();
    },
    error: function (xhr, ajaxOptions, thrownError) {
      $("#text").html(`Processing API <br>Loaded ${global.orders.size} orders`);
      if (isFirstRun) {
        $("#overlay").hide();
        alert("Please sign in and click UberStats icon again! Make sure you are on https://www.ubereats.com/en-US/orders/");
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
    // window.Swal({
    //   title: 'Request individual trip data?',
    //   html: "Takes significantly longer, and might trigger email receipts due to Uber's cache!<br><br>Clicking No
    // will still show most stats.", type: 'question', showCancelButton: true, confirmButtonColor: '#3085d6',
    // cancelButtonColor: '#d33', confirmButtonText: 'Yes!', cancelButtonText: 'No' }).then((result) => { if
    // (result.value) { requestAllTripInfo(); } else {  } });
    // Once all requests have completed, trigger a new tab and send the data
    let serialized = {};
    serialized.orders = [...global.orders];
    chrome.runtime.sendMessage({globalEats: serialized});
    $("#overlay").hide();
  }
}
