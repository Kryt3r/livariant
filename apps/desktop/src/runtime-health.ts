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

const applyRuntimeHealth = () => {
  if (!cachedHealth) return;

  const card = document.querySelector<HTMLElement>(".health-strip .health-card:first-child");
  const value = card?.querySelector<HTMLElement>("strong");
  const icon = card?.querySelector<HTMLElement>(".health-icon");
  if (!card || !value || !icon) return;

  card.title = cachedHealth.detail;

  if (cachedHealth.state === "ready") {
    card.classList.remove("muted");
    icon.textContent = "●";
    value.textContent = `${cachedHealth.coreVersion ?? "Core"} · Node ${cachedHealth.nodeVersion ?? "?"}`;
    return;
  }

  card.classList.add("muted");
  icon.textContent = "○";
  value.textContent = cachedHealth.state === "not-packaged" ? "Runtime not packaged" : "Runtime needs attention";
};

const observer = new MutationObserver(() => applyRuntimeHealth());
const root = document.querySelector<HTMLElement>("#app");
if (root) observer.observe(root, { childList: true, subtree: true });

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
