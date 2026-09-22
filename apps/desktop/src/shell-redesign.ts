import "./shell-redesign.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage, onLanguageChange } from "./i18n/runtime.js";
import {
  getActiveDesktopProject,
  onDesktopProjectActivated,
  onDesktopProjectRegistryChanged,
} from "./desktop-project-registry.js";
import {
  getCurrentProjectSourceReviewPresentation,
  loadProjectSourceReviewPresentation,
} from "./project-source-review-bridge.js";
import { loadFirstRunLifecycle } from "./first-run-lifecycle.js";
import {
  ensureShellProjectRegistryLoaded,
  syncShellProjectSwitcher,
} from "./shell-project-switcher.js";

const SIDEBAR_STORAGE_KEY = "livariant.desktop.sidebar.collapsed";
const PRODUCT_TOUR_STORAGE_KEY = "livariant.desktop.product-tour.v1";
const PRODUCT_TOUR_EVENT = "livariant:start-product-tour";
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

type LocalProviderId = "claude" | "gemini" | "custom";
type LocalProviderStatus = {
  provider: LocalProviderId;
  installationState: "available" | "not-found" | "unusable";
  authState: "authenticated" | "configured" | "unknown" | "unavailable";
  version: string | null;
  connected: boolean;
  detail: string;
};

type HealthState = "healthy" | "degraded" | "failed" | "unknown";
let connectorStatus: ConnectorStatus | null = null;
let localProviderStatuses: Partial<Record<LocalProviderId, LocalProviderStatus>> = {};
let connectorStatusLoaded = false;
let healthRefreshInFlight: Promise<void> | null = null;
let healthRefreshPending = false;
let navObserver: MutationObserver | null = null;
let observedNav: HTMLElement | null = null;
let scheduled = false;
let enhancing = false;
let overviewRefreshInFlight: Promise<void> | null = null;
let productTourAutoStartChecked = false;
let productTourIndex = -1;
let initialLandingApplied = false;

const localProviderIds: readonly LocalProviderId[] = ["claude", "gemini", "custom"];
const providerName = (provider: LocalProviderId) => ({
  claude: "Claude",
  gemini: "Gemini",
  custom: text("Custom", "Eigene Verbindung"),
})[provider];

const connectedProviderCount = () =>
  (connectorStatus?.connected ? 1 : 0)
  + localProviderIds.filter((provider) => localProviderStatuses[provider]?.connected).length;

const anyProviderAvailable = () =>
  connectorStatus?.installationState === "available"
  || localProviderIds.some((provider) => localProviderStatuses[provider]?.installationState === "available");

const healthState = (): HealthState => {
  if (!connectorStatusLoaded) return "unknown";
  if (connectedProviderCount() > 0) return "healthy";
  if (anyProviderAvailable()) return "degraded";
  return "failed";
};

const healthLabel = () => {
  const state = healthState();
  if (state === "healthy") return text("Connections stable", "Verbindungen stabil");
  if (state === "degraded") return text("Connections need attention", "Verbindungen prüfen");
  if (state === "failed") return text("No provider connection available", "Keine Provider-Verbindung verfügbar");
  return text("Checking connections", "Verbindungen werden geprüft");
};

const healthCompactLabel = () => {
  if (!connectorStatusLoaded) return text("Checking…", "Prüfe…");
  const connected = connectedProviderCount();
  if (connected > 0) return text(
    `${connected} connected`,
    `${connected} verbunden`,
  );
  const state = healthState();
  if (state === "degraded") return text("Check", "Prüfen");
  return text("Unavailable", "Nicht verfügbar");
};

const providerDetail = (provider: "codex" | LocalProviderId): string => {
  if (!connectorStatusLoaded) return text("Checking…", "Wird geprüft…");
  if (provider === "codex") {
    if (!connectorStatus) return text("Unavailable", "Nicht verfügbar");
    if (connectorStatus.connected) return text("Connected", "Verbunden");
    if (connectorStatus.installationState === "available") return text("Ready, not connected", "Bereit, nicht verbunden");
    if (connectorStatus.installationState === "not-found") return text("Not installed", "Nicht installiert");
    return text("Needs attention", "Benötigt Aufmerksamkeit");
  }
  const status = localProviderStatuses[provider];
  if (!status) return text("Unavailable", "Nicht verfügbar");
  if (status.connected) return text("Connected", "Verbunden");
  if (status.installationState === "available" && status.authState !== "unavailable") {
    return text("Ready, not connected", "Bereit, nicht verbunden");
  }
  if (status.installationState === "not-found") {
    return provider === "custom" ? text("Not configured", "Nicht konfiguriert") : text("Not installed", "Nicht installiert");
  }
  return text("Needs attention", "Benötigt Aufmerksamkeit");
};

