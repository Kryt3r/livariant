import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { formatDesktopVersion } from "./desktop-version";
import "./updater-experience.css";

type ReleaseNotesLocale = {
  title: string;
  items: string[];
};

type LocalizedReleaseNotes = {
  schemaVersion: number;
  de: ReleaseNotesLocale;
  en: ReleaseNotesLocale;
};

type UpdateResult = {
  state: "not-configured" | "invalid-config" | "available" | "current" | "changed" | "error";
  currentVersion: string;
  availableVersion: string | null;
  detail: string;
  releaseNotes: LocalizedReleaseNotes | null;
};

type UpdateProgress = {
  phase: "preparing" | "downloading" | "downloaded" | "restarting";
  targetVersion: string;
  downloadedBytes: number;
  totalBytes: number | null;
  percent: number | null;
};

type UiCopy = {
  checking: string;
  check: string;
  preparing: string;
  downloading: string;
  downloaded: string;
  installing: string;
  restart: string;
  availableEyebrow: string;
  availableTitle: (version: string) => string;
  availableDetail: (version: string) => string;
  install: (version: string) => string;
  currentEyebrow: string;
  changedEyebrow: string;
  changedTitle: string;
  attentionEyebrow: string;
  attentionTitle: string;
  applyingEyebrow: string;
  applyingTitle: string;
  preparingDetail: string;
  downloadingDetail: string;
  downloadedDetail: string;
  restartingEyebrow: string;
  restartingTitle: string;
  restartingDetail: (version: string) => string;
  releaseNotesLabel: string;
};

const updaterHostFailureCopy = (kind: "check" | "install"): string => {
  const de = document.documentElement.lang.toLowerCase().startsWith("de");
  if (kind === "install") {
    return de
      ? "Das Update konnte nicht installiert werden. Die bestehende Installation wurde nicht als erfolgreich ersetzt. Versuche es erneut oder prüfe später erneut nach Updates."
      : "The update could not be installed. The existing installation was not treated as successfully replaced. Try again or check for updates later.";
  }
  return de
    ? "Die Update-Prüfung konnte nicht abgeschlossen werden. Die bestehende Installation wurde nicht verändert. Prüfe deine Verbindung und versuche es erneut."
    : "The update check could not be completed. The existing installation was not changed. Check your connection and try again.";
};

const copy = (): UiCopy => document.documentElement.lang.toLowerCase().startsWith("de") ? {
  checking: "Prüfe…",
  check: "Nach Updates suchen",
  preparing: "Wird vorbereitet",
  downloading: "Wird heruntergeladen",
  downloaded: "Heruntergeladen",
  installing: "Wird installiert",
  restart: "Neustart",
  availableEyebrow: "Desktop-Update verfügbar",
  availableTitle: (version) => `${version} ist verfügbar`,
  availableDetail: (version) => `Ein signiertes Livariant-Update auf ${version} ist verfügbar.`,
  install: (version) => `${version} installieren`,
  currentEyebrow: "Desktop ist aktuell",
  changedEyebrow: "Desktop-Update geändert",
  changedTitle: "Neue Desktop-Version zuerst prüfen",
  attentionEyebrow: "Update-Prüfung benötigt Aufmerksamkeit",
  attentionTitle: "Update-Prüfung nicht abgeschlossen",
  applyingEyebrow: "Signiertes Desktop-Update",
  applyingTitle: "Update wird vorbereitet…",
  preparingDetail: "Livariant bereitet den verifizierten Update-Pfad vor. Die Installation beginnt erst nach deiner ausdrücklichen Freigabe.",
  downloadingDetail: "Das signierte Update wird heruntergeladen. Fortschritt wird nur angezeigt, wenn die echte Gesamtgröße bekannt ist.",
  downloadedDetail: "Download abgeschlossen. Livariant verifiziert das Artefakt und bereitet die Installation vor.",
  restartingEyebrow: "Update installiert",
  restartingTitle: "Livariant startet neu…",
  restartingDetail: (version) => `${version} wurde installiert. Livariant wird jetzt mit der neuen Desktop-Version neu gestartet.`,
  releaseNotesLabel: "Was ist neu?",
} : {
  checking: "Checking…",
  check: "Check for updates",
  preparing: "Preparing",
  downloading: "Downloading",
  downloaded: "Downloaded",
  installing: "Installing",
  restart: "Restart",
  availableEyebrow: "Desktop update available",
  availableTitle: (version) => `${version} is available`,
  availableDetail: (version) => `A signed Livariant update to ${version} is available.`,
  install: (version) => `Install ${version}`,
  currentEyebrow: "Desktop up to date",
  changedEyebrow: "Desktop update changed",
  changedTitle: "Review the new Desktop version first",
  attentionEyebrow: "Update check needs attention",
  attentionTitle: "Update check did not complete",
  applyingEyebrow: "Signed Desktop update",
  applyingTitle: "Preparing update…",
  preparingDetail: "Livariant is preparing the verified update path. Installation begins only after your explicit approval.",
  downloadingDetail: "The signed update is downloading. Progress is shown only when the updater exposes a real total size.",
  downloadedDetail: "Download complete. Livariant is verifying the artifact and preparing installation.",
  restartingEyebrow: "Update installed",
  restartingTitle: "Livariant is restarting…",
  restartingDetail: (version) => `${version} has been installed. Livariant will now restart with the new Desktop version.`,
  releaseNotesLabel: "What's new?",
};

