import browser from "webextension-polyfill";

import rides from "./RideShareStats?script";

const runtime = browser.runtime || chrome.runtime;

interface RuntimeMessage {
  global?: unknown;
  requestData?: boolean;
}

function openResultsPage() {
  browser.tabs.create({ url: browser.runtime.getURL("index.html") });
}

browser.runtime.onMessage.addListener(async (message: unknown) => {
  const request = message as RuntimeMessage;
  if (request.global) {
    await browser.storage.local.set({ global: request.global });
    openResultsPage();
  }
  if (request.requestData) {
    const { global } = await browser.storage.local.get("global");
    return global;
  }
});

if (runtime) {
  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) {
      return;
    }

    const url = new URL(tab.url);
    if (url.protocol !== "https:" || url.hostname !== "riders.uber.com") {
      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: [rides],
    });
  });

  runtime.onInstalled.addListener(function () {
    browser.tabs.create({
      url: runtime.getURL("html/oninstall.html"),
    });
  });
}