const connectedProviderRows = () => {
  const rows: Array<{ id: string; name: string; detail: string }> = [];
  if (connectorStatus?.connected) rows.push({ id: "codex", name: "Codex", detail: providerDetail("codex") });
  for (const provider of localProviderIds) {
    if (localProviderStatuses[provider]?.connected) {
      rows.push({ id: provider, name: providerName(provider), detail: providerDetail(provider) });
    }
  }
  return rows;
};

const healthRowsMarkup = () => {
  const rows = connectedProviderRows();
  if (!connectorStatusLoaded) {
    return `<div class="global-health-row"><span>${text("Providers", "Provider")}</span><strong data-health-tone="unknown">${text("Checking…", "Wird geprüft…")}</strong></div>`;
  }
  if (!rows.length) {
    return `<div class="global-health-row"><span>${text("Providers", "Provider")}</span><strong data-health-tone="${healthState()}">${text("No active connection", "Keine aktive Verbindung")}</strong></div>`;
  }
  return rows.map((row) =>
    `<div class="global-health-row" data-health-provider="${row.id}"><span>${esc(row.name)}</span><strong data-health-tone="healthy">${esc(row.detail)}</strong></div>`
  ).join("");
};

const syncHealthProviderRows = (header: HTMLElement) => {
  const host = header.querySelector<HTMLElement>("[data-health-provider-rows]");
  if (!host) return;
  const signature = JSON.stringify({
    loaded: connectorStatusLoaded,
    codex: connectorStatus,
    local: localProviderStatuses,
    language: getLanguage(),
  });
  if (host.dataset.healthSignature === signature) return;
  host.dataset.healthSignature = signature;
  host.innerHTML = healthRowsMarkup();
};

const overviewState = () => {
  const project = getActiveDesktopProject();
  const sources = getCurrentProjectSourceReviewPresentation();
  const providerCount = connectedProviderCount();
  const sourceCount = sources?.summary.sourceCount ?? 0;
  const sourceAttention = (sources?.summary.unavailableCount ?? 0) + (sources?.summary.staleCount ?? 0) + (sources?.summary.reviewAttentionCount ?? 0);

  let next = {
    target: "steps",
    eyebrow: text("Start here", "Hier anfangen"),
    title: text("Clarify what this project is trying to achieve", "Kläre, was dieses Projekt erreichen soll"),
    detail: text(
      "Project knowledge gives Livariant the purpose, direction and rules it needs to interpret later work.",
      "Projektwissen gibt Livariant Zweck, Richtung und Regeln, damit spätere Arbeit richtig eingeordnet werden kann.",
    ),
  };
  if (!project) {
    next = {
      target: "projects",
      eyebrow: text("Project needed", "Projekt erforderlich"),
      title: text("Add or select a project first", "Wähle oder füge zuerst ein Projekt hinzu"),
      detail: text(
        "Livariant keeps project-specific state separate. Choose the project you want to work with before reviewing anything else.",
        "Livariant hält projektspezifische Zustände getrennt. Wähle zuerst das Projekt, mit dem du arbeiten möchtest.",
      ),
    };
  } else if (sourceCount === 0) {
    next = {
      target: "source-review",
      eyebrow: text("Next useful step", "Nächster sinnvoller Schritt"),
      title: text("Connect the sources Livariant should rely on", "Verbinde die Quellen, auf die sich Livariant stützen soll"),
      detail: text(
        "Sources show where project information comes from. Missing sources mean Livariant has less evidence to work with.",
        "Quellen zeigen, woher Projektinformationen stammen. Fehlende Quellen bedeuten, dass Livariant weniger belastbare Grundlage hat.",
      ),
    };
  } else if (sourceAttention > 0) {
    next = {
      target: "source-review",
      eyebrow: text("Needs attention", "Braucht Aufmerksamkeit"),
      title: text("Review source information that may be stale or incomplete", "Prüfe Quellen, die veraltet oder unvollständig sein könnten"),
      detail: text(
        "Livariant keeps uncertainty visible instead of treating old or unavailable source material as current.",
        "Livariant lässt Unsicherheit sichtbar, statt alte oder nicht verfügbare Quellen als aktuell auszugeben.",
      ),
    };
  } else if (providerCount === 0) {
    next = {
      target: "connections",
      eyebrow: text("Optional connection", "Optionale Verbindung"),
      title: text("Connect an AI provider when you want to work with one", "Verbinde einen KI-Anbieter, wenn du mit ihm arbeiten möchtest"),
      detail: text(
        "A connection makes the provider available to Livariant. It does not give the provider automatic permission to change your project.",
        "Eine Verbindung macht den Anbieter für Livariant verfügbar. Sie gibt ihm keine automatische Erlaubnis, dein Projekt zu verändern.",
      ),
    };
  }

  return { project, sources, providerCount, sourceCount, sourceAttention, next };
};