let cachedResult: UpdateResult | null = null;
let busy: "checking" | "installing" | null = null;
let progress: UpdateProgress | null = null;

const updateSurfaceRoot = (): HTMLElement | null =>
  document.querySelector<HTMLElement>("[data-settings-surface='updates']");

const statusHero = () =>
  updateSurfaceRoot()?.querySelector<HTMLElement>(".settings-status-hero") ?? null;

const setText = (node: HTMLElement | null | undefined, value: string) => {
  if (node && node.textContent !== value) node.textContent = value;
};

const setCopy = (eyebrow: string, title: string, detail: string) => {
  const panel = statusHero();
  if (!panel) return;
  setText(panel.querySelector<HTMLElement>("small"), eyebrow);
  setText(panel.querySelector<HTMLElement>("strong"), title);
  setText(panel.querySelector<HTMLElement>("span"), detail);
};

const preferredNotes = (notes: LocalizedReleaseNotes | null): ReleaseNotesLocale | null => {
  if (!notes || notes.schemaVersion !== 1) return null;
  return document.documentElement.lang.toLowerCase().startsWith("de") ? notes.de : notes.en;
};

const renderReleaseNotes = () => {
  const root = updateSurfaceRoot();
  if (!root) return;

  const existing = root.querySelector<HTMLElement>(".settings-update-release-notes");
  const notes = cachedResult?.state === "available" || cachedResult?.state === "changed"
    ? preferredNotes(cachedResult.releaseNotes)
    : null;

  if (!notes) {
    existing?.remove();
    return;
  }

  const card = existing ?? document.createElement("section");
  card.className = "settings-update-release-notes";
  card.setAttribute("aria-live", "polite");
  card.replaceChildren();

  const heading = document.createElement("div");
  const label = document.createElement("small");
  label.textContent = copy().releaseNotesLabel;
  const title = document.createElement("strong");
  title.textContent = notes.title;
  heading.append(label, title);

  const list = document.createElement("ul");
  notes.items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });
  card.append(heading, list);

  if (!existing) statusHero()?.insertAdjacentElement("afterend", card);
};

const renderLiveProgress = () => {
  const root = updateSurfaceRoot();
  if (!root) return;

  let panel = root.querySelector<HTMLElement>(".settings-updater-progress");
  const shouldShow = busy === "installing" || progress !== null;
  if (!shouldShow) {
    panel?.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement("section");
    panel.className = "settings-updater-progress";
    panel.setAttribute("aria-live", "polite");
    panel.innerHTML = `
      <div class="settings-updater-progress-copy"><strong></strong><span></span></div>
      <div class="settings-updater-progress-track" role="progressbar"><span></span></div>`;
    const anchor = root.querySelector(".settings-update-release-notes") ?? statusHero();
    anchor?.insertAdjacentElement("afterend", panel);
  }

  const values = copy();
  const title = panel.querySelector<HTMLElement>(".settings-updater-progress-copy strong");
  const detail = panel.querySelector<HTMLElement>(".settings-updater-progress-copy span");
  const track = panel.querySelector<HTMLElement>(".settings-updater-progress-track");
  const fill = panel.querySelector<HTMLElement>(".settings-updater-progress-track > span");

  let stateTitle = values.preparing;
  let stateDetail = values.preparingDetail;
  if (progress?.phase === "downloading") {
    stateTitle = progress.percent !== null ? `${values.downloading} · ${progress.percent}%` : values.downloading;
    stateDetail = values.downloadingDetail;
  } else if (progress?.phase === "downloaded") {
    stateTitle = values.downloaded;
    stateDetail = values.downloadedDetail;
  } else if (progress?.phase === "restarting") {
    stateTitle = values.restart;
    stateDetail = values.restartingDetail(formatDesktopVersion(progress.targetVersion));
  }

  setText(title, stateTitle);
  setText(detail, stateDetail);

  const percent = progress?.percent;
  if (track && fill) {
    if (percent !== null && percent !== undefined) {
      track.classList.remove("is-indeterminate");
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", "100");
      track.setAttribute("aria-valuenow", String(percent));
      fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    } else {
      track.classList.add("is-indeterminate");
      track.removeAttribute("aria-valuenow");
      fill.style.removeProperty("width");
    }
  }
};

