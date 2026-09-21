import "./shell-redesign.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";
import {
  ensureShellProjectRegistryLoaded,
  syncShellProjectSwitcher,
} from "./shell-project-switcher.js";

const SIDEBAR_STORAGE_KEY = "livariant.desktop.sidebar.collapsed";
const appRoot = document.querySelector<HTMLElement>("#app");

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
const esc = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

const svg = (name: "project" | "chevron" | "health" | "bell" | "user" | "collapse" | "brain" | "sources" | "diagnostics") => {
  const paths = {
    project: '<path d="M4 7h6l2 2h8v10H4z"/><path d="M4 7V5h6l2 2"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    health: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    collapse: '<path d="m14 6-6 6 6 6"/>',
    brain: '<path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v1a3 3 0 0 0 0 6v1a3.5 3.5 0 0 0 3.5 3.5M14.5 4.5A3.5 3.5 0 0 1 18 8v1a3 3 0 0 1 0 6v1a3.5 3.5 0 0 1-3.5 3.5M12 4v16M8.5 10H12m3.5 4H12"/>',
    sources: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    diagnostics: '<path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
};

type ConnectorStatus = {
  installationState: "available" | "not-found" | "unusable";
  version: string | null;
  connected: boolean;
  connectionState: string;
  pendingApprovals: number;
  detail: string;
};

type HealthState = "healthy" | "degraded" | "failed" | "unknown";
let connectorStatus: ConnectorStatus | null = null;
let connectorStatusLoaded = false;
let healthRefreshInFlight = false;
let navObserver: MutationObserver | null = null;
let observedNav: HTMLElement | null = null;
let scheduled = false;
let enhancing = false;

const healthState = (): HealthState => {
  if (!connectorStatusLoaded) return "unknown";
  if (!connectorStatus) return "failed";
  if (connectorStatus.connected) return "healthy";
  if (connectorStatus.installationState === "available") return "degraded";
  return "failed";
};

const healthLabel = () => {
  const state = healthState();
  if (state === "healthy") return text("Connections stable", "Verbindungen stabil");
  if (state === "degraded") return text("Connections need attention", "Verbindungen prüfen");
  if (state === "failed") return text("Connection unavailable", "Verbindung ausgefallen");
  return text("Checking connections", "Verbindungen werden geprüft");
};

const healthCompactLabel = () => {
  const state = healthState();
  if (state === "healthy") return text("Stable", "Stabil");
  if (state === "degraded") return text("Check", "Prüfen");
  if (state === "failed") return text("Unavailable", "Ausgefallen");
  return text("Checking…", "Prüfe…");
};

const connectorDetail = () => {
  if (!connectorStatusLoaded) return text("Checking…", "Wird geprüft…");
  if (!connectorStatus) return text("Unavailable", "Nicht verfügbar");
  if (connectorStatus.connected) return text("Connected", "Verbunden");
  if (connectorStatus.installationState === "available") return text("Ready, not connected", "Bereit, nicht verbunden");
  if (connectorStatus.installationState === "not-found") return text("Not installed", "Nicht installiert");
  return text("Needs attention", "Benötigt Aufmerksamkeit");
};

const renderOverview = () => `
  <section class="shell-overview" data-shell-overview>
    <div class="shell-overview-hero">
      <div>
        <span class="eyebrow">${text("PROJECT OVERVIEW", "PROJEKTÜBERSICHT")}</span>
        <h1>${text("Your project in focus.", "Dein Projekt im Fokus.")}</h1>
        <p>${text(
          "Understand what matters, continue where you left off and keep your project under control.",
          "Verstehen, was wichtig ist. Dort weitermachen, wo du aufgehört hast. Dein Projekt unter Kontrolle behalten.",
        )}</p>
      </div>
      <div class="shell-overview-orbit" aria-hidden="true"><span></span></div>
    </div>
    <div class="shell-overview-grid">
      <button class="shell-overview-card" type="button" data-shell-shortcut="steps">
        <span class="shell-card-icon">${svg("brain")}</span><span><small>${text("Project knowledge", "Projektwissen")}</small><strong>${text("Open Project Brain", "Projektwissen öffnen")}</strong></span><i>›</i>
      </button>
      <button class="shell-overview-card" type="button" data-shell-shortcut="source-review">
        <span class="shell-card-icon">${svg("sources")}</span><span><small>${text("Sources", "Quellen")}</small><strong>${text("Manage sources & review", "Quellen & Prüfung öffnen")}</strong></span><i>›</i>
      </button>
      <button class="shell-overview-card" type="button" data-shell-shortcut="diagnostics">
        <span class="shell-card-icon">${svg("diagnostics")}</span><span><small>${text("Diagnostics", "Diagnose")}</small><strong>${text("Check project health", "Projektzustand prüfen")}</strong></span><i>›</i>
      </button>
    </div>
  </section>`;

const syncOverviewShortcuts = () => {
  document.querySelectorAll<HTMLButtonElement>("[data-shell-shortcut]").forEach((button) => {
    if (button.dataset.shellBound === "true") return;
    button.dataset.shellBound = "true";
    button.addEventListener("click", () => {
      const target = button.dataset.shellShortcut;
      document.querySelector<HTMLButtonElement>(`nav.nav [data-view='${target}']`)?.click();
    });
  });
};

const setOverviewActive = () => {
  document.querySelectorAll<HTMLElement>("nav.nav .nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelector<HTMLElement>("nav.nav [data-view='overview']")?.classList.add("active");
};

const bindOverview = (button: HTMLButtonElement) => {
  if (button.dataset.shellOverviewBound === "true") return;
  button.dataset.shellOverviewBound = "true";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const content = document.querySelector<HTMLElement>("main.content");
    if (!content) return;
    content.innerHTML = renderOverview();
    setOverviewActive();
    syncOverviewShortcuts();
  });
};

