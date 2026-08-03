import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { startEatsCollection } from "../src/collector/eatsCollector";
import { startTripCollection } from "../src/collector/tripCollector";
import { START_COLLECTION, START_EATS_COLLECTION, type StartCollectionResponse } from "../src/data/messages";

const HOST_ID = "rideshare-stats-launcher";
const EDGE_PADDING = 12;

type LauncherKind = "eats" | "rides";

const launcherCopy: Record<
  LauncherKind,
  { aria: string; label: string; loadingAria: string; title: string; start: () => StartCollectionResponse }
> = {
  eats: {
    aria: "Analyze Uber Eats orders",
    label: "Analyze Eats",
    loadingAria: "Starting Uber Eats analysis",
    start: startEatsCollection,
    title: "Analyze Uber Eats orders · drag to reposition",
  },
  rides: {
    aria: "Analyze Uber trips",
    label: "Analyze trips",
    loadingAria: "Starting Uber trip analysis",
    start: startTripCollection,
    title: "Analyze Uber trips · drag to reposition",
  },
};

function currentLauncherKind(): LauncherKind | null {
  const { hostname, pathname, protocol } = window.location;
  if (protocol !== "https:") {
    return null;
  }
  if (hostname === "riders.uber.com" && (pathname === "/trips" || pathname.startsWith("/trips/"))) {
    return "rides";
  }
  if (hostname === "www.ubereats.com" && (pathname === "/orders" || pathname.startsWith("/orders/"))) {
    return "eats";
  }
  return null;
}

function createBar(height: string): HTMLSpanElement {
  const bar = document.createElement("span");
  bar.style.height = height;
  return bar;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function mountLauncher(kind: LauncherKind) {
  const existing = document.getElementById(HOST_ID);
  if (existing?.dataset.kind === kind) {
    return;
  }
  existing?.remove();

  const copy = launcherCopy[kind];
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.dataset.kind = kind;
  host.style.position = "fixed";
  host.style.right = "20px";
  host.style.bottom = "20px";
  host.style.zIndex = "2147483646";
  host.style.width = "154px";
  host.style.height = "54px";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
:host{all:initial}
button{box-sizing:border-box;display:flex;width:154px;height:54px;padding:0 17px;gap:11px;align-items:center;justify-content:center;color:#f4f7f5;border:1px solid rgba(255,255,255,.17);border-radius:16px;background:#111412;box-shadow:0 12px 34px rgba(0,0,0,.32);font:700 13px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.01em;cursor:grab;user-select:none;touch-action:none;transition:background-color 150ms ease,border-color 150ms ease,box-shadow 150ms ease,transform 150ms ease}
button:hover{border-color:rgba(125,249,167,.55);background:#171c18;box-shadow:0 15px 38px rgba(0,0,0,.38)}
button:focus-visible{outline:3px solid rgba(125,249,167,.45);outline-offset:3px}
button:active{cursor:grabbing;transform:scale(.98)}
button[data-state="loading"]{cursor:wait}
button[data-state="error"]{border-color:rgba(240,141,126,.7)}
.icon{display:flex;width:24px;height:24px;padding:4px;gap:2px;align-items:flex-end;justify-content:center;color:#071109;border-radius:8px;background:#7df9a7}
.icon span{display:block;width:3px;border-radius:2px;background:currentColor}
.label{white-space:nowrap}
@media(max-width:520px){:host{width:54px!important}.label{display:none}button{width:54px;padding:0}.icon{flex:none}}
@media(prefers-reduced-motion:reduce){button{transition:none}}
`;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.state = "idle";
  button.setAttribute("aria-label", copy.aria);
  button.title = copy.title;

  const icon = document.createElement("span");
  icon.className = "icon";
  icon.setAttribute("aria-hidden", "true");
  icon.append(createBar("7px"), createBar("12px"), createBar("16px"));
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = copy.label;
  button.append(icon, label);
  shadow.append(style, button);
  document.documentElement.append(host);

  let dragging = false;
  let suppressClick = false;
  let startLeft = 0;
  let startTop = 0;
  let startX = 0;
  let startY = 0;

  button.addEventListener("pointerdown", (event) => {
    if (button.dataset.state === "loading") {
      return;
    }
    const bounds = host.getBoundingClientRect();
    dragging = false;
    startLeft = bounds.left;
    startTop = bounds.top;
    startX = event.clientX;
    startY = event.clientY;
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener("pointermove", (event) => {
    if (!button.hasPointerCapture(event.pointerId)) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (!dragging && Math.hypot(deltaX, deltaY) < 5) {
      return;
    }

    dragging = true;
    const width = host.getBoundingClientRect().width;
    const left = clamp(startLeft + deltaX, EDGE_PADDING, window.innerWidth - width - EDGE_PADDING);
    const top = clamp(startTop + deltaY, EDGE_PADDING, window.innerHeight - host.offsetHeight - EDGE_PADDING);
    host.style.right = "auto";
    host.style.bottom = "auto";
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
  });

  const finishDrag = (event: PointerEvent) => {
    if (!button.hasPointerCapture(event.pointerId)) {
      return;
    }
    button.releasePointerCapture(event.pointerId);
    suppressClick = dragging;
  };
  button.addEventListener("pointerup", finishDrag);
  button.addEventListener("pointercancel", finishDrag);

  button.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }

    button.dataset.state = "loading";
    label.textContent = "Starting…";
    button.setAttribute("aria-label", copy.loadingAria);

    try {
      const response = copy.start();
      if (!response?.started) {
        throw new Error(response?.error || "Could not start analysis.");
      }
      label.textContent = "Analyzing…";
      window.setTimeout(() => {
        button.dataset.state = "idle";
        label.textContent = copy.label;
        button.title = copy.title;
        button.setAttribute("aria-label", copy.aria);
      }, 1_800);
    } catch (error) {
      button.dataset.state = "error";
      label.textContent = "Try again";
      button.title = error instanceof Error ? error.message : "Could not start analysis.";
      button.setAttribute("aria-label", "Analysis failed. Try again");
      window.setTimeout(() => {
        button.dataset.state = "idle";
        label.textContent = copy.label;
        button.title = copy.title;
        button.setAttribute("aria-label", copy.aria);
      }, 2_500);
    }
  });
}

function syncLauncher() {
  const kind = currentLauncherKind();
  if (kind) {
    mountLauncher(kind);
  } else {
    document.getElementById(HOST_ID)?.remove();
  }
}

export default defineContentScript({
  matches: ["https://riders.uber.com/*", "https://www.ubereats.com/*"],
  runAt: "document_idle",
  main(ctx) {
    syncLauncher();
    ctx.addEventListener(window, "wxt:locationchange", syncLauncher);

    const messageListener = (message: unknown) => {
      if (!message || typeof message !== "object" || !("type" in message)) {
        return false;
      }
      if (message.type === START_COLLECTION) {
        return Promise.resolve(startTripCollection());
      }
      if (message.type === START_EATS_COLLECTION) {
        return Promise.resolve(startEatsCollection());
      }
      return false;
    };
    browser.runtime.onMessage.addListener(messageListener);
    ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(messageListener));
  },
});