const renderOverview = () => {
  const state = overviewState();
  const projectName = state.project?.displayName ?? text("No project selected", "Kein Projekt ausgewählt");
  const sourceStatus = state.sourceCount > 0
    ? text(`${state.sourceCount} configured`, `${state.sourceCount} eingerichtet`)
    : text("Not configured", "Nicht eingerichtet");
  const providerStatus = connectorStatusLoaded
    ? (state.providerCount > 0 ? text(`${state.providerCount} connected`, `${state.providerCount} verbunden`) : text("None connected", "Keine verbunden"))
    : text("Checking…", "Wird geprüft…");
  const sourceTone = state.sourceAttention > 0 ? "attention" : state.sourceCount > 0 ? "ready" : "unknown";

  return `
  <section class="shell-overview" data-shell-overview>
    <div class="shell-overview-hero shell-overview-hero-human">
      <div>
        <span class="eyebrow">${text("YOUR PROJECT WITH CONTEXT", "DEIN PROJEKT MIT KONTEXT")}</span>
        <h1>${text("Know what matters before the next AI acts.", "Wisse, was zählt, bevor die nächste KI handelt.")}</h1>
        <p>${text(
          "Livariant keeps the important facts, sources and open questions around your project visible. It helps you separate what is known from what still needs review, so AI work does not quietly become project truth.",
          "Livariant hält wichtige Fakten, Quellen und offene Fragen rund um dein Projekt sichtbar. So bleibt getrennt, was wirklich bekannt ist und was noch geprüft werden muss – damit KI-Arbeit nicht stillschweigend zur Projektwahrheit wird.",
        )}</p>
      </div>
      <div class="shell-overview-project-card">
        <small>${text("Current project", "Aktuelles Projekt")}</small>
        <strong>${esc(projectName)}</strong>
        <span>${state.project
          ? text("Project-specific state is active and isolated.", "Der projektspezifische Zustand ist aktiv und getrennt.")
          : text("Select a project to load its own state.", "Wähle ein Projekt, um seinen eigenen Zustand zu laden.")}</span>
      </div>
    </div>

    <div class="shell-overview-status-grid" aria-label="${text("Project status", "Projektstatus")}">
      <article class="shell-overview-status">
        <span class="shell-card-icon">${svg("brain")}</span>
        <div><small>${text("Project knowledge", "Projektwissen")}</small><strong>${text("Purpose, direction and rules", "Zweck, Richtung und Regeln")}</strong><p>${text("Review what Livariant should understand about the project.", "Prüfe, was Livariant über das Projekt verstehen soll.")}</p></div>
      </article>
      <article class="shell-overview-status" data-tone="${sourceTone}">
        <span class="shell-card-icon">${svg("sources")}</span>
        <div><small>${text("Sources", "Quellen")}</small><strong>${esc(sourceStatus)}</strong><p>${state.sourceAttention > 0 ? text("Some source information needs attention.", "Einige Quellenangaben brauchen Aufmerksamkeit.") : text("See where Livariant's project information comes from.", "Sieh, woher Livariants Projektinformationen stammen.")}</p></div>
      </article>
      <article class="shell-overview-status" data-tone="${state.providerCount > 0 ? "ready" : "unknown"}">
        <span class="shell-card-icon">${svg("diagnostics")}</span>
        <div><small>${text("AI connections", "KI-Verbindungen")}</small><strong>${esc(providerStatus)}</strong><p>${text("Connections provide capability, not automatic permission to change the project.", "Verbindungen schaffen Möglichkeiten, aber keine automatische Änderungsberechtigung.")}</p></div>
      </article>
    </div>

    <section class="shell-next-action">
      <div><span class="eyebrow">${esc(state.next.eyebrow)}</span><h2>${esc(state.next.title)}</h2><p>${esc(state.next.detail)}</p></div>
      <button class="button primary" type="button" data-shell-next-action="${esc(state.next.target)}">${text("Go there", "Dorthin")}</button>
    </section>

    <div class="shell-overview-explain">
      <div><span>1</span><strong>${text("Understand", "Verstehen")}</strong><p>${text("Livariant keeps project goals, rules and open questions explicit.", "Livariant hält Ziele, Regeln und offene Fragen ausdrücklich fest.")}</p></div>
      <div><span>2</span><strong>${text("Check the basis", "Grundlage prüfen")}</strong><p>${text("Sources show what information Livariant can actually point back to.", "Quellen zeigen, worauf Livariant Informationen tatsächlich zurückführen kann.")}</p></div>
      <div><span>3</span><strong>${text("Keep decisions human", "Entscheidungen bleiben menschlich")}</strong><p>${text("Evidence and AI output can inform changes, but they do not become accepted project truth by themselves.", "Evidence und KI-Ausgaben können Änderungen begründen, werden aber nicht von allein zu bestätigter Projektwahrheit.")}</p></div>
    </div>

    <div class="shell-overview-grid shell-overview-links">
      <button class="shell-overview-card" type="button" data-shell-shortcut="steps"><span class="shell-card-icon">${svg("brain")}</span><span><small>${text("Understand the project", "Projekt verstehen")}</small><strong>${text("Open project knowledge", "Projektwissen öffnen")}</strong></span><i>›</i></button>
      <button class="shell-overview-card" type="button" data-shell-shortcut="source-review"><span class="shell-card-icon">${svg("sources")}</span><span><small>${text("Check the basis", "Grundlage prüfen")}</small><strong>${text("Open sources", "Quellen öffnen")}</strong></span><i>›</i></button>
      <button class="shell-overview-card" type="button" data-shell-shortcut="diagnostics"><span class="shell-card-icon">${svg("diagnostics")}</span><span><small>${text("See what was observed", "Beobachtungen ansehen")}</small><strong>${text("Open diagnostics", "Diagnose öffnen")}</strong></span><i>›</i></button>
    </div>
  </section>`;
};

