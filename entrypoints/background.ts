import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

interface RuntimeMessage {
  global?: unknown;
  requestData?: boolean;
}

async function openResultsPage() {
  await browser.tabs.create({ url: browser.runtime.getURL("/results.html") });
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const request = message as RuntimeMessage;

    if (request.global !== undefined) {
      void browser.storage.local.set({ global: request.global }).then(openResultsPage);
    }

    if (request.requestData) {
      void browser.storage.local.get("global").then(({ global }) => sendResponse(global));
      return true;
    }

    return false;
  });

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
      files: ["/rideshare.js"],
    });
  });

  browser.runtime.onInstalled.addListener(() => {
    void browser.tabs.create({
      url: browser.runtime.getURL("/oninstall.html"),
    });
  });
});
