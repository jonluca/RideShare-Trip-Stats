import { browser } from "webextension-polyfill-ts";

import eats from "./EatsStats?script";
import rides from "./RideShareStats?script";

const runtime = browser.runtime || chrome.runtime;
const commands = browser.commands || chrome.commands;

function openResultsPage() {
  browser.tabs.create({ url: browser.runtime.getURL("index.html") });
}

function openEatsResultsPage() {
  browser.tabs.create({ url: browser.runtime.getURL("html/eats.html") });
}

browser.runtime.onMessage.addListener(async (request, sender) => {
  if (request.global) {
    await browser.storage.local.set({ global: request.global });
    openResultsPage();
  }
  if (request.globalEats) {
    await browser.storage.local.set({ globalEats: request.globalEats });
    openEatsResultsPage();
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
    } else if (url.hostname.endsWith("ubereats.com")) {
      script = eats;
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

if (commands) {
  commands.onCommand.addListener(function (command) {
    console.log("onCommand event received for message: ", command);
  });
}
