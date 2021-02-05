$(() => {
  init();
});
const createTabAndRunScript = (url, script) => {
  chrome.tabs.create({url}, function (newTab) {
    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
      // make sure the status is 'complete' and it's the right tab
      if (tab.id === newTab.id && changeInfo.status == 'complete') {
        chrome.tabs.executeScript(tab.id, {
          file: script
        });
      }
    });
  });
};

function init() {
  var choice = async () => {
    const {test} = await Swal.fire({
      title: 'Success!',
      html: 'You can trigger this modal at anytime by clicking the icon in the top right. Make sure you go to uber.com and sign in before clicking continue! <a href="https://auth.uber.com/login" target="_blank">Go to uber.com</a>',
      confirmButtonText: 'Continue &rarr;',
      showCancelButton: true
    });
    const {value} = await Swal.fire({
      title: 'Select Uber Product',
      html: 'Important: <b>Once the page has loaded, click the extension icon in the header again</b>',
      input: 'radio',
      showCancelButton: true,
      inputOptions: {
        eats: "UberEats",
        rides: "Uber Rides"
      }
    });
    if (value) {
      if (value === 'eats') {
        createTabAndRunScript("https://www.ubereats.com/en-US/orders/", "EatsStats.js");
      } else if (value === "rides") {
        createTabAndRunScript("https://riders.uber.com/trips", "RideShareStats.js");
      }
    }
  };
  $("#continue").on('click', (ev) => {
    console.log('h');
    choice();
  });
}
