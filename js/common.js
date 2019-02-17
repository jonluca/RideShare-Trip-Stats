let data = {};
let uberEatsData = {};

function openResultsPage() {
  chrome.tabs.create({'url': chrome.extension.getURL('html/index.html')});
}

function openEatsResultsPage() {
  chrome.tabs.create({'url': chrome.extension.getURL('html/eats.html')});
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.global) {
    data = request.global;
    openResultsPage();
  }
  if (request.globalEats) {
    uberEatsData = request.globalEats;
    openEatsResultsPage();
  }
  if (request.requestData) {
    sendResponse({data: data});
  }
  if (request.requestDataEats) {
    sendResponse({data: uberEatsData});
  }
});
