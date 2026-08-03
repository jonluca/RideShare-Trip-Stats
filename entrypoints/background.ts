import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import {
  COLLECTION_COMPLETE,
  EATS_COLLECTION_COMPLETE,
  GET_CACHED_TRIPS,
  START_COLLECTION,
  START_EATS_COLLECTION,
  type CollectionCompleteMessage,
  type EatsCollectionCompleteMessage,
  type GetCachedTripsMessage,
  type StartCollectionMessage,
  type StartEatsCollectionMessage,
} from "../src/data/messages";
import { LEGACY_TRIP_DATA_STORAGE_KEY, mergeTripMaps, TRIP_DATA_STORAGE_KEY, type StoredTripData } from "../src/data/storage";

const UBER_TRIPS_URL = "https://riders.uber.com/trips";
const UBER_EATS_ORDERS_URL = "https://www.ubereats.com/orders";

function parsedUrl(urlString?: string): URL | null {
  if (!urlString) {
    return null;
  }
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
}

function isUberRidesPage(urlString?: string): boolean {
  const url = parsedUrl(urlString);
  return url?.protocol === "https:" && url.hostname === "riders.uber.com";
}

function isUberEatsPage(urlString?: string): boolean {
  const url = parsedUrl(urlString);
  return url?.protocol === "https:" && url.hostname === "www.ubereats.com";
}

function isUberEatsOrdersPage(urlString?: string): boolean {
  const url = parsedUrl(urlString);
  return Boolean(
    url?.protocol === "https:" &&
    url.hostname === "www.ubereats.com" &&
    (url.pathname === "/orders" || url.pathname.startsWith("/orders/")),
  );
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

type BackgroundMessage = CollectionCompleteMessage | EatsCollectionCompleteMessage | GetCachedTripsMessage;

function isBackgroundMessage(value: unknown): value is BackgroundMessage {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  const type = (value as { type?: unknown }).type;
  return type === COLLECTION_COMPLETE || type === EATS_COLLECTION_COMPLETE || type === GET_CACHED_TRIPS;
}

async function waitForTabToLoad(tabId: number) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const tab = await browser.tabs.get(tabId);
    if (tab.status === "complete") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function sendCollectionMessage(tabId: number, message: StartCollectionMessage | StartEatsCollectionMessage) {
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch {
    // Static content scripts are added on navigation, so refresh a tab that
    // was already open when the extension was installed or reloaded.
    await browser.tabs.reload(tabId);
    await waitForTabToLoad(tabId);
    await browser.tabs.sendMessage(tabId, message);
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isBackgroundMessage(message)) {
      return false;
    }

    if (message.type === COLLECTION_COMPLETE) {
      return browser.storage.local.set({ [TRIP_DATA_STORAGE_KEY]: message.payload }).then(openResultsPage);
    }

    if (message.type === EATS_COLLECTION_COMPLETE) {
      return openResultsPage();
    }

    return getCachedTrips();
  });

  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id === undefined || !tab.url) {
      await browser.tabs.create({ url: UBER_TRIPS_URL });
      return;
    }

    if (isUberEatsPage(tab.url)) {
      if (!isUberEatsOrdersPage(tab.url)) {
        await browser.tabs.update(tab.id, { url: UBER_EATS_ORDERS_URL });
        await waitForTabToLoad(tab.id);
      }
      await sendCollectionMessage(tab.id, { type: START_EATS_COLLECTION } satisfies StartEatsCollectionMessage);
      return;
    }

    if (!isUberRidesPage(tab.url)) {
      await browser.tabs.create({ url: UBER_TRIPS_URL });
      return;
    }

    await sendCollectionMessage(tab.id, { type: START_COLLECTION } satisfies StartCollectionMessage);
  });

  browser.runtime.onInstalled.addListener(() => {
    void browser.tabs.create({ url: browser.runtime.getURL("/oninstall.html") });
  });
});
