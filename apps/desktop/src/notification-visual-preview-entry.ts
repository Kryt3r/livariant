/* WP-056 Notification Center visual QA only.
   This entry is never loaded by the production Desktop entry point. It renders the
   real shell + Notification Center presentation while replacing only the native
   bridge with deterministic fixture data. */

type VisualInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

type VisualNotification = {
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

const params = new URLSearchParams(window.location.search);
const scenario = params.get("scenario") ?? "normal";
const now = Date.parse("2026-09-16T21:00:00Z");

let notifications: VisualNotification[] = scenario === "empty" ? [] : [
  {
    id: "operator:maintenance-2026-09-18",
    category: "operator",
    severity: "warning",
    title: "Geplantes Wartungsfenster",
    body: "Der Livariant-Dienst kann am 18. September zwischen 02:00 und 02:20 Uhr kurzzeitig nicht erreichbar sein.",
    createdAtMs: now - 28 * 60 * 1000,
    readAtMs: null,
    sourceRef: "operator:sequence:6",
    activeUntilMs: now + 36 * 60 * 60 * 1000,
    inactiveAtMs: null,
    inactiveReason: null,
  },
  {
    id: "update:desktop-preview-30",
    category: "update",
    severity: "info",
    title: "Desktop Preview verfügbar",
    body: "Eine neue Vorschau wurde gefunden. Installation und Veröffentlichung bleiben separate, ausdrücklich autorisierte Aktionen.",
    createdAtMs: now - 4 * 60 * 60 * 1000,
    readAtMs: null,
    sourceRef: "update:desktop-preview-30",
    activeUntilMs: null,
    inactiveAtMs: null,
    inactiveReason: null,
  },
  {
    id: "connection:codex-ready",
    category: "connection",
    severity: "success",
    title: "Codex-Verbindung bereit",
    body: "Die Verbindung ist verfügbar. Das erteilt keine Datei-, Merge- oder Release-Autorität.",
    createdAtMs: now - 22 * 60 * 60 * 1000,
    readAtMs: now - 20 * 60 * 60 * 1000,
    sourceRef: "connection:codex",
    activeUntilMs: null,
    inactiveAtMs: null,
    inactiveReason: null,
  },
  {
    id: "operator:expired-example",
    category: "operator",
    severity: "info",
    title: "Früherer Hinweis",
    body: "Dieser Eintrag bleibt als nachvollziehbarer Verlauf erhalten, ist aber nicht mehr aktiv.",
    createdAtMs: now - 4 * 24 * 60 * 60 * 1000,
    readAtMs: now - 3 * 24 * 60 * 60 * 1000,
    sourceRef: "operator:sequence:4",
    activeUntilMs: now - 2 * 24 * 60 * 60 * 1000,
    inactiveAtMs: now - 2 * 24 * 60 * 60 * 1000,
    inactiveReason: "expired",
  },
];

const snapshot = () => ({
  schemaVersion: 1,
  unreadCount: notifications.filter((item) => item.readAtMs === null && item.inactiveAtMs === null).length,
  notifications,
});

const invoke: VisualInvoke = async (command, args) => {
  if (command === "codex_connector_status") {
    return {
      installationState: "available",
      version: "visual-qa",
      connected: true,
      connectionState: "connected",
      pendingApprovals: 0,
      detail: "Visual QA fixture: connected",
      connectionMode: "auto",
      configuredCommand: null,
    };
  }
  if (command === "notification_center_list") return snapshot();
  if (command === "notification_center_set_read") {
    const id = String(args?.id ?? "");
    const read = Boolean(args?.read);
    notifications = notifications.map((item) => item.id === id
      ? { ...item, readAtMs: read ? now : null }
      : item);
    return snapshot();
  }
  if (command === "notification_center_mark_all_read") {
    notifications = notifications.map((item) => item.inactiveAtMs === null
      ? { ...item, readAtMs: item.readAtMs ?? now }
      : item);
    return snapshot();
  }
  throw new Error(`Native command '${command}' is unavailable in the Notification visual QA preview.`);
};

Object.defineProperty(window, "__TAURI_INTERNALS__", {
  configurable: true,
  value: {
    invoke,
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main" },
    },
  },
});

await import("./main.js");
await import("./shell-redesign.js");
await import("./notification-center.js");
await import("./notification-center-drawer.js");

window.requestAnimationFrame(() => {
  document.querySelector<HTMLButtonElement>("nav.nav [data-view='overview']")?.click();
  window.setTimeout(() => {
    document.querySelector<HTMLButtonElement>("[data-shell-notifications]")?.click();
  }, 300);
});
