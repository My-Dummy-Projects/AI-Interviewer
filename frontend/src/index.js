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

window.addEventListener("load", () => {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadAnalyticsOnce, { timeout: 8000 });
  } else {
    setTimeout(loadAnalyticsOnce, 8000);
  }
});

["pointerdown", "keydown", "scroll"].forEach((event) => {
  window.addEventListener(event, loadAnalyticsOnce, { once: true, passive: true });
});
