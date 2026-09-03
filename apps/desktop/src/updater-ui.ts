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
  configured: string;
  checked: string;
  ready: string;
  waiting: string;
  preparing: string;
  downloading: string;
  downloaded: string;
  verified: string;
  authorized: string;
  installing: string;
  installed: string;
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
  noReleaseNotes: string;
  phaseCheckTitle: string;
  phaseCheckDetail: string;
  phaseDownloadTitle: string;
  phaseDownloadDetail: string;
  phaseInstallTitle: string;
  phaseInstallDetail: string;
};

const copy = (): UiCopy => document.documentElement.lang.toLowerCase().startsWith("de") ? {
  checking: "Prüfe…",
  check: "Nach Updates suchen",
  configured: "Bereit",
  checked: "Geprüft",
  ready: "Bereit",
  waiting: "Wartet auf Freigabe",
  preparing: "Wird vorbereitet",
  downloading: "Wird heruntergeladen",
  downloaded: "Heruntergeladen",
  verified: "Verifiziert",
  authorized: "Freigegeben",
  installing: "Wird installiert",
  installed: "Installiert",
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
  noReleaseNotes: "Für dieses Update wurden keine strukturierten Patch Notes bereitgestellt.",
  phaseCheckTitle: "Verfügbarkeit prüfen",
  phaseCheckDetail: "Livariant fragt ausschließlich den fest konfigurierten, vertrauenswürdigen Update-Kanal ab.",
  phaseDownloadTitle: "Herunterladen & verifizieren",
  phaseDownloadDetail: "Download-Fortschritt und Verifikation werden nur aus echten Updater-Ereignissen abgeleitet.",
  phaseInstallTitle: "Installieren & neu starten",
  phaseInstallDetail: "Code wird erst nach deiner ausdrücklichen Freigabe ersetzt. Danach startet Livariant kontrolliert neu.",
} : {
  checking: "Checking…",
  check: "Check for updates",
  configured: "Ready",
  checked: "Checked",
  ready: "Ready",
  waiting: "Awaiting approval",
  preparing: "Preparing",
  downloading: "Downloading",
  downloaded: "Downloaded",
  verified: "Verified",
  authorized: "Authorized",
  installing: "Installing",
  installed: "Installed",
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
  noReleaseNotes: "No structured patch notes were supplied for this update.",
  phaseCheckTitle: "Check availability",
  phaseCheckDetail: "Livariant queries only the fixed, trusted update channel.",
  phaseDownloadTitle: "Download & verify",
  phaseDownloadDetail: "Download progress and verification state are derived only from real updater events.",
  phaseInstallTitle: "Install & restart",
  phaseInstallDetail: "Installed code is replaced only after your explicit approval, then Livariant restarts in a controlled way.",
};

let cachedResult: UpdateResult | null = null;
let busy: "checking" | "installing" | null = null;
let progress: UpdateProgress | null = null;

const updatesVisible = () => document.querySelector(".nav-item.active[data-view='updates']") !== null;

const updateStatusPanel = () => document.querySelector<HTMLElement>(
  ".content .updates-status-card, .content .progress-panel",
);

const setText = (node: HTMLElement | null | undefined, value: string) => {
  if (node && node.textContent !== value) node.textContent = value;
};

const setCopy = (eyebrow: string, title: string, detail: string) => {
  const panel = updateStatusPanel();
  setText(panel?.querySelector<HTMLElement>(".eyebrow"), eyebrow);
  setText(panel?.querySelector<HTMLElement>("h2"), title);
  setText(panel?.querySelector<HTMLElement>("p"), detail);
};

const preferredNotes = (notes: LocalizedReleaseNotes | null): ReleaseNotesLocale | null => {
  if (!notes || notes.schemaVersion !== 1) return null;
  return document.documentElement.lang.toLowerCase().startsWith("de") ? notes.de : notes.en;
};