const openSettingsSection = (section: "projects" | "connections") => {
  document.querySelector<HTMLButtonElement>("[data-open-settings]")?.click();
  window.setTimeout(() => document.querySelector<HTMLButtonElement>(`[data-settings-section='${section}']`)?.click(), 0);
};

const navigateFromOverview = (target: string | undefined) => {
  if (!target) return;
  if (target === "projects" || target === "connections") {
    openSettingsSection(target);
    return;
  }
  document.querySelector<HTMLButtonElement>(`nav.nav [data-view='${target}']`)?.click();
};

const syncOverviewShortcuts = () => {
  document.querySelectorAll<HTMLButtonElement>("[data-shell-shortcut]").forEach((button) => {
    if (button.dataset.shellBound === "true") return;
    button.dataset.shellBound = "true";
    button.addEventListener("click", () => navigateFromOverview(button.dataset.shellShortcut));
  });
  document.querySelector<HTMLButtonElement>("[data-shell-next-action]")?.addEventListener("click", (event) => {
    navigateFromOverview((event.currentTarget as HTMLButtonElement).dataset.shellNextAction);
  });
};

const refreshOverview = async (): Promise<void> => {
  if (overviewRefreshInFlight) return overviewRefreshInFlight;
  overviewRefreshInFlight = (async () => {
    await Promise.allSettled([loadProjectSourceReviewPresentation(), refreshHealth()]);
    const content = document.querySelector<HTMLElement>("main.content");
    if (!content?.querySelector("[data-shell-overview]")) return;
    content.innerHTML = renderOverview();
    setOverviewActive();
    syncOverviewShortcuts();
  })();
  try {
    await overviewRefreshInFlight;
  } finally {
    overviewRefreshInFlight = null;
  }
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
    void refreshOverview();
  });
};

type ProductTourStep = {
  route: "overview" | "steps" | "source-review" | "diagnostics" | "settings-connections";
  target: string;
  title: readonly [string, string];
  detail: readonly [string, string];
  action: readonly [string, string];
};

