import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import {
  COLLECTION_COMPLETE,
  GET_CACHED_TRIPS,
  START_COLLECTION,
  type RuntimeMessage,
  type StartCollectionResponse,
} from "../src/data/messages";
import { TRIP_DATA_STORAGE_KEY, type StoredTripData } from "../src/data/storage";

const UBER_TRIPS_URL = "https://riders.uber.com/trips";

function isUberPage(urlString?: string): boolean {
  if (!urlString) {
    return false;
  }
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && url.hostname === "riders.uber.com";
  } catch {
    return false;
  }
}

async function openResultsPage() {
  await browser.tabs.create({ url: browser.runtime.getURL("/results.html") });
}

async function getCachedTrips(): Promise<StoredTripData | null> {
  const stored = await browser.storage.local.get(TRIP_DATA_STORAGE_KEY);
  const dataset = stored[TRIP_DATA_STORAGE_KEY] as StoredTripData | undefined;
  return dataset?.version === 2 ? dataset : null;
}

async function startCollection(tabId: number): Promise<StartCollectionResponse> {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["/rideshare.js"],
    });
    return { started: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not start trip analysis.",
      started: false,
    };
  }
}

function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  const type = (value as { type?: unknown }).type;
  return type === COLLECTION_COMPLETE || type === GET_CACHED_TRIPS || type === START_COLLECTION;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isRuntimeMessage(message)) {
      return false;
    }

    if (message.type === COLLECTION_COMPLETE) {
      return browser.storage.local.set({ [TRIP_DATA_STORAGE_KEY]: message.payload }).then(openResultsPage);
    }

    if (message.type === GET_CACHED_TRIPS) {
      return getCachedTrips();
    }

    const tabId = sender.tab?.id;
    if (!tabId || !isUberPage(sender.tab?.url ?? sender.url)) {
      return Promise.resolve({ error: "The Uber tab could not be identified.", started: false } satisfies StartCollectionResponse);
    }
    return startCollection(tabId);
  });

  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) {
      await browser.tabs.create({ url: UBER_TRIPS_URL });
      return;
    }

    if (!isUberPage(tab.url)) {
      await browser.tabs.create({ url: UBER_TRIPS_URL });
      return;
    }

    await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ["/launcher.js"] });
  });

  browser.runtime.onInstalled.addListener(() => {
    void browser.tabs.create({ url: browser.runtime.getURL("/oninstall.html") });
  });
});
