import pLimit from "p-limit";
import { browser } from "wxt/browser";
import { COLLECTION_COMPLETE, GET_CACHED_TRIPS, type CollectionCompleteMessage, type StartCollectionResponse } from "../data/messages";
import type { StoredTripData } from "../data/storage";
import { createActivitiesRequest, createGetTripRequest } from "../data/uberRequests";
import type { ActivitiesResponse, GetTrip, GetTripResponse, Past } from "../types/UberApi";

const ENDPOINT = "https://riders.uber.com/graphql";
const CONCURRENT_TRIP_REQUESTS = 20;
const CACHE_REFRESH_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;

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
    return Math.min(error.retryAfterMs, 10_000);
  }
  return 350 * 2 ** attempt + Math.floor(Math.random() * 180);
}

function isRetryable(error: unknown): boolean {
  return !(error instanceof RequestError) || error.status === null || error.status === 429 || error.status >= 500;
}

class RideShareStats {
  private readonly activityIds = new Set<string>();
  private readonly fullTripMap: Record<string, GetTrip> = {};
  private csrf = "x";
  private failedTripCount = 0;
  private overlay: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressDetail: HTMLElement | null = null;
  private progressTitle: HTMLElement | null = null;

  private async postGraphQL<T>(body: unknown): Promise<T> {
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
      const retryAfter = Number(response.headers.get("retry-after"));
      throw new RequestError(
        `Uber request failed with status ${response.status}`,
        response.status,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
      );
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

  private setProgress(title: string, detail: string, completed?: number, total?: number) {
    if (this.progressTitle) {
      this.progressTitle.textContent = title;
    }
    if (this.progressDetail) {
      this.progressDetail.textContent = detail;
    }
    if (this.progressBar) {
      const progress = completed !== undefined && total ? Math.min(100, (completed / total) * 100) : 8;
      this.progressBar.style.width = `${progress}%`;
    }
  }

  private createOverlay() {
    const existing = document.getElementById("rideshare-stats-overlay");
    if (existing) {
      this.overlay = existing;
      return;
    }

    if (!document.getElementById("rideshare-stats-styles")) {
      const style = document.createElement("style");
      style.id = "rideshare-stats-styles";
      style.textContent = `
#rideshare-stats-overlay{position:fixed;inset:0;z-index:2147483647;display:grid;padding:24px;color:#f4f7f5;background:rgba(5,7,6,.76);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(10px);place-items:center}
#rideshare-stats-panel{width:min(520px,100%);padding:32px;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:#111412;box-shadow:0 28px 80px rgba(0,0,0,.48)}
#rideshare-stats-mark{display:grid;width:40px;height:40px;margin-bottom:28px;color:#071109;border-radius:11px;background:#7df9a7;font-size:14px;font-weight:800;place-items:center}
#rideshare-stats-title{margin:0;font-size:28px;font-weight:650;letter-spacing:-.04em}
#rideshare-stats-detail{min-height:22px;margin:10px 0 24px;color:#9ba39e;font-size:14px;line-height:1.5}
#rideshare-stats-track{height:6px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.07)}
#rideshare-stats-progress{width:8%;height:100%;border-radius:inherit;background:#7df9a7;transition:width .2s ease}
#rideshare-stats-note{margin:18px 0 0;color:#737c76;font-size:11px;line-height:1.5}
@media(prefers-reduced-motion:reduce){#rideshare-stats-progress{transition:none}}
`;
      document.head.append(style);
    }

    this.overlay = document.createElement("div");
    this.overlay.id = "rideshare-stats-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-labelledby", "rideshare-stats-title");

    const panel = document.createElement("div");
    panel.id = "rideshare-stats-panel";
    const mark = document.createElement("div");
    mark.id = "rideshare-stats-mark";
    mark.textContent = "R";
    this.progressTitle = document.createElement("h2");
    this.progressTitle.id = "rideshare-stats-title";
    this.progressDetail = document.createElement("p");
    this.progressDetail.id = "rideshare-stats-detail";
    const track = document.createElement("div");
    track.id = "rideshare-stats-track";
    this.progressBar = document.createElement("div");
    this.progressBar.id = "rideshare-stats-progress";
    const note = document.createElement("p");
    note.id = "rideshare-stats-note";
    note.textContent = "Keep this tab open. Trip data is processed locally and is never sent to our servers.";
    track.append(this.progressBar);
    panel.append(mark, this.progressTitle, this.progressDetail, track, note);
    this.overlay.append(panel);
    document.body.prepend(this.overlay);
    this.setProgress("Finding your trips", "Reading your Uber history…");
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
      this.setProgress("Finding your trips", `${this.activityIds.size.toLocaleString()} trips found`);
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

    this.setProgress(
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
            this.setProgress(
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

  private async finish() {
    const payload: StoredTripData = {
      collectedAt: new Date().toISOString(),
      failedTripCount: this.failedTripCount,
      trips: this.fullTripMap,
      version: 2,
    };
    const message: CollectionCompleteMessage = { payload, type: COLLECTION_COMPLETE };
    this.setProgress("Analysis complete", "Opening your dashboard…", 1, 1);
    await browser.runtime.sendMessage(message);
    this.overlay?.remove();
  }

  private showError(error: unknown) {
    const message = error instanceof Error ? error.message : "Uber did not return trip data.";
    this.setProgress("Couldn’t load your trips", `${message} Refresh this page and try the extension again.`, 0, 1);
    if (this.progressBar) {
      this.progressBar.style.background = "#f08d7e";
    }
  }

  async start() {
    if (document.getElementById("rideshare-stats-overlay")) {
      return;
    }

    const csrfText = document.getElementById("__CSRF_TOKEN__")?.textContent?.trim();
    if (csrfText) {
      this.csrf = csrfText.replace(/\\u0022/g, "").replace(/^"|"$/g, "") || "x";
    }

    this.createOverlay();
    try {
      const cachedTripsPromise = this.getCachedTrips();
      await this.findActivities();
      await this.loadTripDetails(await cachedTripsPromise);
      await this.finish();
    } catch (error) {
      this.showError(error);
    }
  }
}

export function startTripCollection(): StartCollectionResponse {
  if (document.getElementById("rideshare-stats-overlay")) {
    return { started: true };
  }

  void new RideShareStats().start();
  return { started: true };
}