const PRODUCT_TOUR_STEPS: readonly ProductTourStep[] = [
  {
    route: "overview",
    target: ".shell-overview-hero",
    title: ["Your starting point", "Dein Startpunkt"],
    detail: [
      "The Overview should answer the first question: what does Livariant currently know about this project, what needs attention and what is the next useful action?",
      "Die Übersicht beantwortet die erste Frage: Was weiß Livariant gerade über dieses Projekt, was braucht Aufmerksamkeit und was ist der nächste sinnvolle Schritt?",
    ],
    action: ["Look at the highlighted project summary and next action.", "Sieh dir die hervorgehobene Projektzusammenfassung und die nächste Aktion an."],
  },
  {
    route: "steps",
    target: ".truth-main-card",
    title: ["Project knowledge", "Projektwissen"],
    detail: [
      "This is where purpose, direction and rules are reviewed. Suggestions and observations stay separate from accepted project truth until a qualified write path exists.",
      "Hier werden Zweck, Richtung und Regeln geprüft. Vorschläge und Beobachtungen bleiben von bestätigter Projektwahrheit getrennt, bis ein qualifizierter Schreibpfad besteht.",
    ],
    action: ["Open one area after the tour to see what is known and what is missing.", "Öffne nach der Tour einen Bereich, um zu sehen, was bekannt ist und was fehlt."],
  },
  {
    route: "source-review",
    target: ".source-review-subnav",
    title: ["Check the basis", "Prüfe die Grundlage"],
    detail: [
      "Sources show where project information comes from, which repositories are configured and where review evidence is incomplete.",
      "Quellen zeigen, woher Projektinformationen stammen, welche Repositories eingerichtet sind und wo Prüfnachweise noch unvollständig sind.",
    ],
    action: ["Use the highlighted tabs to move from the overview into files, findings or GitHub evidence.", "Nutze die hervorgehobenen Reiter, um von der Übersicht zu Dateien, Befunden oder GitHub-Nachweisen zu wechseln."],
  },
  {
    route: "diagnostics",
    target: ".dc-hero",
    title: ["See what was actually observed", "Sieh, was tatsächlich beobachtet wurde"],
    detail: [
      "Diagnostics reports only measured or attributable activity. Missing data stays unknown instead of becoming a false zero, success or project score.",
      "Die Diagnose zeigt nur gemessene oder zuordenbare Aktivität. Fehlende Daten bleiben unbekannt, statt zu einer falschen Null, einem Erfolg oder Projekt-Score zu werden.",
    ],
    action: ["Use the time range and tabs to inspect usage, attribution and details.", "Nutze Zeitraum und Reiter, um Nutzung, Zuordnung und Details zu prüfen."],
  },
  {
    route: "settings-connections",
    target: ".connections-settings",
    title: ["Connections are capability, not permission", "Verbindungen sind Fähigkeit, keine Berechtigung"],
    detail: [
      "Settings is where you connect providers and GitHub. A connection makes a tool available to Livariant, but does not authorize file changes, merges or releases.",
      "In den Einstellungen verbindest du Provider und GitHub. Eine Verbindung macht ein Werkzeug für Livariant verfügbar, autorisiert aber keine Dateiänderungen, Merges oder Releases.",
    ],
    action: ["You can restart this tour later from Settings → General.", "Du kannst diese Tour später unter Einstellungen → Allgemein erneut starten."],
  },
];

const clearTourHighlight = () => {
  document.querySelectorAll<HTMLElement>(".product-tour-highlight").forEach((element) => element.classList.remove("product-tour-highlight"));
};

const closeProductTour = (completed: boolean) => {
  clearTourHighlight();
  document.querySelector<HTMLElement>("[data-product-tour]")?.remove();
  if (completed) localStorage.setItem(PRODUCT_TOUR_STORAGE_KEY, "complete");
  productTourIndex = -1;
};

const waitForTourTarget = async (selector: string): Promise<HTMLElement | null> => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const target = document.querySelector<HTMLElement>(selector);
    if (target) return target;
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }
  return null;
};

const navigateProductTour = async (step: ProductTourStep): Promise<void> => {
  if (step.route === "settings-connections") {
    openSettingsSection("connections");
  } else if (step.route === "overview") {
    document.querySelector<HTMLButtonElement>("nav.nav [data-view='overview']")?.click();
  } else {
    document.querySelector<HTMLButtonElement>(`nav.nav [data-view='${step.route}']`)?.click();
  }
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
};