const reconcile = () => {
  const root = updateSurfaceRoot();
  if (!root) return;
  const values = copy();

  const checkButton = root.querySelector<HTMLButtonElement>(".check-updates");
  if (checkButton) {
    checkButton.disabled = busy !== null;
    checkButton.hidden = cachedResult?.state === "available" && busy === null;
    checkButton.textContent = busy === "checking" ? values.checking : values.check;
  }

  let installButton = root.querySelector<HTMLButtonElement>(".install-update");

  if (busy === "installing") {
    installButton?.remove();
    installButton = null;
    if (progress?.phase === "restarting") {
      const version = progress.targetVersion ? formatDesktopVersion(progress.targetVersion) : "Livariant";
      setCopy(values.restartingEyebrow, values.restartingTitle, values.restartingDetail(version));
    } else if (progress?.phase === "downloading") {
      setCopy(values.applyingEyebrow, progress.percent !== null ? `${values.downloading} · ${progress.percent}%` : values.downloading, values.downloadingDetail);
    } else if (progress?.phase === "downloaded") {
      setCopy(values.applyingEyebrow, values.installing, values.downloadedDetail);
    } else {
      setCopy(values.applyingEyebrow, values.applyingTitle, values.preparingDetail);
    }
    renderReleaseNotes();
    renderLiveProgress();
    return;
  }

  if (!cachedResult) {
    installButton?.remove();
    renderReleaseNotes();
    renderLiveProgress();
    return;
  }

  if (cachedResult.state === "available" && cachedResult.availableVersion) {
    const displayVersion = formatDesktopVersion(cachedResult.availableVersion);
    setCopy(values.availableEyebrow, values.availableTitle(displayVersion), values.availableDetail(displayVersion));
    const panel = statusHero();
    const button = installButton ?? document.createElement("button");
    button.type = "button";
    button.className = "button primary install-update";
    button.dataset.version = cachedResult.availableVersion;
    button.textContent = values.install(displayVersion);
    button.hidden = false;
    button.disabled = false;
    if (panel && button.parentElement !== panel) panel.appendChild(button);
  } else {
    installButton?.remove();
    installButton = null;
    if (cachedResult.state === "current") {
      setCopy(values.currentEyebrow, formatDesktopVersion(cachedResult.currentVersion), cachedResult.detail);
    } else if (cachedResult.state === "changed") {
      setCopy(values.changedEyebrow, values.changedTitle, cachedResult.detail);
    } else {
      setCopy(values.attentionEyebrow, values.attentionTitle, cachedResult.detail);
    }
  }

  renderReleaseNotes();
  renderLiveProgress();
};

const checkForUpdates = async () => {
  busy = "checking";
  progress = null;
  reconcile();
  try {
    cachedResult = await invoke<UpdateResult>("check_for_update");
  } catch {
    cachedResult = {
      state: "error",
      currentVersion: "unknown",
      availableVersion: null,
      detail: updaterHostFailureCopy("check"),
      releaseNotes: null,
    };
  } finally {
    busy = null;
    reconcile();
  }
};

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const installUpdate = async (expectedVersion: string) => {
  busy = "installing";
  progress = {
    phase: "preparing",
    targetVersion: expectedVersion,
    downloadedBytes: 0,
    totalBytes: null,
    percent: null,
  };
  reconcile();

  await wait(360);

  try {
    cachedResult = await invoke<UpdateResult>("apply_update", { expectedVersion });
  } catch {
    cachedResult = {
      state: "error",
      currentVersion: "unknown",
      availableVersion: expectedVersion,
      detail: updaterHostFailureCopy("install"),
      releaseNotes: cachedResult?.releaseNotes ?? null,
    };
  } finally {
    busy = null;
    progress = null;
    reconcile();
  }
};

void listen<UpdateProgress>("livariant://updater-progress", (event) => {
  if (busy !== "installing") return;
  progress = event.payload;
  reconcile();
});

document.addEventListener(
  "click",
  (event) => {
    const root = updateSurfaceRoot();
    if (!root) return;
    const target = event.target instanceof Element ? event.target : null;

    const checkButton = target?.closest<HTMLButtonElement>(".check-updates");
    if (checkButton && root.contains(checkButton)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!busy) void checkForUpdates();
      return;
    }

    const installButton = target?.closest<HTMLButtonElement>(".install-update");
    if (installButton && root.contains(installButton)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const expectedVersion = installButton.dataset.version;
      if (!busy && expectedVersion) void installUpdate(expectedVersion);
    }
  },
  { capture: true },
);

new MutationObserver(() => reconcile()).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"],
});

let settingsSurfaceScheduled = false;
new MutationObserver((mutations) => {
  const settingsSurfaceAdded = mutations.some((mutation) => [...mutation.addedNodes].some((node) =>
    node instanceof Element && (
      node.matches("[data-settings-surface='updates']")
      || Boolean(node.querySelector("[data-settings-surface='updates']"))
    ),
  ));
  if (!settingsSurfaceAdded || settingsSurfaceScheduled) return;
  settingsSurfaceScheduled = true;
  queueMicrotask(() => {
    settingsSurfaceScheduled = false;
    reconcile();
  });
}).observe(document.documentElement, { childList: true, subtree: true });
