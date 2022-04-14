// Make all global variables "var" so that they can be redeclared upon multiple executions of the script
var global = {};

global.orders = new Map();

var csrf = null;
var EATS_ENDPOINT = "https://www.ubereats.com/api/getPastOrdersV1";

$((_) => {
  if (window.location.hostname.endsWith("ubereats.com")) {
    startUberEatsAnalysis();
  }
});

function startUberEatsAnalysis() {
  if (!csrf) {
    // csrf = window.csrfToken; // lol
    csrf = "x";
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

async function makeRequestByCursor(cursor) {
  const headers = {
    "x-csrf-token": csrf,
    "Content-Type": "application/json",
  };
  let limit = 10;
  for (let i = 0; i < 3; i++) {
    try {
      const resp = await fetch(EATS_ENDPOINT, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          lastWorkflowUUID: cursor,
          limit,
        }),
      });
      const response = await resp.json();
      const data = response?.data;
      let uuids = data.orderUuids;
      if (data?.ordersMap) {
        const orders = data.ordersMap;
        for (const order of Object.keys(orders)) {
          global.orders.set(order, orders[order]);
        }
      }
      if (uuids.length === 0 && limit === 10) {
        limit = 1;
        continue;
      }
      $("#text").html(`Processing API <br>Loaded ${global.orders.size} orders`);
      return data;
    } catch (e) {
      console.error(e);
    }
  }
}

async function fetchData() {
  let data = await makeRequestByCursor(null);
  while (data?.meta?.hasMore) {
    let uuids = data.orderUuids;
    data = await makeRequestByCursor(uuids[uuids.length - 1]);
  }
  complete();
}

function complete() {
  let serialized = {};
  serialized.orders = [...global.orders];
  chrome.runtime.sendMessage({ globalEats: serialized });
  $("#overlay").hide();
}
