import "./notification-center-drawer.css";
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
let open = false;
let busy = false;
let snapshot: NotificationCenterSnapshot | null = null;
let loadGeneration = 0;
let lifecycleTimer: number | null = null;
let previousFocus: HTMLElement | null = null;

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
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
  if (category === "operator") return text("Operator notice", "Operator-Hinweis");
  if (category === "connection") return text("Connection", "Verbindung");
  return category;
};

const lifecycleLabel = (item: DurableNotification) => {
  if (item.inactiveReason === "withdrawn") return text("Withdrawn", "Zurückgezogen");
  if (item.inactiveReason === "expired") return text("Expired", "Abgelaufen");
  return null;
};

const formatTime = (value: number) => new Intl.DateTimeFormat(getLanguage() === "de" ? "de-DE" : "en-US", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

const loadSnapshot = () => invoke<NotificationCenterSnapshot>("notification_center_list");
const setRead = (id: string, read: boolean) => invoke<NotificationCenterSnapshot>("notification_center_set_read", { id, read });
const markAllRead = () => invoke<NotificationCenterSnapshot>("notification_center_mark_all_read");

const updateUnreadBadges = () => {
  const unread = snapshot?.unreadCount ?? 0;
  const navButton = document.querySelector<HTMLButtonElement>("nav.nav [data-view='notifications']");
  if (navButton) {
    let badge = navButton.querySelector<HTMLElement>("[data-notification-nav-badge]");
    if (unread === 0) badge?.remove();
    else {
      if (!badge) {
        badge = document.createElement("b");
        badge.dataset.notificationNavBadge = "true";
        navButton.appendChild(badge);
      }
      badge.textContent = unread > 99 ? "99+" : String(unread);
    }
  }

  document.querySelectorAll<HTMLButtonElement>("[data-shell-notifications]").forEach((button) => {
    let badge = button.querySelector<HTMLElement>("[data-shell-notification-badge]");
    if (unread === 0) badge?.remove();
    else {
      if (!badge) {
        badge = document.createElement("span");
        badge.dataset.shellNotificationBadge = "true";
        badge.className = "global-notification-badge";
        button.appendChild(badge);
      }
      badge.textContent = unread > 99 ? "99+" : String(unread);
    }
  });
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

const ensureLayer = () => {
  let layer = document.querySelector<HTMLElement>("[data-notification-drawer-layer]");
  if (layer) return layer;
  layer = document.createElement("div");
  layer.className = "notification-drawer-layer";
  layer.dataset.notificationDrawerLayer = "true";
  layer.dataset.open = "false";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = `
    <button class="notification-drawer-scrim" type="button" data-notification-drawer-close tabindex="-1" aria-label="${text("Close notifications", "Benachrichtigungen schließen")}"></button>
    <aside class="notification-drawer" role="dialog" aria-modal="true" aria-labelledby="notification-drawer-title">
      <div data-notification-drawer-content></div>
    </aside>`;
  document.body.appendChild(layer);
  layer.querySelectorAll<HTMLElement>("[data-notification-drawer-close]").forEach((element) => {
    element.addEventListener("click", () => closeDrawer());
  });
  return layer;
};

const itemMarkup = (item: DurableNotification) => {
  const lifecycle = lifecycleLabel(item);
  return `
    <article class="notification-drawer-item ${item.readAtMs === null ? "is-unread" : ""} ${item.inactiveAtMs !== null ? "is-inactive" : ""}" data-notification-drawer-id="${escapeHtml(item.id)}">
      <div class="notification-drawer-item-top">
        <span class="notification-drawer-severity" data-severity="${escapeHtml(item.severity)}">${escapeHtml(severityLabel(item.severity))}</span>
        <span class="notification-drawer-category">${escapeHtml(categoryLabel(item.category))}</span>
        ${lifecycle ? `<span class="notification-drawer-lifecycle">${escapeHtml(lifecycle)}</span>` : ""}
        ${item.readAtMs === null ? `<span class="notification-drawer-unread-dot" aria-label="${text("Unread", "Ungelesen")}"></span>` : ""}
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
      <div class="notification-drawer-item-footer">
        <time>${escapeHtml(formatTime(item.createdAtMs))}</time>
        <button type="button" class="notification-drawer-inline-action" data-notification-drawer-read data-read="${item.readAtMs === null ? "false" : "true"}">
          ${item.readAtMs === null ? text("Mark as read", "Als gelesen") : text("Mark as unread", "Als ungelesen")}
        </button>
      </div>
    </article>`;
};

const renderDrawer = (mode: "loading" | "ready" | "error" = "ready") => {
  const layer = ensureLayer();
  const content = layer.querySelector<HTMLElement>("[data-notification-drawer-content]");
  if (!content) return;

  if (mode === "loading") {
    content.innerHTML = `
      <div class="notification-drawer-head">
        <div><span class="notification-drawer-kicker">${text("NOTIFICATIONS", "BENACHRICHTIGUNGEN")}</span><h2 id="notification-drawer-title">${text("Notification Center", "Benachrichtigungszentrale")}</h2></div>
        <button class="notification-drawer-close" type="button" data-notification-drawer-close aria-label="${text("Close", "Schließen")}">×</button>
      </div>
      <div class="notification-drawer-loading"><span></span><p>${text("Loading durable notifications…", "Dauerhafte Benachrichtigungen werden geladen…")}</p></div>`;
  } else if (mode === "error") {
    content.innerHTML = `
      <div class="notification-drawer-head">
        <div><span class="notification-drawer-kicker">${text("NOTIFICATIONS", "BENACHRICHTIGUNGEN")}</span><h2 id="notification-drawer-title">${text("Notification Center", "Benachrichtigungszentrale")}</h2></div>
        <button class="notification-drawer-close" type="button" data-notification-drawer-close aria-label="${text("Close", "Schließen")}">×</button>
      </div>
      <div class="notification-drawer-state"><strong>${text("Notifications could not be loaded", "Benachrichtigungen konnten nicht geladen werden")}</strong><p>${text("The durable store was not changed. Try again or review Diagnostics if the problem continues.", "Der dauerhafte Speicher wurde nicht verändert. Versuche es erneut oder prüfe die Diagnose, wenn das Problem bestehen bleibt.")}</p><button type="button" class="notification-drawer-primary" data-notification-drawer-retry>${text("Try again", "Erneut versuchen")}</button></div>`;
  } else {
    const data = snapshot;
    const items = data?.notifications ?? [];
    const unread = data?.unreadCount ?? 0;
    content.innerHTML = `
      <div class="notification-drawer-head">
        <div><span class="notification-drawer-kicker">${text("NOTIFICATIONS", "BENACHRICHTIGUNGEN")}</span><h2 id="notification-drawer-title">${text("Notification Center", "Benachrichtigungszentrale")}</h2><p>${text("Durable product events that stay reviewable.", "Dauerhafte Produkt-Ereignisse, die nachvollziehbar bleiben.")}</p></div>
        <button class="notification-drawer-close" type="button" data-notification-drawer-close aria-label="${text("Close", "Schließen")}">×</button>
      </div>
      <div class="notification-drawer-toolbar">
        <span><strong>${unread}</strong> ${text("unread", "ungelesen")}</span>
        <button type="button" class="notification-drawer-inline-action" data-notification-drawer-mark-all ${unread === 0 || busy ? "disabled" : ""}>${text("Mark all as read", "Alle als gelesen")}</button>
      </div>
      <div class="notification-drawer-list">
        ${items.length > 0 ? items.map(itemMarkup).join("") : `<div class="notification-drawer-state is-empty"><span class="notification-drawer-empty-icon">✓</span><strong>${text("Nothing waiting for you", "Nichts wartet auf dich")}</strong><p>${text("Durable product events will appear here when something needs attention or should remain reviewable.", "Dauerhafte Produkt-Ereignisse erscheinen hier, wenn etwas deine Aufmerksamkeit braucht oder später nachvollziehbar bleiben soll.")}</p></div>`}
      </div>`;
  }

  content.querySelectorAll<HTMLElement>("[data-notification-drawer-close]").forEach((element) => element.addEventListener("click", () => closeDrawer()));
  content.querySelector<HTMLButtonElement>("[data-notification-drawer-retry]")?.addEventListener("click", () => { void refreshSnapshot(true); });
  content.querySelector<HTMLButtonElement>("[data-notification-drawer-mark-all]")?.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    try {
      snapshot = await markAllRead();
      updateUnreadBadges();
      scheduleLifecycleRefresh();
    } finally {
      busy = false;
      if (open) renderDrawer();
    }
  });
  content.querySelectorAll<HTMLButtonElement>("[data-notification-drawer-read]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (busy) return;
      const row = button.closest<HTMLElement>("[data-notification-drawer-id]");
      const id = row?.dataset.notificationDrawerId;
      if (!id) return;
      busy = true;
      try {
        snapshot = await setRead(id, button.dataset.read !== "true");
        updateUnreadBadges();
        scheduleLifecycleRefresh();
      } finally {
        busy = false;
        if (open) renderDrawer();
      }
    });
  });
};