const renderReleaseNotes = () => {
  const workspace = document.querySelector<HTMLElement>(".updates-workspace");
  if (!workspace) return;

  const existing = workspace.querySelector<HTMLElement>(".update-release-notes");
  const notes = cachedResult?.state === "available" || cachedResult?.state === "changed"
    ? preferredNotes(cachedResult.releaseNotes)
    : null;

  if (!notes) {
    existing?.remove();
    return;
  }

  const card = existing ?? document.createElement("section");
  card.className = "update-release-notes";
  card.setAttribute("aria-live", "polite");
  card.innerHTML = "";

  const intro = document.createElement("div");
  intro.className = "update-release-notes-heading";
  const label = document.createElement("span");
  label.className = "eyebrow";
  label.textContent = copy().releaseNotesLabel;
  const title = document.createElement("h3");
  title.textContent = notes.title;
  intro.append(label, title);

  const list = document.createElement("ul");
  notes.items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });
  card.append(intro, list);

  if (!existing) {
    const statusCard = workspace.querySelector(".updates-status-card");
    statusCard?.insertAdjacentElement("afterend", card);
  }
};

const renderLiveProgress = () => {
  const workspace = document.querySelector<HTMLElement>(".updates-workspace");
  if (!workspace) return;

  let panel = workspace.querySelector<HTMLElement>(".updater-live-progress");
  const shouldShow = busy === "installing" || progress !== null;
  if (!shouldShow) {
    panel?.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement("section");
    panel.className = "updater-live-progress";
    panel.innerHTML = `
      <div class="updater-live-orb" aria-hidden="true"><span></span></div>
      <div class="updater-live-copy"><strong></strong><span></span></div>
      <div class="updater-progress-track" role="progressbar"><span></span></div>`;
    const notes = workspace.querySelector(".update-release-notes");
    const status = workspace.querySelector(".updates-status-card");
    (notes ?? status)?.insertAdjacentElement("afterend", panel);
  }

  const values = copy();
  const title = panel.querySelector<HTMLElement>(".updater-live-copy strong");
  const detail = panel.querySelector<HTMLElement>(".updater-live-copy > span");
  const track = panel.querySelector<HTMLElement>(".updater-progress-track");
  const fill = panel.querySelector<HTMLElement>(".updater-progress-track > span");

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
  panel.dataset.phase = progress?.phase ?? "preparing";

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

const setPhase = (index: number, state: string, mode: "idle" | "active" | "complete") => {
  const card = document.querySelectorAll<HTMLElement>(".updates-flow .update-phase")[index];
  if (!card) return;
  card.classList.toggle("active", mode === "active");
  card.classList.toggle("complete", mode === "complete");
  setText(card.querySelector<HTMLElement>(".update-phase-state"), state);
};

const renderFlow = () => {
  const values = copy();
  const cards = document.querySelectorAll<HTMLElement>(".updates-flow .update-phase");
  if (cards.length < 3) return;

  setText(cards[0].querySelector<HTMLElement>("h3"), values.phaseCheckTitle);
  setText(cards[0].querySelector<HTMLElement>("p"), values.phaseCheckDetail);
  setText(cards[1].querySelector<HTMLElement>("h3"), values.phaseDownloadTitle);
  setText(cards[1].querySelector<HTMLElement>("p"), values.phaseDownloadDetail);
  setText(cards[2].querySelector<HTMLElement>("h3"), values.phaseInstallTitle);
  setText(cards[2].querySelector<HTMLElement>("p"), values.phaseInstallDetail);

  if (busy === "checking") {
    setPhase(0, values.checking, "active");
    setPhase(1, values.ready, "idle");
    setPhase(2, values.waiting, "idle");
    return;
  }

  if (busy === "installing") {
    setPhase(0, values.checked, "complete");
    if (progress?.phase === "restarting") {
      setPhase(1, values.verified, "complete");
      setPhase(2, values.installed, "complete");
    } else if (progress?.phase === "downloaded") {
      setPhase(1, values.downloaded, "complete");
      setPhase(2, values.installing, "active");
    } else {
      setPhase(1, progress?.phase === "downloading" ? values.downloading : values.preparing, "active");
      setPhase(2, values.authorized, "idle");
    }
    return;
  }

  if (cachedResult?.state === "available") {
    setPhase(0, values.checked, "complete");
    setPhase(1, values.ready, "active");
    setPhase(2, values.waiting, "idle");
    return;
  }

  if (cachedResult?.state === "current") {
    setPhase(0, values.checked, "complete");
    setPhase(1, values.ready, "idle");
    setPhase(2, values.waiting, "idle");
    return;
  }

  setPhase(0, values.ready, "active");
  setPhase(1, values.ready, "idle");
  setPhase(2, values.waiting, "idle");
};

const updateReleaseInformationBoundary = () => {
  const cards = document.querySelectorAll<HTMLElement>(".updates-boundary-card");
  const card = cards[2];
  if (!card) return;
  const values = copy();
  const notes = preferredNotes(cachedResult?.releaseNotes ?? null);
  const small = card.querySelector<HTMLElement>("small");
  const strong = card.querySelector<HTMLElement>("strong");
  const detail = card.querySelector<HTMLElement>("span");
  setText(small, document.documentElement.lang.toLowerCase().startsWith("de") ? "Release-Information" : "Release information");
  setText(strong, notes ? values.releaseNotesLabel : (document.documentElement.lang.toLowerCase().startsWith("de") ? "Nicht verfügbar" : "Not available"));
  setText(detail, notes
    ? (document.documentElement.lang.toLowerCase().startsWith("de") ? "Strukturierte Patch Notes sind vorhanden und folgen der aktuell gewählten App-Sprache." : "Structured patch notes are available and follow the currently selected app language.")
    : values.noReleaseNotes);
};

const reconcile = () => {
  if (!updatesVisible()) return;
  const values = copy();

  const checkButton = document.querySelector<HTMLButtonElement>(".check-updates");
  if (checkButton) {
    checkButton.disabled = busy !== null;
    checkButton.hidden = cachedResult?.state === "available" && busy === null;
    checkButton.textContent = busy === "checking" ? values.checking : values.check;
  }

  const signedIdentity = document.querySelector<HTMLElement>(".steps .step-card:first-child .state-pill");
  if (signedIdentity) signedIdentity.textContent = values.configured;

  document.querySelector(".install-update")?.remove();

  if (busy === "installing") {
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
    renderFlow();
    updateReleaseInformationBoundary();
    return;
  }

  if (!cachedResult) {
    renderReleaseNotes();
    renderLiveProgress();
    renderFlow();
    updateReleaseInformationBoundary();
    return;
  }

  if (cachedResult.state === "available" && cachedResult.availableVersion) {
    const displayVersion = formatDesktopVersion(cachedResult.availableVersion);
    setCopy(values.availableEyebrow, values.availableTitle(displayVersion), values.availableDetail(displayVersion));
    const panel = updateStatusPanel();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button primary install-update";
    button.dataset.version = cachedResult.availableVersion;
    button.textContent = values.install(displayVersion);
    panel?.appendChild(button);
  } else if (cachedResult.state === "current") {
    setCopy(values.currentEyebrow, formatDesktopVersion(cachedResult.currentVersion), cachedResult.detail);
  } else if (cachedResult.state === "changed") {
    setCopy(values.changedEyebrow, values.changedTitle, cachedResult.detail);
  } else {
    setCopy(values.attentionEyebrow, values.attentionTitle, cachedResult.detail);
  }

  renderReleaseNotes();
  renderLiveProgress();
  renderFlow();
  updateReleaseInformationBoundary();
};

const checkForUpdates = async () => {
  busy = "checking";
  progress = null;
  reconcile();
  try {
    cachedResult = await invoke<UpdateResult>("check_for_update");
  } catch (error: unknown) {
    cachedResult = {
      state: "error",
      currentVersion: "unknown",
      availableVersion: null,
      detail: `Update host bridge failed without changing the installation: ${String(error)}`,
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

  // A brief transition makes the explicit user-authorized boundary visible before the native
  // updater starts. It never substitutes for real progress or verification state.
  await wait(360);

  try {
    cachedResult = await invoke<UpdateResult>("apply_update", { expectedVersion });
  } catch (error: unknown) {
    cachedResult = {
      state: "error",
      currentVersion: "unknown",
      availableVersion: expectedVersion,
      detail: `Signed Desktop update installation failed without granting additional Authority: ${String(error)}`,
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

new MutationObserver(() => reconcile()).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"],
});

let workspaceScheduled = false;
new MutationObserver((mutations) => {
  const workspaceAdded = mutations.some((mutation) => [...mutation.addedNodes].some((node) =>
    node instanceof Element && (node.matches(".updates-workspace") || Boolean(node.querySelector(".updates-workspace"))),
  ));
  if (!workspaceAdded || workspaceScheduled) return;
  workspaceScheduled = true;
  requestAnimationFrame(() => {
    workspaceScheduled = false;
    reconcile();
  });
}).observe(document.documentElement, { childList: true, subtree: true });
