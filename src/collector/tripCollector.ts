import pLimit from "p-limit";
import { browser } from "wxt/browser";
import { COLLECTION_COMPLETE, GET_CACHED_TRIPS, type CollectionCompleteMessage, type StartCollectionResponse } from "../data/messages";
import { mergeTripMaps, type StoredTripData } from "../data/storage";
import { createActivitiesRequest, createGetTripRequest } from "../data/uberRequests";
import type { ActivitiesResponse, GetTrip, GetTripResponse, Past } from "../types/UberApi";
import { CollectionOverlay } from "./collectionOverlay";

const ENDPOINT = "https://riders.uber.com/graphql";
const CONCURRENT_TRIP_REQUESTS = 8;
const CACHE_REFRESH_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

interface GraphQLPayload {
  errors?: Array<{ message?: string }>;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelay(attempt: number, error: unknown): number {
  if (error instanceof RequestError && error.retryAfterMs !== null) {
    return Math.min(error.retryAfterMs, 30_000);
  }
  return Math.min(750 * 2 ** attempt, 15_000) + Math.floor(Math.random() * 350);
}

function isRetryable(error: unknown): boolean {
  return (
    !(error instanceof RequestError) ||
    error.status === null ||
    error.status === 408 ||
    error.status === 425 ||
    error.status === 429 ||
    error.status >= 500
  );
}

function retryAfterMilliseconds(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

class RideShareStats {
  private readonly activityIds = new Set<string>();
  private readonly fullTripMap: Record<string, GetTrip> = {};
  private cooldownUntil = 0;
  private csrf = "x";
  private failedTripCount = 0;
  private readonly overlay = new CollectionOverlay("Keep this tab open. Trip data is processed locally and is never sent to our servers.");

  private async postGraphQL<T>(body: unknown): Promise<T> {
    const cooldown = this.cooldownUntil - Date.now();
    if (cooldown > 0) {
      await delay(cooldown);
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-uber-rv-session-type": "desktop_session",
        "x-csrf-token": this.csrf,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const retryAfter = retryAfterMilliseconds(response.headers.get("retry-after"));
      if (response.status === 429) {
        this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + (retryAfter ?? 1500));
      }
      throw new RequestError(`Uber request failed with status ${response.status}`, response.status, retryAfter);
    }

    const payload = (await response.json()) as T & GraphQLPayload;
    if (payload.errors?.length) {
      throw new RequestError(payload.errors.map((error) => error.message ?? "Unknown GraphQL error").join("; "));
    }
    return payload;
  }

  private async withRetry<T>(request: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await request();
      } catch (error) {
        lastError = error;
        if (attempt === MAX_ATTEMPTS - 1 || !isRetryable(error)) {
          break;
        }
        await delay(retryDelay(attempt, error));
      }
    }
    throw lastError;
  }

  private async getCachedTrips(): Promise<StoredTripData | null> {
    try {
      return (await browser.runtime.sendMessage({ type: GET_CACHED_TRIPS })) as StoredTripData | null;
    } catch {
      return null;
    }
  }

  private async requestActivityPage(nextPageToken?: string): Promise<Past> {
    const response = await this.withRetry(() => this.postGraphQL<ActivitiesResponse>(createActivitiesRequest(nextPageToken)));
    return response.data.activities.past;
  }

  private async requestTrip(tripUUID: string): Promise<GetTrip> {
    const response = await this.withRetry(() => this.postGraphQL<GetTripResponse>(createGetTripRequest(tripUUID)));
    if (!response.data.getTrip) {
      throw new RequestError(`Uber returned no details for trip ${tripUUID}`);
    }
    return response.data.getTrip;
  }

  private async findActivities() {
    let nextPageToken: string | undefined;
    do {
      const page = await this.requestActivityPage(nextPageToken);
      for (const activity of page.activities) {
        this.activityIds.add(activity.uuid);
      }
      this.overlay.setProgress("Finding your trips", `${this.activityIds.size.toLocaleString()} trips found`);
      nextPageToken = page.nextPageToken || undefined;
    } while (nextPageToken);
  }

  private reuseStableCachedTrips(dataset: StoredTripData | null) {
    if (!dataset) {
      return;
    }

    const refreshCutoff = Date.now() - CACHE_REFRESH_AGE_MS;
    for (const uuid of this.activityIds) {
      const cached = dataset.trips[uuid];
      const beginTime = cached?.trip.beginTripTime ? Date.parse(cached.trip.beginTripTime) : Number.NaN;
      if (cached && Number.isFinite(beginTime) && beginTime < refreshCutoff) {
        this.fullTripMap[uuid] = cached;
      }
    }
  }

  private async loadTripDetails(cached: StoredTripData | null) {
    this.reuseStableCachedTrips(cached);
    const pendingIds = [...this.activityIds].filter((uuid) => !this.fullTripMap[uuid]);
    const limit = pLimit(CONCURRENT_TRIP_REQUESTS);
    let completed = this.activityIds.size - pendingIds.length;

    this.overlay.setProgress(
      "Analyzing trip details",
      completed > 0 ? `${completed.toLocaleString()} cached trips reused` : `0 of ${this.activityIds.size.toLocaleString()} trips`,
      completed,
      this.activityIds.size,
    );

    await Promise.all(
      pendingIds.map((uuid) =>
        limit(async () => {
          try {
            this.fullTripMap[uuid] = await this.requestTrip(uuid);
          } catch {
            const fallback = cached?.trips[uuid];
            if (fallback) {
              this.fullTripMap[uuid] = fallback;
            }
            this.failedTripCount++;
          } finally {
            completed++;
            this.overlay.setProgress(
              "Analyzing trip details",
              `${completed.toLocaleString()} of ${this.activityIds.size.toLocaleString()} trips`,
              completed,
              this.activityIds.size,
            );
          }
        }),
      ),
    );
  }

  private async finish(cached: StoredTripData | null) {
    const payload: StoredTripData = {
      collectedAt: new Date().toISOString(),
      failedTripCount: this.failedTripCount,
      trips: mergeTripMaps(cached?.trips, this.fullTripMap),
      version: 2,
    };
    const message: CollectionCompleteMessage = { payload, type: COLLECTION_COMPLETE };
    this.overlay.setProgress("Analysis complete", "Opening your dashboard…", 1, 1);
    await browser.runtime.sendMessage(message);
    this.overlay.remove();
  }

  private showError(error: unknown) {
    const message = error instanceof Error ? error.message : "Uber did not return trip data.";
    this.overlay.showError("Couldn’t load your trips", `${message} Refresh this page and try the extension again.`);
  }

  async start() {
    if (CollectionOverlay.isOpen()) {
      return;
    }

    const csrfText = document.getElementById("__CSRF_TOKEN__")?.textContent?.trim();
    if (csrfText) {
      this.csrf = csrfText.replace(/\\u0022/g, "").replace(/^"|"$/g, "") || "x";
    }

    this.overlay.show("Finding your trips", "Reading your Uber history…");
    try {
      const cachedTripsPromise = this.getCachedTrips();
      await this.findActivities();
      const cached = await cachedTripsPromise;
      await this.loadTripDetails(cached);
      await this.finish(cached);
    } catch (error) {
      this.showError(error);
    }
  }
}

export function startTripCollection(): StartCollectionResponse {
  if (CollectionOverlay.isOpen()) {
    return { started: true };
  }

  void new RideShareStats().start();
  return { started: true };
}
