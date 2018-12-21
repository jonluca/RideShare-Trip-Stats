let data = {};

function openResultsPage(results) {
  chrome.tabs.create({'url': chrome.extension.getURL('html/index.html')});
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.global) {
    data = request.global;
    openResultsPage();
  }
  if (request.requestData) {
    sendResponse({data: data});
  }
});