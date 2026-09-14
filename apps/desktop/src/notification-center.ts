import "./notification-center.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getLanguage } from "./i18n/runtime.js";

type DurableNotification = {
  id: string;
  category: string;
  severity: string;
  title: string;
  body: string;
  createdAtMs: number;
  readAtMs: number | null;
  sourceRef: string | null;
  activeUntilMs: number | null;
  inactiveAtMs: number | null;
  inactiveReason: "expired" | "withdrawn" | null;
};

type NotificationCenterSnapshot = {
  schemaVersion: number;
  unreadCount: number;
  notifications: DurableNotification[];
};

const NOTIFICATION_CENTER_CHANGED_EVENT = "livariant://notification-center-changed";
let active = false;
let snapshot: NotificationCenterSnapshot | null = null;
let loadGeneration = 0;
let lifecycleTimer: number | null = null;

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
const bellIcon = () => '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

const severityLabel = (severity: string) => {
  if (severity === "info") return text("Information", "Information");
  if (severity === "success") return text("Success", "Erfolg");
  if (severity === "warning") return text("Warning", "Warnung");
  if (severity === "error") return text("Error", "Fehler");
  if (severity === "critical") return text("Critical", "Kritisch");
  return severity;
};

const categoryLabel = (category: string) => {
  if (category === "update") return text("Update", "Update");
  return category;
};

const unavailableCopy = () => ({
  title: text("Notification Center unavailable", "Benachrichtigungszentrale nicht verfügbar"),
  detail: text(
    "Livariant could not load your durable notifications. Try opening Notifications again. If the problem continues, review Diagnostics for more detail.",
    "Livariant konnte deine dauerhaften Benachrichtigungen nicht laden. Öffne Benachrichtigungen erneut. Wenn das Problem bestehen bleibt, prüfe die Diagnose für weitere Details.",
  ),
});

const loadSnapshot = () => invoke<NotificationCenterSnapshot>("notification_center_list");
const setRead = (id: string, read: boolean) => invoke<NotificationCenterSnapshot>("notification_center_set_read", { id, read });
const markAllRead = () => invoke<NotificationCenterSnapshot>("notification_center_mark_all_read");

const formatTime = (value: number) => new Intl.DateTimeFormat(getLanguage() === "de" ? "de-DE" : "en-US", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

const lifecycleLabel = (item: DurableNotification) => {
  if (item.inactiveReason === "withdrawn") return text("Withdrawn", "Zurückgezogen");
  if (item.inactiveReason === "expired") return text("Expired", "Abgelaufen");
  return null;
};

const scheduleLifecycleRefresh = () => {
  if (lifecycleTimer !== null) {
    window.clearTimeout(lifecycleTimer);
    lifecycleTimer = null;
  }
  const now = Date.now();
  const next = snapshot?.notifications
    .filter((item) => item.inactiveAtMs === null && item.activeUntilMs !== null && item.activeUntilMs > now)
    .map((item) => item.activeUntilMs as number)
    .sort((left, right) => left - right)[0];
  if (next === undefined) return;
  lifecycleTimer = window.setTimeout(() => { void refreshSnapshot(); }, Math.max(1, next - now + 50));
};

const updateNavUnreadBadge = () => {
  const button = document.querySelector<HTMLButtonElement>("nav.nav [data-view='notifications']");
  if (!button) return;
  let badge = button.querySelector<HTMLElement>("[data-notification-nav-badge]");
  const unread = snapshot?.unreadCount ?? 0;
  if (unread === 0) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement("b");
    badge.dataset.notificationNavBadge = "true";
    button.appendChild(badge);
  }
  const desiredText = unread > 99 ? "99+" : String(unread);
  if (badge.textContent !== desiredText) badge.textContent = desiredText;
};