const renderProductTour = async () => {
  clearTourHighlight();
  document.querySelector<HTMLElement>("[data-product-tour]")?.remove();
  if (productTourIndex < 0 || productTourIndex >= PRODUCT_TOUR_STEPS.length) return;

  const step = PRODUCT_TOUR_STEPS[productTourIndex];
  await navigateProductTour(step);
  if (productTourIndex < 0) return;
  const target = await waitForTourTarget(step.target);
  target?.classList.add("product-tour-highlight");
  target?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });

  const overlay = document.createElement("div");
  overlay.className = "product-tour-overlay";
  overlay.dataset.productTour = "true";
  const card = document.createElement("section");
  card.className = "product-tour-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "false");
  card.setAttribute("aria-labelledby", "product-tour-title");
  const progress = PRODUCT_TOUR_STEPS.map((_, index) => `<i class="${index === productTourIndex ? "active" : index < productTourIndex ? "done" : ""}"></i>`).join("");
  card.innerHTML = `
      <div class="product-tour-progress"><div class="product-tour-dots" aria-hidden="true">${progress}</div><span>${productTourIndex + 1} / ${PRODUCT_TOUR_STEPS.length}</span><button type="button" data-product-tour-skip>${text("Skip tour", "Tour überspringen")}</button></div>
      <span class="eyebrow">${text("Guided tour", "Geführte Tour")}</span>
      <h2 id="product-tour-title">${text(step.title[0], step.title[1])}</h2>
      <p>${text(step.detail[0], step.detail[1])}</p>
      <div class="product-tour-action-hint"><strong>${text("Try this:", "Probiere das:")}</strong><span>${text(step.action[0], step.action[1])}</span></div>
      <div class="product-tour-actions">
        <button class="button secondary" type="button" data-product-tour-back ${productTourIndex === 0 ? "disabled" : ""}>${text("Back", "Zurück")}</button>
        <button class="button primary" type="button" data-product-tour-next>${productTourIndex === PRODUCT_TOUR_STEPS.length - 1 ? text("Finish tour", "Tour abschließen") : text("Show next area", "Nächsten Bereich zeigen")}</button>
      </div>`;

  const rect = target?.getBoundingClientRect();
  if (rect) {
    card.dataset.vertical = rect.top + rect.height / 2 > window.innerHeight / 2 ? "top" : "bottom";
    card.dataset.horizontal = rect.left + rect.width / 2 > window.innerWidth / 2 ? "left" : "right";
  }
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  card.querySelector<HTMLButtonElement>("[data-product-tour-skip]")?.addEventListener("click", () => closeProductTour(true));
  card.querySelector<HTMLButtonElement>("[data-product-tour-back]")?.addEventListener("click", () => {
    productTourIndex -= 1;
    void renderProductTour();
  });
  card.querySelector<HTMLButtonElement>("[data-product-tour-next]")?.addEventListener("click", () => {
    if (productTourIndex >= PRODUCT_TOUR_STEPS.length - 1) {
      closeProductTour(true);
      document.querySelector<HTMLButtonElement>("nav.nav [data-view='overview']")?.click();
      return;
    }
    productTourIndex += 1;
    void renderProductTour();
  });
};

const startProductTour = () => {
  closeProductTour(false);
  productTourIndex = 0;
  void renderProductTour();
};

const maybeStartProductTour = () => {
  if (productTourAutoStartChecked) return;
  productTourAutoStartChecked = true;
  if (localStorage.getItem(PRODUCT_TOUR_STORAGE_KEY) === "complete") return;
  void loadFirstRunLifecycle().then((snapshot) => {
    if (snapshot.status !== "complete") return;
    window.setTimeout(() => {
      if (!document.querySelector(".desktop-frame.shell-redesign-active")) return;
      startProductTour();
    }, 450);
  }).catch(() => {});
};

