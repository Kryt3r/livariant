import { invoke } from "@tauri-apps/api/core";
import { formatDesktopVersion } from "./desktop-version";
import "./updater-cta-stabilizer.css";

type UpdateResult = {
  state: "not-configured" | "invalid-config" | "available" | "current" | "changed" | "error";
  currentVersion: string;
  availableVersion: string | null;
  detail: string;
};

let scheduled = false;
let resolving = false;

const updatesVisible = () => document.querySelector(".nav-item.active[data-view='updates']") !== null;

const surfaceAwaitsApproval = () => {
  if (!updatesVisible()) return false;
  if (document.querySelector(".updater-live-progress")) return false;

  const phases = document.querySelectorAll<HTMLElement>(".updates-flow .update-phase");
  if (phases.length < 3) return false;

  return phases[1].classList.contains("active")
    && !phases[2].classList.contains("active")
    && !phases[2].classList.contains("complete");
};

const installHost = () => {
  const phase = document.querySelector<HTMLElement>(".updates-flow .update-phase:nth-child(3)");
  if (!phase) return null;

  let host = phase.querySelector<HTMLElement>(".update-phase-install-action");
  if (!host) {
    host = document.createElement("div");
    host.className = "update-phase-install-action";
    phase.append(host);
  }
  return host;
};

const localizedInstallLabel = (version: string) => {
  const displayVersion = formatDesktopVersion(version);
  return document.documentElement.lang.toLowerCase().startsWith("de")
    ? `${displayVersion} installieren`
    : `Install ${displayVersion}`;
};

const ensureInstallAction = async () => {
  if (document.querySelector(".install-update")) return;
  if (!surfaceAwaitsApproval() || resolving) return;

  resolving = true;
  try {
    const result = await invoke<UpdateResult>("check_for_update");
    if (result.state !== "available" || !result.availableVersion) return;
    if (document.querySelector(".install-update") || !surfaceAwaitsApproval()) return;

    const host = installHost();
    if (!host) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button primary install-update updater-guard-install-action";
    button.dataset.version = result.availableVersion;
    button.textContent = localizedInstallLabel(result.availableVersion);
    host.append(button);
  } catch {
    // The guard is presentation-only. Host/updater errors remain owned and surfaced by updater-ui.ts.
  } finally {
    resolving = false;
  }
};

const scheduleEnsure = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    void ensureInstallAction();
  });
};

new MutationObserver(scheduleEnsure).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "lang"],
});

scheduleEnsure();
