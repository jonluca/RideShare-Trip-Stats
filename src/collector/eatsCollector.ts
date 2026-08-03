import { browser } from "wxt/browser";
import { EATS_COLLECTION_COMPLETE, type EatsCollectionCompleteMessage, type StartCollectionResponse } from "../data/messages";
import { loadEatsData, mergeEatsRecords } from "../data/eatsRepository";
import { createUberEatsHistoryRequest, parseUberEatsWebPage } from "../data/uberEatsWeb";
import type { UberEatsOrder, UberEatsRestaurant } from "../types/UberEats";
import { CollectionOverlay } from "./collectionOverlay";

const ENDPOINT = "/_p/api/getPastOrdersV1";
const MAX_ATTEMPTS = 5;
const MAX_PAGES = 2_000;
const PAGE_DELAY_MS = 125;

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryAfterMilliseconds(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1_000;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
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

function friendlyError(error: unknown): string {
  if (error instanceof RequestError && (error.status === 401 || error.status === 403)) {
    return "Uber Eats could not confirm your signed-in session. Sign in, reload Past Orders, and try again.";
  }
  if (error instanceof RequestError && error.status === 400) {
    return "Uber Eats rejected the order-history request. Reload Past Orders so Uber can refresh your session, then try again.";
  }
  return error instanceof Error ? error.message : "Uber Eats did not return your order history.";
}

class UberEatsCollector {
  private readonly orders = new Map<string, UberEatsOrder>();
  private readonly restaurants: Record<string, UberEatsRestaurant> = {};
  private readonly cursors = new Set<string>();
  private readonly overlay = new CollectionOverlay("Keep this tab open. Order data is processed locally and is never sent to our servers.");
  private pagesRead = 0;
  private skippedOrders = 0;

  private async requestPage(lastWorkflowUUID: string): Promise<unknown> {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": "x",
      },
      body: JSON.stringify(createUberEatsHistoryRequest(lastWorkflowUUID)),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new RequestError(
        `Uber Eats request failed with status ${response.status}.`,
        response.status,
        retryAfterMilliseconds(response.headers.get("retry-after")),
      );
    }

    try {
      return await response.json();
    } catch {
      throw new RequestError("Uber Eats returned an unreadable order-history response.", response.status);
    }
  }

  private async requestPageWithRetry(lastWorkflowUUID: string): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await this.requestPage(lastWorkflowUUID);
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

  private async save(webHistoryComplete: boolean) {
    return mergeEatsRecords([...this.orders.values()], this.restaurants, { source: "web", webHistoryComplete });
  }

  private async collect() {
    const cached = await loadEatsData();
    const cachedIds = new Set(cached.records.map((order) => order.id));
    let cursor = "";

    for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber++) {
      const page = parseUberEatsWebPage(await this.requestPageWithRetry(cursor));
      this.pagesRead++;
      const pageWasCached = page.orders.length > 0 && page.orders.every((order) => cachedIds.has(order.id));

      for (const order of page.orders) {
        this.orders.set(order.id, order);
      }
      Object.assign(this.restaurants, page.restaurants);
      this.skippedOrders += page.skippedOrders;

      const skipped = this.skippedOrders > 0 ? ` · ${this.skippedOrders.toLocaleString()} unreadable skipped` : "";
      this.overlay.setProgress(
        "Reading your Eats history",
        `${this.orders.size.toLocaleString()} orders found${skipped}`,
        undefined,
        undefined,
        Math.min(92, 8 + pageNumber * 3),
      );

      if (!page.hasMore || (cached.webHistoryComplete && pageWasCached)) {
        return;
      }
      if (!page.nextWorkflowUuid) {
        throw new RequestError("Uber Eats reported more orders but did not provide a page cursor.");
      }
      if (this.cursors.has(page.nextWorkflowUuid)) {
        throw new RequestError("Uber Eats repeated an order-history page cursor.");
      }

      this.cursors.add(page.nextWorkflowUuid);
      cursor = page.nextWorkflowUuid;
      await delay(PAGE_DELAY_MS);
    }

    throw new RequestError(`Uber Eats history exceeded the ${MAX_PAGES.toLocaleString()}-page safety limit.`);
  }

  async start() {
    if (CollectionOverlay.isOpen()) {
      return;
    }

    this.overlay.show("Reading your Eats history", "Connecting to Uber Eats Past Orders…");
    try {
      await this.collect();
      const result = await this.save(this.skippedOrders === 0);
      this.overlay.setProgress(
        "Analysis complete",
        `${(result?.data.records.length ?? this.orders.size).toLocaleString()} Eats orders ready · opening your dashboard…`,
        1,
        1,
      );
      const message: EatsCollectionCompleteMessage = { type: EATS_COLLECTION_COMPLETE };
      await browser.runtime.sendMessage(message);
      this.overlay.remove();
    } catch (error) {
      try {
        if (this.pagesRead > 0) {
          await this.save(false);
        }
      } catch {
        // Preserve the original collection error if a partial cache write also fails.
      }
      this.overlay.showError(
        "Couldn’t load your Eats history",
        `${friendlyError(error)} Any pages already read were saved. Refresh this page and try again.`,
      );
    }
  }
}

export function startEatsCollection(): StartCollectionResponse {
  if (CollectionOverlay.isOpen()) {
    return { started: true };
  }

  void new UberEatsCollector().start();
  return { started: true };
}