document.addEventListener(PRODUCT_TOUR_EVENT, () => startProductTour());

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
    document.querySelectorAll<HTMLElement>(".global-project-wrap[data-open='true']").forEach((item) => {
      item.dataset.open = "false";
      item.querySelector<HTMLButtonElement>("[data-shell-project]")?.setAttribute("aria-expanded", "false");
    });
    document.querySelectorAll<HTMLElement>(".global-health-wrap[data-open='true']").forEach((item) => {
      item.dataset.open = "false";
      item.querySelector<HTMLButtonElement>("[data-shell-health]")?.setAttribute("aria-expanded", "false");
    });
    wrap.dataset.open = nextOpen ? "true" : "false";
    button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    if (nextOpen) void refreshHealth();
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

const refreshHealth = async (): Promise<void> => {
  if (healthRefreshInFlight) {
    healthRefreshPending = true;
    await healthRefreshInFlight;
    if (healthRefreshPending) {
      healthRefreshPending = false;
      await refreshHealth();
    }
    return;
  }

  const run = (async () => {
    const [codex, claude, gemini, custom] = await Promise.allSettled([
      invoke<ConnectorStatus>("codex_connector_status"),
      invoke<LocalProviderStatus>("local_provider_status", { provider: "claude" }),
      invoke<LocalProviderStatus>("local_provider_status", { provider: "gemini" }),
      invoke<LocalProviderStatus>("local_provider_status", { provider: "custom" }),
    ]);
    connectorStatus = codex.status === "fulfilled" ? codex.value : null;
    localProviderStatuses = {
      ...(claude.status === "fulfilled" ? { claude: claude.value } : {}),
      ...(gemini.status === "fulfilled" ? { gemini: gemini.value } : {}),
      ...(custom.status === "fulfilled" ? { custom: custom.value } : {}),
    };
  })();

  healthRefreshInFlight = run;
  try {
    await run;
  } finally {
    if (healthRefreshInFlight === run) healthRefreshInFlight = null;
    connectorStatusLoaded = true;
    scheduleEnhance();
  }

  if (healthRefreshPending) {
    healthRefreshPending = false;
    await refreshHealth();
  }
};

const ensureHeader = (frame: HTMLElement) => {
  const header = frame.querySelector<HTMLElement>(":scope > .window-titlebar");
  if (!header) return;
  if (header.dataset.shellRedesign !== "true") {
    header.removeAttribute("data-tauri-drag-region");
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
            <div class="global-health-popover-head"><strong>${text("Connections", "Verbindungen")}</strong><span data-health-summary-tone="${healthState()}">${esc(healthLabel())}</span></div>
            <div class="global-health-group"><small>${text("Connected LLMs & agents", "Verbundene LLMs & Agents")}</small><div data-health-provider-rows>${healthRowsMarkup()}</div></div>
            <p>${text("Connected local providers are shown here from the same host state used by Connections settings.", "Verbundene lokale Provider werden hier aus demselben Host-Status wie in den Verbindungseinstellungen angezeigt.")}</p>
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
  const healthSummary = header.querySelector<HTMLElement>("[data-health-summary-tone]");
  if (healthSummary) {
    healthSummary.dataset.healthSummaryTone = healthState();
    healthSummary.dataset.healthTone = healthState();
    healthSummary.textContent = healthLabel();
  }
  syncHealthProviderRows(header);
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
    if (!initialLandingApplied) {
      initialLandingApplied = true;
      window.setTimeout(() => document.querySelector<HTMLButtonElement>("nav.nav [data-view='overview']")?.click(), 0);
    }
    moveOperatorNotices(frame);
    syncWindowControls(frame);
    syncNotificationProxy();
    syncNavObserver();
    bindManageConnections();
    syncOverviewShortcuts();
    maybeStartProductTour();
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
document.addEventListener("livariant:connections-changed", () => { void refreshHealth(); });

onDesktopProjectActivated(async () => {
  connectorStatusLoaded = false;
  connectorStatus = null;
  localProviderStatuses = {};
  scheduleEnhance();
  await refreshHealth();
  if (document.querySelector("[data-shell-overview]")) await refreshOverview();
});
onDesktopProjectRegistryChanged(() => {
  if (document.querySelector("[data-shell-overview]")) void refreshOverview();
});
onLanguageChange(() => {
  if (document.querySelector("[data-shell-overview]")) {
    const content = document.querySelector<HTMLElement>("main.content");
    if (content) {
      content.innerHTML = renderOverview();
      setOverviewActive();
      syncOverviewShortcuts();
    }
  }
  ensureSidebar(document.querySelector<HTMLElement>(".desktop-frame") ?? document.body);
  if (productTourIndex >= 0) void renderProductTour();
});

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
