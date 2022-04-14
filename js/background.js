chrome.browserAction.onClicked.addListener(function (tab) {
  const url = new URL(tab.url);
  if (url.hostname.endsWith("uber.com")) {
    chrome.tabs.executeScript(null, {
      file: "RideShareStats.js"
    });
  } else if (url.hostname.endsWith("ubereats.com")) {
    chrome.tabs.executeScript(null, {
      file: "EatsStats.js"
    });
  } else {
    chrome.tabs.executeScript(null, {
      file: "js/libs/sweetalert2.all.min.js"
    }, _ => {
      chrome.tabs.create({url: chrome.extension.getURL("html/oninstall.html")}, function (tab) {
      });
    });
  }
});


chrome.runtime.onInstalled.addListener(function (object) {
  chrome.tabs.create({url: chrome.extension.getURL("html/oninstall.html")}, function (tab) {
  });
});
