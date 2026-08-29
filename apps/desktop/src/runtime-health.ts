import { invoke } from "@tauri-apps/api/core";

type RuntimeHealth = {
  state: "ready" | "not-packaged" | "invalid";
  coreVersion: string | null;
  coreSourceSha: string | null;
  nodeVersion: string | null;
  authorityIssued: boolean;
  detail: string;
};

let cachedHealth: RuntimeHealth | null = null;

// Keep the native window itself fixed to the viewport. The scrollable surface is
// the app shell, and its visual scrollbar remains intentionally hidden while
// wheel/touchpad scrolling stays available.
const shellGuardStyle = document.createElement("style");
shellGuardStyle.textContent = `
  html, body, #app {
    width: 100%;
    height: 100%;
    overflow: hidden !important;
  }

  .desktop-frame {
    height: 100vh !important;
    min-height: 0 !important;
  }

  .app-shell {
    min-height: 0 !important;
    height: calc(100vh - 38px) !important;
    overflow: auto !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .app-shell::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
`;
document.head.appendChild(shellGuardStyle);

const applyRuntimeHealth = () => {
  if (!cachedHealth) return;

  const card = document.querySelector<HTMLElement>(".health-strip .health-card:first-child");
  const value = card?.querySelector<HTMLElement>("strong");
  const icon = card?.querySelector<HTMLElement>(".health-icon");
  if (!card || !value || !icon) return;

  if (card.title !== cachedHealth.detail) card.title = cachedHealth.detail;

  if (cachedHealth.state === "ready") {
    card.classList.remove("muted");
    if (icon.textContent !== "●") icon.textContent = "●";
    const label = `${cachedHealth.coreVersion ?? "Core"} · Node ${cachedHealth.nodeVersion ?? "?"}`;
    if (value.textContent !== label) value.textContent = label;
    return;
  }

  card.classList.add("muted");
  if (icon.textContent !== "○") icon.textContent = "○";
  const label = cachedHealth.state === "not-packaged" ? "Runtime not packaged" : "Runtime needs attention";
  if (value.textContent !== label) value.textContent = label;
};

// Current Desktop Foundation rerenders only in response to user clicks. Reapply
// the cached read-only health result once after those event handlers finish.
// This deliberately avoids observing the full DOM: the previous MutationObserver
// saw its own text/class updates and could starve the renderer event loop.
document.addEventListener("click", () => queueMicrotask(applyRuntimeHealth));

void invoke<RuntimeHealth>("runtime_health")
  .then((health) => {
    cachedHealth = health;
    applyRuntimeHealth();
  })
  .catch((error: unknown) => {
    cachedHealth = {
      state: "invalid",
      coreVersion: null,
      coreSourceSha: null,
      nodeVersion: null,
      authorityIssued: false,
      detail: `Desktop runtime health bridge failed: ${String(error)}`,
    };
    applyRuntimeHealth();
  });
