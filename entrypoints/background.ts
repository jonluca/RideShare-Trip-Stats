import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import {
  COLLECTION_COMPLETE,
  GET_CACHED_TRIPS,
  START_COLLECTION,
  type CollectionCompleteMessage,
  type GetCachedTripsMessage,
  type StartCollectionMessage,
} from "../src/data/messages";
import { LEGACY_TRIP_DATA_STORAGE_KEY, mergeTripMaps, TRIP_DATA_STORAGE_KEY, type StoredTripData } from "../src/data/storage";

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
  const stored = await browser.storage.local.get([TRIP_DATA_STORAGE_KEY, LEGACY_TRIP_DATA_STORAGE_KEY]);
  const dataset = stored[TRIP_DATA_STORAGE_KEY] as StoredTripData | undefined;
  const trips = mergeTripMaps(stored[LEGACY_TRIP_DATA_STORAGE_KEY], dataset?.version === 2 ? dataset.trips : undefined);

  if (Object.keys(trips).length === 0 && dataset?.version !== 2) {
    return null;
  }
  return {
    collectedAt: dataset?.collectedAt ?? new Date(0).toISOString(),
    failedTripCount: dataset?.failedTripCount ?? 0,
    trips,
    version: 2,
  };
}

type BackgroundMessage = CollectionCompleteMessage | GetCachedTripsMessage;

function isBackgroundMessage(value: unknown): value is BackgroundMessage {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  const type = (value as { type?: unknown }).type;
  return type === COLLECTION_COMPLETE || type === GET_CACHED_TRIPS;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isBackgroundMessage(message)) {
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

    if (!isUberPage(tab.url)) {
      await browser.tabs.create({ url: UBER_TRIPS_URL });
      return;
    }

    try {
      await browser.tabs.sendMessage(tab.id, { type: START_COLLECTION } satisfies StartCollectionMessage);
    } catch {
      // Static content scripts are added on navigation, so refresh a tab that
      // was already open when the extension was installed or reloaded.
      await browser.tabs.reload(tab.id);
    }
  });

  browser.runtime.onInstalled.addListener(() => {
    void browser.tabs.create({ url: browser.runtime.getURL("/oninstall.html") });
  });
});
