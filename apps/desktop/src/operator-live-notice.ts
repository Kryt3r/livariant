import "./operator-live-notice.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getLanguage } from "./i18n/runtime.js";

const OPERATOR_LIVE_NOTICES_CHANGED_EVENT = "livariant://operator-live-notices-changed";

type OperatorLiveNotice = {
  id: string;
  severity: string;
  title: string;
  body: string;
  createdAtMs: number;
  sourceRef: string | null;
  activeUntilMs: number;
};

type OperatorLiveNoticeSnapshot = {
  schemaVersion: number;
  notices: OperatorLiveNotice[];
};

let snapshot: OperatorLiveNoticeSnapshot | null = null;
let expiryTimer: number | null = null;
let refreshGeneration = 0;

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

const activeOperatorNotices = () => {
  const now = Date.now();
  return (snapshot?.notices ?? []).filter((item) => item.activeUntilMs > now);
};

const severityRank = (severity: string) => {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
};

const render = () => {
  const frame = document.querySelector<HTMLElement>(".desktop-frame");
  if (!frame) return;

  const notices = activeOperatorNotices().sort((left, right) =>
    severityRank(left.severity) - severityRank(right.severity)
    || left.createdAtMs - right.createdAtMs,
  );

  let host = frame.querySelector<HTMLElement>("[data-operator-live-notices]");
  if (notices.length === 0) {
    host?.remove();
    frame.classList.remove("has-operator-live-notices");
    return;
  }

  if (!host) {
    host = document.createElement("section");
    host.dataset.operatorLiveNotices = "true";
    host.className = "operator-live-notices";
    host.setAttribute("aria-live", "polite");
    const shell = frame.querySelector(":scope > .app-shell");
    frame.insertBefore(host, shell ?? null);
  }

  host.setAttribute("aria-label", text("Livariant service status", "Livariant-Servicestatus"));
  frame.classList.add("has-operator-live-notices");
  host.innerHTML = notices.map((item) => `
    <article class="operator-live-notice" data-severity="${escapeHtml(item.severity)}" data-operator-notice-id="${escapeHtml(item.id)}">
      <div class="operator-live-notice-icon" aria-hidden="true">${item.severity === "critical" ? "!" : item.severity === "warning" ? "!" : "i"}</div>
      <div class="operator-live-notice-copy">
        <span class="operator-live-notice-source">${text("Livariant Service", "Livariant-Service")}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <span class="operator-live-notice-body" title="${escapeHtml(item.body)}">${escapeHtml(item.body)}</span>
      </div>
      <span class="operator-live-notice-state"><i aria-hidden="true"></i>${text("Live", "Aktiv")}</span>
    </article>
  `).join("");
};

const scheduleExpiryRefresh = () => {
  if (expiryTimer !== null) {
    window.clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  const now = Date.now();
  const nextExpiry = activeOperatorNotices()
    .map((item) => item.activeUntilMs as number)
    .sort((left, right) => left - right)[0];

  if (nextExpiry === undefined) return;
  expiryTimer = window.setTimeout(() => { void refresh(); }, Math.max(1, nextExpiry - now + 50));
};

const refresh = async () => {
  const generation = ++refreshGeneration;
  try {
    const next = await invoke<OperatorLiveNoticeSnapshot>("operator_live_notice_list");
    if (generation !== refreshGeneration) return;
    snapshot = next;
    render();
    scheduleExpiryRefresh();
  } catch {
    // Keep the last verified local state on a presentation read failure.
    render();
    scheduleExpiryRefresh();
  }
};

const appRoot = document.querySelector<HTMLElement>("#app");
if (appRoot) {
  const observer = new MutationObserver(() => render());
  observer.observe(appRoot, { childList: true });
}

void refresh();
void listen(OPERATOR_LIVE_NOTICES_CHANGED_EVENT, () => { void refresh(); });