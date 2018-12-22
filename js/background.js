chrome.browserAction.onClicked.addListener(function (tab) {
  console.log(tab);
  if (tab.url && tab.url.indexOf('riders.uber') !== -1) {
    chrome.tabs.executeScript(null, {
      file: "UberStats.js"
    });
  } else {
    const newURL = "https://riders.uber.com/trips";
    chrome.tabs.create({url: newURL}, function (tab) {
      setTimeout(_ => {
        chrome.tabs.executeScript(null, {
          file: "UberStats.js"
        });
      }, 5000);
    });
  }
});