const syncNotificationProxy = () => {
  const source = document.querySelector<HTMLButtonElement>("nav.nav [data-view='notifications']");
  const proxy = document.querySelector<HTMLButtonElement>("[data-shell-notifications]");
  if (!proxy) return;

  const sourceBadge = source?.querySelector<HTMLElement>("[data-notification-nav-badge]");
  let proxyBadge = proxy.querySelector<HTMLElement>("[data-shell-notification-badge]");
  const value = sourceBadge?.textContent?.trim() ?? "";
  if (!value) {
    proxyBadge?.remove();
  } else {
    if (!proxyBadge) {
      proxyBadge = document.createElement("span");
      proxyBadge.dataset.shellNotificationBadge = "true";
      proxyBadge.className = "global-notification-badge";
      proxy.appendChild(proxyBadge);
    }
    if (proxyBadge.textContent !== value) proxyBadge.textContent = value;
  }

  if (source && proxy.dataset.shellNotificationBound !== "true") {
    proxy.dataset.shellNotificationBound = "true";
    proxy.addEventListener("click", () => {
      document.querySelector<HTMLButtonElement>("nav.nav [data-view='notifications']")?.click();
    });
  }
};

const syncNavObserver = () => {
  const nav = document.querySelector<HTMLElement>("nav.nav");
  if (!nav || nav === observedNav) return;
  navObserver?.disconnect();
  observedNav = nav;
  navObserver = new MutationObserver(() => scheduleEnhance());
  navObserver.observe(nav, { childList: true, subtree: true, characterData: true });
};

const bindConnectionPopover = (button: HTMLButtonElement) => {
  if (button.dataset.shellHealthBound === "true") return;
  button.dataset.shellHealthBound = "true";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const wrap = button.closest<HTMLElement>(".global-health-wrap");
    if (!wrap) return;
    const nextOpen = wrap.dataset.open !== "true";
    document.querySelectorAll<HTMLElement>(".global-health-wrap[data-open='true']").forEach((item) => {
      item.dataset.open = "false";
      item.querySelector<HTMLButtonElement>("[data-shell-health]")?.setAttribute("aria-expanded", "false");
    });
    wrap.dataset.open = nextOpen ? "true" : "false";
    button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
  });
};

const bindManageConnections = () => {
  const button = document.querySelector<HTMLButtonElement>("[data-shell-manage-connections]");
  if (!button || button.dataset.shellBound === "true") return;
  button.dataset.shellBound = "true";
  button.addEventListener("click", () => {
    document.querySelector<HTMLButtonElement>("[data-open-settings]")?.click();
    window.setTimeout(() => document.querySelector<HTMLButtonElement>("[data-settings-section='connections']")?.click(), 0);
  });
};

const refreshHealth = async () => {
  if (healthRefreshInFlight) return;
  healthRefreshInFlight = true;
  try {
    connectorStatus = await invoke<ConnectorStatus>("codex_connector_status");
  } catch {
    connectorStatus = null;
  } finally {
    connectorStatusLoaded = true;
    healthRefreshInFlight = false;
    scheduleEnhance();
  }
};

