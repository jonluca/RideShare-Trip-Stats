import { browser } from "wxt/browser";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { START_COLLECTION, type StartCollectionResponse } from "../src/data/messages";

const HOST_ID = "rideshare-stats-launcher";
const EDGE_PADDING = 12;

function createBar(height: string): HTMLSpanElement {
  const bar = document.createElement("span");
  bar.style.height = height;
  return bar;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function mountLauncher() {
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    existing.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], {
      duration: 320,
      easing: "ease-out",
    });
    return;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
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
  button.setAttribute("aria-label", "Analyze Uber trips");
  button.title = "Analyze Uber trips · drag to reposition";

  const icon = document.createElement("span");
  icon.className = "icon";
  icon.setAttribute("aria-hidden", "true");
  icon.append(createBar("7px"), createBar("12px"), createBar("16px"));
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = "Analyze trips";
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

  button.addEventListener("click", async () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }

    button.dataset.state = "loading";
    label.textContent = "Starting…";
    button.setAttribute("aria-label", "Starting Uber trip analysis");

    try {
      const response = (await browser.runtime.sendMessage({ type: START_COLLECTION })) as StartCollectionResponse;
      if (!response?.started) {
        throw new Error(response?.error || "Could not start trip analysis.");
      }
      label.textContent = "Analyzing…";
      window.setTimeout(() => {
        button.dataset.state = "idle";
        label.textContent = "Analyze trips";
        button.title = "Analyze Uber trips · drag to reposition";
        button.setAttribute("aria-label", "Analyze Uber trips");
      }, 1800);
    } catch (error) {
      button.dataset.state = "error";
      label.textContent = "Try again";
      button.title = error instanceof Error ? error.message : "Could not start trip analysis.";
      button.setAttribute("aria-label", "Trip analysis failed. Try again");
      window.setTimeout(() => {
        button.dataset.state = "idle";
        label.textContent = "Analyze trips";
      }, 2500);
    }
  });
}

export default defineUnlistedScript(() => {
  if (window.location.hostname === "riders.uber.com") {
    mountLauncher();
  }
});