const renderSurface = (content: HTMLElement) => {
  const data = snapshot;
  if (!data) {
    content.innerHTML = `<section class="notification-center"><div class="notification-center-head"><div><span class="eyebrow">${text("NOTIFICATIONS", "BENACHRICHTIGUNGEN")}</span><h1>${text("Notification Center", "Benachrichtigungszentrale")}</h1></div></div><p>${text("Loading durable notifications…", "Dauerhafte Benachrichtigungen werden geladen…")}</p></section>`;
    return;
  }

  const items = data.notifications.length === 0
    ? `<div class="notification-center-empty"><h2>${text("No notifications yet", "Noch keine Benachrichtigungen")}</h2><p>${text("Durable product events will appear here when something needs your attention or should remain reviewable.", "Dauerhafte Produkt-Ereignisse erscheinen hier, wenn etwas deine Aufmerksamkeit braucht oder später nachvollziehbar bleiben soll.")}</p></div>`
    : data.notifications.map((item) => {
      const lifecycle = lifecycleLabel(item);
      return `
      <article class="notification-item ${item.readAtMs === null ? "is-unread" : ""} ${item.inactiveAtMs !== null ? "is-inactive" : ""}" data-notification-id="${escapeHtml(item.id)}">
        <div class="notification-item-meta"><span class="notification-severity" data-severity="${escapeHtml(item.severity)}">${escapeHtml(severityLabel(item.severity))}</span><span>${escapeHtml(categoryLabel(item.category))}</span>${lifecycle ? `<span>${escapeHtml(lifecycle)}</span>` : ""}<time>${escapeHtml(formatTime(item.createdAtMs))}</time></div>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.body)}</p>
        <div class="notification-item-actions">
          <button class="button secondary" type="button" data-notification-read-toggle data-read="${item.readAtMs === null ? "false" : "true"}">${item.readAtMs === null ? text("Mark as read", "Als gelesen markieren") : text("Mark as unread", "Als ungelesen markieren")}</button>
        </div>
      </article>`;
    }).join("");

  content.innerHTML = `
    <section class="notification-center" data-notification-center>
      <div class="notification-center-head">
        <div><span class="eyebrow">${text("NOTIFICATIONS", "BENACHRICHTIGUNGEN")}</span><h1>${text("Notification Center", "Benachrichtigungszentrale")}</h1><p>${text("Durable product events remain here independently of popup delivery.", "Dauerhafte Produkt-Ereignisse bleiben hier unabhängig davon erhalten, ob ein Popup angezeigt wurde.")}</p></div>
        <div class="notification-center-actions"><span class="notification-unread-count">${data.unreadCount} ${text("active unread", "aktiv ungelesen")}</span><button class="button secondary" type="button" data-notification-mark-all ${data.unreadCount === 0 ? "disabled" : ""}>${text("Mark all as read", "Alle als gelesen")}</button></div>
      </div>
      <div class="notification-list">${items}</div>
    </section>`;

  content.querySelector<HTMLButtonElement>("[data-notification-mark-all]")?.addEventListener("click", async () => {
    snapshot = await markAllRead();
    updateNavUnreadBadge();
    scheduleLifecycleRefresh();
    if (active) renderSurface(content);
  });
  content.querySelectorAll<HTMLButtonElement>("[data-notification-read-toggle]").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest<HTMLElement>("[data-notification-id]");
      const id = row?.dataset.notificationId;
      if (!id) return;
      snapshot = await setRead(id, button.dataset.read !== "true");
      updateNavUnreadBadge();
      scheduleLifecycleRefresh();
      if (active) renderSurface(content);
    });
  });
};

const refreshSnapshot = async () => {
  try {
    snapshot = await loadSnapshot();
    updateNavUnreadBadge();
    scheduleLifecycleRefresh();
    if (active) {
      const content = document.querySelector<HTMLElement>("main.content");
      if (content) renderSurface(content);
    }
  } catch (cause) {
    console.error("Notification Center refresh failed", cause);
    // A live refresh hint is best-effort presentation. The durable store remains authoritative.
  }
};

const renderIntoContent = async () => {
  const generation = ++loadGeneration;
  const content = document.querySelector<HTMLElement>("main.content");
  if (!content || !active) return;
  snapshot = null;
  renderSurface(content);
  try {
    const next = await loadSnapshot();
    if (!active || generation !== loadGeneration) return;
    snapshot = next;
    updateNavUnreadBadge();
    scheduleLifecycleRefresh();
    const current = document.querySelector<HTMLElement>("main.content");
    if (current) renderSurface(current);
  } catch (cause) {
    if (!active || generation !== loadGeneration) return;
    console.error("Notification Center load failed", cause);
    const copy = unavailableCopy();
    content.innerHTML = `<section class="notification-center"><span class="eyebrow">${text("NOTIFICATIONS", "BENACHRICHTIGUNGEN")}</span><h1>${copy.title}</h1><p>${copy.detail}</p></section>`;
  }
};

const installNavigation = () => {
  const nav = document.querySelector<HTMLElement>("nav.nav");
  if (!nav) return;

  nav.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    if (button.dataset.notificationResetBound === "true") return;
    button.dataset.notificationResetBound = "true";
    button.addEventListener("click", () => {
      if (button.dataset.view !== "notifications") {
        active = false;
        loadGeneration += 1;
      }
    }, { capture: true });
  });

  const desiredLabel = text("Notifications", "Benachrichtigungen");
  let button = nav.querySelector<HTMLButtonElement>("[data-view='notifications']");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    button.dataset.view = "notifications";
    button.innerHTML = `${bellIcon()}<span>${desiredLabel}</span>`;
    nav.insertBefore(button, nav.querySelector("[data-view='updates']"));
  } else {
    const label = button.querySelector("span");
    if (label && label.textContent !== desiredLabel) label.textContent = desiredLabel;
  }
  updateNavUnreadBadge();

  if (button.dataset.notificationBound !== "true") {
    button.dataset.notificationBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      active = true;
      document.querySelectorAll<HTMLElement>("nav.nav .nav-item").forEach((item) => item.classList.remove("active"));
      button?.classList.add("active");
      void renderIntoContent();
    });
  }

  if (active) {
    document.querySelectorAll<HTMLElement>("nav.nav .nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  }
};

const appRoot = document.querySelector<HTMLElement>("#app");
if (appRoot) {
  const observer = new MutationObserver(() => installNavigation());
  observer.observe(appRoot, { childList: true });
}
installNavigation();
void refreshSnapshot();
void listen(NOTIFICATION_CENTER_CHANGED_EVENT, () => { void refreshSnapshot(); });