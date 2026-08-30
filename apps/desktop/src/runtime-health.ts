import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { formatDesktopVersion } from "./desktop-version";

type RuntimeHealth = {
  state: "ready" | "not-packaged" | "invalid";
  coreVersion: string | null;
  coreSourceSha: string | null;
  nodeVersion: string | null;
  authorityIssued: boolean;
  detail: string;
};

let cachedHealth: RuntimeHealth | null = null;
let cachedDesktopVersion: string | null = null;
let desktopDetail = "Desktop version is loading.";

// Keep the native window itself fixed to the viewport. The scrollable surface is
// the app shell, and its visual scrollbar remains intentionally hidden while
// wheel/touchpad scrolling stays available.
const shellGuardStyle = document.createElement("style");
shellGuardStyle.dataset.livariantShellGuard = "true";
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

const setHealthCard = (
  card: HTMLElement | undefined,
  label: string,
  value: string,
  ready: boolean,
  detail: string,
) => {
  if (!card) return;
  const labelNode = card.querySelector<HTMLElement>("small");
  const valueNode = card.querySelector<HTMLElement>("strong");
  const icon = card.querySelector<HTMLElement>(".health-icon");
  if (labelNode) labelNode.textContent = label;
  if (valueNode) valueNode.textContent = value;
  if (icon) icon.textContent = ready ? "●" : "○";
  card.classList.toggle("muted", !ready);
  card.title = detail;
};

const foundationHealthCards = (): HTMLElement[] | null => {
  for (const strip of document.querySelectorAll<HTMLElement>(".health-strip")) {
    const cards = Array.from(strip.querySelectorAll<HTMLElement>(".health-card"));
    if (cards.length < 3) continue;
    const labels = cards.slice(0, 3).map((card) => card.querySelector<HTMLElement>("small")?.textContent?.trim() ?? "");
    if (labels[0] === "Installation" && labels[1] === "Protected components" && labels[2] === "Guardian") return cards;
  }
  return null;
};

const applyRuntimeHealth = () => {
  const cards = foundationHealthCards();
  if (!cards) return;

  setHealthCard(
    cards[0],
    "Desktop",
    cachedDesktopVersion ? formatDesktopVersion(cachedDesktopVersion) : "Version unavailable",
    cachedDesktopVersion !== null,
    desktopDetail,
  );

  if (!cachedHealth) {
    setHealthCard(cards[1], "Core", "Checking…", false, "Bundled Core health is loading.");
    setHealthCard(cards[2], "Runtime", "Checking…", false, "Bundled runtime health is loading.");
    return;
  }

  const runtimeReady = cachedHealth.state === "ready";
  setHealthCard(
    cards[1],
    "Core",
    cachedHealth.coreVersion ?? (runtimeReady ? "Unknown" : "Needs attention"),
    runtimeReady && cachedHealth.coreVersion !== null,
    cachedHealth.detail,
  );
  setHealthCard(
    cards[2],
    "Runtime",
    cachedHealth.nodeVersion ? `Node ${cachedHealth.nodeVersion}` : runtimeReady ? "Node unknown" : "Needs attention",
    runtimeReady && cachedHealth.nodeVersion !== null,
    cachedHealth.detail,
  );
};

// Current Desktop Foundation rerenders only in response to user clicks. Reapply
// the cached read-only identity once after those event handlers finish. The
// foundation strip is detected by its own labels so connector/diagnostics cards
// remain owned by their respective views.
document.addEventListener("click", () => queueMicrotask(applyRuntimeHealth));

void getVersion()
  .then((version) => {
    cachedDesktopVersion = version;
    desktopDetail = `Desktop updater version: ${version}`;
    applyRuntimeHealth();
  })
  .catch((error: unknown) => {
    cachedDesktopVersion = null;
    desktopDetail = `Desktop version bridge failed: ${String(error)}`;
    applyRuntimeHealth();
  });

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
