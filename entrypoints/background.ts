import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { COLLECTION_COMPLETE, GET_CACHED_TRIPS, type RuntimeMessage } from "../src/data/messages";
import { TRIP_DATA_STORAGE_KEY, type StoredTripData } from "../src/data/storage";

const UBER_TRIPS_URL = "https://riders.uber.com/trips";

async function openResultsPage() {
  await browser.tabs.create({ url: browser.runtime.getURL("/results.html") });
}

async function getCachedTrips(): Promise<StoredTripData | null> {
  const stored = await browser.storage.local.get(TRIP_DATA_STORAGE_KEY);
  const dataset = stored[TRIP_DATA_STORAGE_KEY] as StoredTripData | undefined;
  return dataset?.version === 2 ? dataset : null;
}

function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  return (value as { type?: unknown }).type === COLLECTION_COMPLETE || (value as { type?: unknown }).type === GET_CACHED_TRIPS;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isRuntimeMessage(message)) {
      return false;
    }

    if (message.type === COLLECTION_COMPLETE) {
      return browser.storage.local.set({ [TRIP_DATA_STORAGE_KEY]: message.payload }).then(openResultsPage);
    }

    return getCachedTrips();
  });

  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) {
      await browser.tabs.create({ url: UBER_TRIPS_URL });
      return;
    }

    let url: URL;
    try {
      url = new URL(tab.url);
    } catch {
      await browser.tabs.create({ url: UBER_TRIPS_URL });
      return;
    }

    if (url.protocol !== "https:" || url.hostname !== "riders.uber.com") {
      await browser.tabs.create({ url: UBER_TRIPS_URL });
      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/rideshare.js"],
    });
  });

  browser.runtime.onInstalled.addListener(() => {
    void browser.tabs.create({ url: browser.runtime.getURL("/oninstall.html") });
  });
});