const refreshSnapshot = async (showLoading = false) => {
  const generation = ++loadGeneration;
  if (showLoading && open) renderDrawer("loading");
  try {
    const next = await loadSnapshot();
    if (generation !== loadGeneration) return;
    snapshot = next;
    updateUnreadBadges();
    scheduleLifecycleRefresh();
    if (open) renderDrawer();
  } catch (cause) {
    console.error("Notification drawer refresh failed", cause);
    if (generation === loadGeneration && open) renderDrawer("error");
  }
};

const syncBellState = () => {
  document.querySelectorAll<HTMLButtonElement>("[data-shell-notifications]").forEach((button) => {
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
};

const openDrawer = () => {
  if (open) {
    closeDrawer();
    return;
  }
  open = true;
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const layer = ensureLayer();
  layer.dataset.open = "true";
  layer.setAttribute("aria-hidden", "false");
  document.documentElement.dataset.notificationDrawerOpen = "true";
  syncBellState();
  renderDrawer(snapshot ? "ready" : "loading");
  void refreshSnapshot(snapshot ? false : true);
  window.setTimeout(() => layer.querySelector<HTMLButtonElement>(".notification-drawer-close")?.focus(), 0);
};

const closeDrawer = () => {
  if (!open) return;
  open = false;
  const layer = ensureLayer();
  layer.dataset.open = "false";
  layer.setAttribute("aria-hidden", "true");
  delete document.documentElement.dataset.notificationDrawerOpen;
  syncBellState();
  const focus = previousFocus;
  previousFocus = null;
  if (focus?.isConnected) focus.focus();
};

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-shell-notifications]") : null;
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  openDrawer();
}, true);

document.addEventListener("keydown", (event) => {
  if (!open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeDrawer();
  }
});

const rootObserver = new MutationObserver(() => {
  syncBellState();
  updateUnreadBadges();
});
rootObserver.observe(document.documentElement, { childList: true, subtree: true });

syncBellState();
void refreshSnapshot();
void listen(NOTIFICATION_CENTER_CHANGED_EVENT, () => { void refreshSnapshot(); });