const ensureHeader = (frame: HTMLElement) => {
  const header = frame.querySelector<HTMLElement>(":scope > .window-titlebar");
  if (!header) return;
  if (header.dataset.shellRedesign !== "true") {
    const currentControls = header.querySelector<HTMLElement>(".window-controls");
    const logo = header.querySelector<HTMLImageElement>(".window-brand img")?.src
      ?? frame.querySelector<HTMLImageElement>(".sidebar .brand img")?.src
      ?? "";
    header.dataset.shellRedesign = "true";
    header.classList.add("livariant-global-header");
    header.innerHTML = `
      <div class="global-header-left">
        <div class="global-brand" data-tauri-drag-region>${logo ? `<img src="${esc(logo)}" alt="" aria-hidden="true"/>` : ""}<strong data-tauri-drag-region>Livariant</strong></div>
        <div data-shell-project-host></div>
      </div>
      <div class="global-notice-slot" data-operator-notice-slot data-tauri-drag-region></div>
      <div class="global-header-right">
        <div class="global-health-wrap" data-health-state="${healthState()}" data-open="false">
          <button class="global-health" type="button" data-shell-health aria-haspopup="true" aria-expanded="false" aria-label="${esc(healthLabel())}">
            <span class="global-health-indicator">${svg("health")}</span><span class="global-health-label">${esc(healthCompactLabel())}</span><span class="global-health-chevron">⌄</span>
          </button>
          <div class="global-health-popover" role="dialog" aria-label="${text("Connection status", "Verbindungsstatus")}">
            <div class="global-health-popover-head"><strong>${text("Connections", "Verbindungen")}</strong><span data-health-tone="${healthState()}">${esc(healthLabel())}</span></div>
            <div class="global-health-group"><small>${text("LLMs & agents", "LLMs & Agents")}</small><div class="global-health-row"><span>Codex</span><strong data-health-tone="${healthState()}">${esc(connectorDetail())}</strong></div></div>
            <p>${text("Additional configured connections will appear here as their global health signals become available.", "Weitere eingerichtete Verbindungen erscheinen hier, sobald ihre globalen Statussignale verfügbar sind.")}</p>
            <button class="global-health-manage" type="button" data-shell-manage-connections>${text("Manage connections", "Verbindungen verwalten")}</button>
          </div>
        </div>
        <button class="global-notifications" type="button" data-shell-notifications aria-label="${text("Notifications", "Benachrichtigungen")}">${svg("bell")}</button>
        <button class="global-account" type="button" disabled aria-disabled="true" aria-label="${text("Account area, not configured yet", "Kontobereich, noch nicht eingerichtet")}">
          <span class="global-account-avatar">${svg("user")}</span><span><strong>${text("Account", "Konto")}</strong><small>${text("Not configured", "Noch nicht eingerichtet")}</small></span>
        </button>
        <div class="global-window-controls" data-shell-window-controls></div>
      </div>`;
    const target = header.querySelector<HTMLElement>("[data-shell-window-controls]");
    if (currentControls && target) target.appendChild(currentControls);
  }

  const healthWrap = header.querySelector<HTMLElement>(".global-health-wrap");
  const healthButton = header.querySelector<HTMLButtonElement>("[data-shell-health]");
  if (healthWrap) healthWrap.dataset.healthState = healthState();
  if (healthButton) {
    healthButton.setAttribute("aria-label", healthLabel());
    const label = healthButton.querySelector<HTMLElement>(".global-health-label");
    if (label) label.textContent = healthCompactLabel();
    bindConnectionPopover(healthButton);
  }
  header.querySelectorAll<HTMLElement>("[data-health-tone]").forEach((element) => {
    element.dataset.healthTone = healthState();
    if (element.closest(".global-health-popover-head")) element.textContent = healthLabel();
    else element.textContent = connectorDetail();
  });
};

