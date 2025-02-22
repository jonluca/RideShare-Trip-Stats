import { browser } from "webextension-polyfill-ts";

import rides from "./RideShareStats?script";

const runtime = browser.runtime || chrome.runtime;

function openResultsPage() {
  browser.tabs.create({ url: browser.runtime.getURL("index.html") });
}

browser.runtime.onMessage.addListener(async (request) => {
  if (request.global) {
    await browser.storage.local.set({ global: request.global });
    openResultsPage();
  }
  if (request.requestData) {
    const { global } = await browser.storage.local.get("global");
    return global;
  }
  if (request.requestDataEats) {
    const { globalEats } = await browser.storage.local.get("globalEats");
    return globalEats;
  }
});

if (runtime) {
  browser.action.onClicked.addListener(async (tab) => {
    const url = new URL(tab.url!);
    let script: string = "";
    if (url.hostname.endsWith("uber.com")) {
      script = rides;
    }
    // Executes the script in the current tab
    if (script) {
      await browser.scripting.executeScript({
        target: { tabId: tab.id! },
        files: [script],
      });
    }
  });

  runtime.onInstalled.addListener(function () {
    browser.tabs.create({
      url: runtime.getURL("html/oninstall.html"),
    });
  });
}
