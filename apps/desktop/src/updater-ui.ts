import { invoke } from "@tauri-apps/api/core";
import { formatDesktopVersion } from "./desktop-version";

type UpdateResult = {
  state: "not-configured" | "invalid-config" | "available" | "current" | "changed" | "error";
  currentVersion: string;
  availableVersion: string | null;
  detail: string;
};

let cachedResult: UpdateResult | null = null;
let busy: "checking" | "installing" | null = null;

const updatesVisible = () => document.querySelector(".nav-item.active[data-view='updates']") !== null;

const setCopy = (eyebrow: string, title: string, detail: string) => {
  const panel = document.querySelector<HTMLElement>(".content .progress-panel");
  const eyebrowNode = panel?.querySelector<HTMLElement>(".eyebrow");
  const titleNode = panel?.querySelector<HTMLElement>("h2");
  const detailNode = panel?.querySelector<HTMLElement>("p");
  if (eyebrowNode) eyebrowNode.textContent = eyebrow;
  if (titleNode) titleNode.textContent = title;
  if (detailNode) detailNode.textContent = detail;
};

const reconcile = () => {
  if (!updatesVisible()) return;

  const checkButton = document.querySelector<HTMLButtonElement>(".check-updates");
  if (checkButton) {
    checkButton.disabled = busy !== null;
    checkButton.textContent = busy === "checking" ? "Checking…" : "Check for updates";
  }

  const signedIdentity = document.querySelector<HTMLElement>(".steps .step-card:first-child .state-pill");
  if (signedIdentity) signedIdentity.textContent = "Configured";

  const footer = document.querySelector<HTMLElement>(".truth-note p");
  if (footer) {
    footer.innerHTML = "<strong>Update boundary:</strong> remote metadata is Evidence, not Authority. Installation is possible only after signature verification and an explicit user action; Guardian Authority remains separate.";
  }

  document.querySelector(".install-update")?.remove();

  if (busy === "installing") {
    setCopy("Installing signed Desktop update", "Applying Desktop update…", "Livariant is verifying and applying the reviewed Desktop update. On Windows the app will restart when installation succeeds.");
    return;
  }

  if (!cachedResult) return;

  if (cachedResult.state === "available" && cachedResult.availableVersion) {
    const displayVersion = formatDesktopVersion(cachedResult.availableVersion);
    setCopy("Desktop update available", `${displayVersion} is available`, cachedResult.detail);
    const panel = document.querySelector<HTMLElement>(".content .progress-panel");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button primary install-update";
    button.dataset.version = cachedResult.availableVersion;
    button.textContent = `Install ${displayVersion}`;
    panel?.appendChild(button);
    return;
  }

  if (cachedResult.state === "current") {
    setCopy("Desktop up to date", formatDesktopVersion(cachedResult.currentVersion), cachedResult.detail);
    return;
  }

  if (cachedResult.state === "changed") {
    setCopy("Desktop update changed", "Review the new Desktop version first", cachedResult.detail);
    return;
  }

  setCopy("Desktop update check needs attention", "Update check did not complete", cachedResult.detail);
};

const checkForUpdates = async () => {
  busy = "checking";
  reconcile();
  try {
    cachedResult = await invoke<UpdateResult>("check_for_update");
  } catch (error: unknown) {
    cachedResult = {
      state: "error",
      currentVersion: "unknown",
      availableVersion: null,
      detail: `Update host bridge failed without changing the installation: ${String(error)}`,
    };
  } finally {
    busy = null;
    reconcile();
  }
};

const installUpdate = async (expectedVersion: string) => {
  busy = "installing";
  reconcile();
  try {
    cachedResult = await invoke<UpdateResult>("apply_update", { expectedVersion });
  } catch (error: unknown) {
    cachedResult = {
      state: "error",
      currentVersion: "unknown",
      availableVersion: expectedVersion,
      detail: `Signed Desktop update installation failed without granting additional Authority: ${String(error)}`,
    };
  } finally {
    busy = null;
    reconcile();
  }
};

document.addEventListener(
  "click",
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const checkButton = target?.closest<HTMLButtonElement>(".check-updates");
    if (checkButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!busy) void checkForUpdates();
      return;
    }

    const installButton = target?.closest<HTMLButtonElement>(".install-update");
    if (installButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const expectedVersion = installButton.dataset.version;
      if (!busy && expectedVersion) void installUpdate(expectedVersion);
      return;
    }

    queueMicrotask(reconcile);
  },
  { capture: true },
);