const ensureSidebar = (frame: HTMLElement) => {
  const shell = frame.querySelector<HTMLElement>(":scope > .app-shell");
  const sidebar = shell?.querySelector<HTMLElement>(":scope > .sidebar");
  const nav = sidebar?.querySelector<HTMLElement>("nav.nav");
  if (!shell || !sidebar || !nav) return;

  const savedCollapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  if (!shell.dataset.sidebarInitialized) {
    shell.dataset.sidebarCollapsed = savedCollapsed ? "true" : "false";
    shell.dataset.sidebarInitialized = "true";
  }
  sidebar.querySelector(".brand")?.remove();
  sidebar.querySelector(".sidebar-footer")?.remove();

  let top = sidebar.querySelector<HTMLElement>(".sidebar-shell-head");
  if (!top) {
    top = document.createElement("div");
    top.className = "sidebar-shell-head";
    top.innerHTML = `<span>${text("Navigation", "Navigation")}</span><button type="button" class="sidebar-collapse" data-shell-collapse aria-label="${text("Collapse navigation", "Navigation einklappen")}">${svg("collapse")}</button>`;
    sidebar.insertBefore(top, nav);
  }

  const collapse = sidebar.querySelector<HTMLButtonElement>("[data-shell-collapse]");
  if (collapse && collapse.dataset.shellBound !== "true") {
    collapse.dataset.shellBound = "true";
    collapse.addEventListener("click", () => {
      const collapsed = shell.dataset.sidebarCollapsed === "true";
      shell.dataset.sidebarCollapsed = collapsed ? "false" : "true";
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "false" : "true");
      collapse.setAttribute("aria-label", collapsed ? text("Collapse navigation", "Navigation einklappen") : text("Expand navigation", "Navigation ausklappen"));
    });
  }

  const home = nav.querySelector<HTMLButtonElement>(".nav-item:not([data-view])");
  if (home) {
    home.dataset.view = "overview";
    const label = home.querySelector("span");
    if (label) label.textContent = text("Overview", "Übersicht");
    home.title = text("Overview", "Übersicht");
    bindOverview(home);
  }

  const projectKnowledge = nav.querySelector<HTMLButtonElement>("[data-view='steps']");
  if (projectKnowledge) {
    const label = projectKnowledge.querySelector("span");
    if (label) label.textContent = text("Project knowledge", "Projektwissen");
    projectKnowledge.title = text("Project knowledge", "Projektwissen");
  }

  const sources = nav.querySelector<HTMLButtonElement>("[data-view='source-review']");
  if (sources) {
    const label = sources.querySelector("span");
    if (label) label.textContent = text("Sources", "Quellen");
    sources.title = text("Sources", "Quellen");
  }

  const diagnostics = nav.querySelector<HTMLButtonElement>("[data-view='diagnostics']");
  if (diagnostics) {
    const label = diagnostics.querySelector("span");
    if (label) label.textContent = text("Diagnostics", "Diagnose");
    diagnostics.title = text("Diagnostics", "Diagnose");
  }

  nav.querySelector<HTMLButtonElement>("[data-view='updates']")?.setAttribute("data-shell-hidden", "true");
  nav.querySelector<HTMLButtonElement>("[data-view='notifications']")?.setAttribute("data-shell-hidden", "true");
  nav.querySelector<HTMLButtonElement>("[data-view='connections']")?.setAttribute("data-shell-hidden", "true");

  const settings = sidebar.querySelector<HTMLButtonElement>("[data-open-settings]");
  if (settings) {
    const label = settings.querySelector("span");
    if (label) label.textContent = text("Settings", "Einstellungen");
    settings.title = text("Settings", "Einstellungen");
  }
};

const moveOperatorNotices = (frame: HTMLElement) => {
  const host = frame.querySelector<HTMLElement>("[data-operator-live-notices]");
  const slot = frame.querySelector<HTMLElement>("[data-operator-notice-slot]");
  if (host && slot && host.parentElement !== slot) slot.appendChild(host);
};

const syncWindowControls = (frame: HTMLElement) => {
  const target = frame.querySelector<HTMLElement>("[data-shell-window-controls]");
  const controls = frame.querySelector<HTMLElement>(".window-controls");
  if (target && controls && controls.parentElement !== target) target.appendChild(controls);
};

const enhance = () => {
  if (enhancing) return;
  enhancing = true;
  try {
    const frame = document.querySelector<HTMLElement>(".desktop-frame");
    if (!frame) return;
    frame.classList.add("shell-redesign-active");
    ensureHeader(frame);
    syncShellProjectSwitcher();
    ensureShellProjectRegistryLoaded();
    ensureSidebar(frame);
    moveOperatorNotices(frame);
    syncWindowControls(frame);
    syncNotificationProxy();
    syncNavObserver();
    bindManageConnections();
    syncOverviewShortcuts();
  } finally {
    enhancing = false;
  }
};

function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    enhance();
  });
}

if (appRoot) {
  const observer = new MutationObserver(() => scheduleEnhance());
  observer.observe(appRoot, { childList: true, subtree: true });
}

document.addEventListener("livariant:shell-rendered", () => enhance());

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".global-health-wrap")) {
    document.querySelectorAll<HTMLElement>(".global-health-wrap[data-open='true']").forEach((item) => {
      item.dataset.open = "false";
      item.querySelector<HTMLButtonElement>("[data-shell-health]")?.setAttribute("aria-expanded", "false");
    });
  }
});

enhance();
void refreshHealth();
