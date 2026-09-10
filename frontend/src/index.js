/**
 * App bootstrap.
 *
 * Mounts the React app and defers loading the PostHog analytics bundle so
 * it only downloads after the page is idle (30s post-load) or on first user
 * interaction — whichever happens first.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

function loadAnalytics() {
  import("@/lib/analytics");
}

let analyticsLoaded = false;
function loadAnalyticsOnce() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;
  loadAnalytics();
}

// Idle-triggered load: 30 seconds after the window fully loads.
window.addEventListener("load", () => {
  setTimeout(loadAnalyticsOnce, 30000);
});

// Interaction-triggered load: first of these events kicks it off early.
["pointerdown", "keydown", "scroll", "wheel", "touchstart"].forEach((event) => {
  window.addEventListener(event, loadAnalyticsOnce, { once: true, passive: true });
});