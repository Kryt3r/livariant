import "./connections-redesign.css";
import "./connections-polish.css";
import "./diagnostics-redesign.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage, t } from "./i18n/runtime.js";

export type ConnectorDesktopView = "connections" | "diagnostics";

type ConnectorStatus = {
  installationState: "available" | "not-found" | "unusable";
  version: string | null;
  connected: boolean;
  connectionState: string;
  pendingApprovals: number;
  detail: string;
  connectionMode?: "auto" | "manual";
  configuredCommand?: string | null;
};

type DiagnosticPreset = "1d" | "7d" | "30d" | "90d" | "all";

type ObservedAttributionGroup = {
  value: string;
  eventCount: number;
  totalTokens: number;
  knownTotalTokenEvents: number;
  unknownTotalTokenEvents: number;
};

type ObservedAttributionDimension = {
  attributedEventCount: number;
  unattributedEventCount: number;
  groups: ObservedAttributionGroup[];
};

type ObservedAttributionSummary = {
  provider: ObservedAttributionDimension;
  model: ObservedAttributionDimension;
  projectId: ObservedAttributionDimension;
  sessionId: ObservedAttributionDimension;
  taskId: ObservedAttributionDimension;
};

type DiagnosticsSummary = {
  preset: DiagnosticPreset;
  range: { start?: string; end?: string };
  hasObservedData: boolean;
  storage: string;
  observed: {
    eventCount: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    knownFieldCount: number;
    unknownFieldCount: number;
  };
  avoided: { eventCount: number; contextTokens: number };
  estimated: { eventCount: number; tokens: number };
  attribution: ObservedAttributionSummary;
};

type MeasureResult = { connection: ConnectorStatus; diagnostics: DiagnosticsSummary };
type ProviderId = "codex" | "claude" | "gemini" | "custom";
type ConnectorAction = "connect" | "disconnect" | null;

let connector: ConnectorStatus | null = null;
let diagnostics: DiagnosticsSummary | null = null;
let checkingConnector = false;
let connectorAction: ConnectorAction = null;
let diagnosticsBusy: "measure" | "diagnostics" | null = null;
let error: string | null = null;
let selectedProvider: ProviderId | null = null;
let selectedDiagnosticsPreset: DiagnosticPreset = "30d";

const esc = (value: string) => value.replace(/[&<>'\"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;",
})[character] ?? character);

const formatNumber = (value: number) => new Intl.NumberFormat(getLanguage() === "de" ? "de-DE" : "en-US").format(value);
const measured = (value: number) => diagnostics?.hasObservedData ? formatNumber(value) : "—";
const connectorMutating = () => connectorAction !== null;
const lang = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;

const presetLabel = (preset: DiagnosticPreset) => ({
  "1d": t("diagnostics.day"),
  "7d": t("diagnostics.days7"),
  "30d": t("diagnostics.days30"),
  "90d": t("diagnostics.days90"),
  all: t("diagnostics.allTime"),
})[preset];

const diagnosticsRangeLabel = (preset: DiagnosticPreset) => ({
  "1d": t("diagnostics.last24"),
  "7d": t("diagnostics.last7"),
  "30d": t("diagnostics.last30"),
  "90d": t("diagnostics.last90"),
  all: t("diagnostics.allEvidence"),
})[preset];

const formatAttributionDimension = (dimension: ObservedAttributionDimension | undefined): string => {
  if (!dimension || dimension.groups.length === 0) return t("common.unavailable");
  const eventWord = (count: number) => lang(count === 1 ? "event" : "events", count === 1 ? "Ereignis" : "Ereignisse");
  const visible = dimension.groups.slice(0, 3).map((group) => `${group.value} · ${formatNumber(group.eventCount)} ${eventWord(group.eventCount)}`);
  const remainder = dimension.groups.length - visible.length;
  return `${visible.join(" · ")}${remainder > 0 ? lang(` · +${formatNumber(remainder)} more`, ` · +${formatNumber(remainder)} weitere`) : ""}`;
};

const unknownTotalEvents = (dimension: ObservedAttributionDimension | undefined): number =>
  dimension?.groups.reduce((sum, group) => sum + group.unknownTotalTokenEvents, 0) ?? 0;

const providerGlyph = (provider: ProviderId) => {
  if (provider === "codex") return '<span class="provider-glyph provider-glyph-codex">C</span>';
  if (provider === "claude") return '<span class="provider-glyph provider-glyph-claude">A</span>';
  if (provider === "gemini") return '<span class="provider-glyph provider-glyph-gemini">G</span>';
  return '<span class="provider-glyph provider-glyph-custom">+</span>';
};

const codexState = () => {
  if (checkingConnector) return { label: lang("Checking", "Prüft"), tone: "checking", detail: lang("Inspecting the local Codex installation…", "Lokale Codex-Installation wird geprüft…") };
  if (connector?.connected) return { label: t("connections.connected"), tone: "connected", detail: lang(`Codex ${connector.version ?? ""} · App Server connected`, `Codex ${connector.version ?? ""} · App Server verbunden`) };
  if (connector?.installationState === "available") return { label: t("common.ready"), tone: "ready", detail: lang(`Codex ${connector.version ?? ""} detected locally`, `Codex ${connector.version ?? ""} lokal erkannt`) };
  if (connector?.installationState === "unusable") return { label: t("connections.needsAttention"), tone: "warning", detail: lang("Codex was found but cannot be used yet", "Codex wurde gefunden, kann aber noch nicht verwendet werden") };
  if (connector?.installationState === "not-found") return { label: t("connections.setupNeeded"), tone: "warning", detail: lang("Codex CLI was not found on this machine", "Codex CLI wurde auf diesem Gerät nicht gefunden") };
  return { label: t("connections.notChecked"), tone: "muted", detail: lang("Open Codex to check the local connection", "Öffne Codex, um die lokale Verbindung zu prüfen") };
};

export async function refreshConnector(): Promise<void> {
  checkingConnector = true;
  error = null;
  try { connector = await invoke<ConnectorStatus>("codex_connector_status"); }
  catch (cause) { error = String(cause); }
  finally { checkingConnector = false; }
}

export async function refreshDiagnostics(): Promise<void> {
  diagnosticsBusy = "diagnostics";
  error = null;
  try { diagnostics = await invoke<DiagnosticsSummary>("codex_diagnostics_summary", { preset: selectedDiagnosticsPreset }); }
  catch (cause) { error = String(cause); }
  finally { diagnosticsBusy = null; }
}

const renderProviderCard = (provider: ProviderId, name: string, description: string, status: string, tone: string, enabled = true) => `
  <button class="provider-card ${enabled ? "" : "provider-card-planned"}" type="button" data-provider="${provider}">
    <span class="provider-card-main">${providerGlyph(provider)}<span class="provider-copy"><strong>${name}</strong><small>${description}</small></span></span>
    <span class="provider-card-state"><span class="provider-status provider-status-${tone}"><i></i>${status}</span><span class="provider-chevron">›</span></span>
  </button>`;

const renderCodexModal = () => {
  const state = codexState();
  const detected = connector?.installationState === "available";
  const connected = connector?.connected === true;
  const mode = connector?.connectionMode ?? "auto";
  return `
    <div class="provider-modal-backdrop" data-close-provider>
      <section class="provider-modal" role="dialog" aria-modal="true" aria-labelledby="provider-codex-title" data-provider-modal>
        <button class="provider-modal-close" type="button" data-close-provider aria-label="${lang("Close Codex settings", "Codex-Einstellungen schließen")}">×</button>
        <header class="provider-modal-header">
          ${providerGlyph("codex")}
          <div><span class="eyebrow">OpenAI</span><h2 id="provider-codex-title">Codex</h2><p>${lang("Connect Livariant through the official local Codex App Server boundary.", "Verbinde Livariant über die offizielle lokale Codex-App-Server-Grenze.")}</p></div>
          <span class="provider-status provider-status-${state.tone}"><i></i>${state.label}</span>
        </header>
        ${error ? `<div class="provider-alert provider-alert-error"><div class="provider-alert-copy"><strong>${t("connections.needsAttention")}</strong><p>${esc(error)}</p></div></div>` : ""}
        <section class="provider-primary-card">
          <div><span class="provider-card-kicker">${lang("Connection", "Verbindung")}</span><h3>${connected ? lang("Codex is connected", "Codex ist verbunden") : detected ? lang("Ready for one-click connection", "Bereit für die Ein-Klick-Verbindung") : lang("Codex setup required", "Codex-Einrichtung erforderlich")}</h3><p>${esc(error ?? connector?.detail ?? state.detail)}</p></div>
          <div class="provider-primary-actions">
            <button class="button secondary connector-refresh" type="button" ${checkingConnector || connectorMutating() ? "disabled" : ""}>${checkingConnector ? lang("Checking…", "Prüfe…") : t("common.refresh")}</button>
            ${connected
              ? `<button class="button secondary connector-disconnect" type="button" ${connectorMutating() ? "disabled" : ""}>${connectorAction === "disconnect" ? lang("Disconnecting…", "Trenne…") : t("connections.disconnect")}</button>`
              : `<button class="button primary connector-connect" type="button" ${connectorMutating() || !detected ? "disabled" : ""}>${connectorAction === "connect" ? lang("Connecting…", "Verbinde…") : t("connections.connectCodex")}</button>`}
          </div>
        </section>
        <section class="provider-detail-grid" aria-label="${lang("Codex connection details", "Codex-Verbindungsdetails")}">
          <div class="provider-detail"><small>${lang("Installation", "Installation")}</small><strong>${detected ? `Codex ${esc(connector?.version ?? "")}` : connector?.installationState === "unusable" ? lang("Unusable", "Nicht nutzbar") : lang("Not detected", "Nicht erkannt")}</strong></div>
          <div class="provider-detail"><small>App Server</small><strong>${connected ? t("connections.connected") : lang("Disconnected", "Getrennt")}</strong></div>
          <div class="provider-detail"><small>${lang("Connection method", "Verbindungsmethode")}</small><strong>${connected ? (mode === "manual" ? lang("Local fallback", "Lokaler Fallback") : lang("Automatic", "Automatisch")) : lang("Not active", "Nicht aktiv")}</strong></div>
          <div class="provider-detail"><small>${lang("Approvals", "Freigaben")}</small><strong>${connector?.pendingApprovals ?? 0} ${lang("pending", "ausstehend")}</strong></div>
        </section>
        <footer class="provider-boundary"><span>i</span><p><strong>${lang("Authority stays separate.", "Authority bleibt getrennt.")}</strong> ${lang("Connecting Codex does not authorize file changes, commands, merges or releases.", "Das Verbinden von Codex autorisiert keine Dateiänderungen, Befehle, Merges oder Releases.")}</p></footer>
      </section>
    </div>`;
};

const renderPlannedProviderModal = (provider: Exclude<ProviderId, "codex">) => {
  const copy = {
    claude: { name: "Claude", vendor: "Anthropic" },
    gemini: { name: "Gemini", vendor: "Google" },
    custom: { name: lang("Custom connection", "Eigene Verbindung"), vendor: lang("Advanced", "Erweitert") },
  }[provider];
  return `
    <div class="provider-modal-backdrop" data-close-provider>
      <section class="provider-modal provider-modal-compact" role="dialog" aria-modal="true" data-provider-modal>
        <button class="provider-modal-close" type="button" data-close-provider aria-label="${lang("Close provider details", "Anbieterdetails schließen")}">×</button>
        <header class="provider-modal-header">${providerGlyph(provider)}<div><span class="eyebrow">${copy.vendor}</span><h2>${copy.name}</h2></div><span class="provider-status provider-status-muted"><i></i>${lang("Planned", "Geplant")}</span></header>
        <section class="provider-setup-card"><span class="provider-setup-icon">i</span><div><strong>${lang("Not available in this preview", "In dieser Vorschau nicht verfügbar")}</strong><p>${lang("This provider is visible so the layout can scale without pretending unsupported functionality exists.", "Dieser Anbieter ist sichtbar, damit das Layout skalieren kann, ohne nicht unterstützte Funktionen vorzutäuschen.")}</p></div></section>
      </section>
    </div>`;
};

const renderProviderModal = () => selectedProvider
  ? selectedProvider === "codex" ? renderCodexModal() : renderPlannedProviderModal(selectedProvider)
  : "";

export function renderConnectionsSettingsView(): string {
  const state = codexState();
  const connectedCount = connector?.connected ? 1 : 0;
  return `
    <section class="settings-panel connections-settings" data-surface="connections">
      <div class="connections-heading">
        <div><span class="eyebrow">${t("connections.llmsAgents")}</span><h2>${t("connections.title")}</h2><p>${t("connections.description")}</p></div>
        <div class="connections-overview"><strong>${connectedCount}</strong><span>${lang("connected", "verbunden")}</span></div>
      </div>
      <div class="connection-summary-row"><span><i class="summary-dot ${connector?.connected ? "connected" : ""}"></i><strong>${connector?.connected ? lang("1 provider connected", "1 Anbieter verbunden") : t("connections.noProviders")}</strong></span></div>
      <div class="provider-grid" aria-label="${lang("Available LLM and agent connections", "Verfügbare LLM- und Agent-Verbindungen")}">
        ${renderProviderCard("codex", "Codex", lang("OpenAI · local App Server", "OpenAI · lokaler App Server"), state.label, state.tone)}
        ${renderProviderCard("claude", "Claude", lang("Anthropic · provider support", "Anthropic · Anbieter-Unterstützung"), lang("Planned", "Geplant"), "muted", false)}
        ${renderProviderCard("gemini", "Gemini", lang("Google · provider support", "Google · Anbieter-Unterstützung"), lang("Planned", "Geplant"), "muted", false)}
        ${renderProviderCard("custom", lang("Custom connection", "Eigene Verbindung"), lang("Advanced provider setup", "Erweiterte Anbieter-Einrichtung"), lang("Planned", "Geplant"), "muted", false)}
      </div>
      ${renderProviderModal()}
    </section>`;
}

export function renderConnectionsView(): string {
  return `<div data-surface="connections-view"><header class="topbar"><div><span class="eyebrow">${t("settings.title")}</span><h1>${t("connections.title")}</h1></div></header>${renderConnectionsSettingsView()}</div>`;
}

const diagnosticsClassGrid = () => {
  const hasObservedData = diagnostics?.hasObservedData === true;
  return `
    <section class="diagnostics-class-grid diagnostics-class-grid-compact">
      <article class="diagnostics-class-card observed">
        <div class="diagnostics-class-top"><span class="diagnostics-class-label"><i></i>Observed</span><span class="diagnostics-class-state">${hasObservedData ? t("diagnostics.measured") : t("common.unknown")}</span></div>
        <h3>${t("diagnostics.measuredFacts")}</h3><p>${t("diagnostics.directEvidence")}</p>
      </article>
      <article class="diagnostics-class-card avoided">
        <div class="diagnostics-class-top"><span class="diagnostics-class-label"><i></i>Avoided</span><span class="diagnostics-class-state">${formatNumber(diagnostics?.avoided.eventCount ?? 0)} ${lang("events", "Ereignisse")}</span></div>
        <h3>${t("diagnostics.preventedWork")}</h3><p>${formatNumber(diagnostics?.avoided.contextTokens ?? 0)} ${lang("context tokens recorded as avoided by qualified host evidence.", "Kontext-Tokens wurden durch qualifizierte Host-Evidence als vermieden erfasst.")}</p>
      </article>
      <article class="diagnostics-class-card estimated">
        <div class="diagnostics-class-top"><span class="diagnostics-class-label"><i></i>Estimated</span><span class="diagnostics-class-state">${formatNumber(diagnostics?.estimated.eventCount ?? 0)} ${lang("events", "Ereignisse")}</span></div>
        <h3>${t("diagnostics.modeledValues")}</h3><p>${formatNumber(diagnostics?.estimated.tokens ?? 0)} ${lang("modeled tokens recorded as Estimated, never Observed.", "modellierte Tokens wurden als Estimated erfasst, niemals als Observed.")}</p>
      </article>
    </section>`;
};

const diagnosticsDetails = () => `
  <details class="diagnostics-details">
    <summary><span><strong>${t("diagnostics.measurementDetails")}</strong><small>${t("diagnostics.providerModel")}</small></span><span class="diagnostics-details-chevron">⌄</span></summary>
    <div class="diagnostics-details-body">
      <div class="diagnostics-context-grid">
        <article class="diagnostics-context-card"><small>Provider</small><strong>Codex</strong><span>${t("diagnostics.qualifiedContract")}</span></article>
        <article class="diagnostics-context-card"><small>Model</small><strong>${t("diagnostics.notExposed")}</strong><span>${t("diagnostics.noModelGuess")}</span></article>
      </div>
      <div class="diagnostics-definitions">
        <div class="diagnostics-definition"><strong>${t("diagnostics.totalTokens")}</strong><span>${t("diagnostics.runtimeTotal")}</span></div>
        <div class="diagnostics-definition"><strong>Input</strong><span>${t("diagnostics.runtimeInput")}</span></div>
        <div class="diagnostics-definition"><strong>Output</strong><span>${t("diagnostics.runtimeOutput")}</span></div>
        <div class="diagnostics-definition"><strong>${t("diagnostics.cachedInput")}</strong><span>${t("diagnostics.cacheRead")}</span></div>
        <div class="diagnostics-definition"><strong>Reasoning</strong><span>${t("diagnostics.reasoningEvidence")}</span></div>
      </div>
    </div>
  </details>`;

export function renderDiagnosticsView(): string {
  const observed = diagnostics?.observed;
  const attribution = diagnostics?.attribution;
  const connected = connector?.connected === true;
  const providerUnknownTotals = unknownTotalEvents(attribution?.provider);
  const calculation = lang(
    `Token counters come only from provider/runtime-owned Observed evidence inside ${presetLabel(selectedDiagnosticsPreset).toLowerCase()}. Attribution groups reuse those retained events; grouped total-token sums include only events that explicitly contain totalTokens.${providerUnknownTotals > 0 ? ` ${formatNumber(providerUnknownTotals)} provider-attributed events have no explicit total-token value and remain unknown.` : ""}`,
    `Token-Zähler stammen ausschließlich aus provider-/runtime-eigener Observed-Evidence innerhalb von ${presetLabel(selectedDiagnosticsPreset)}. Attributionsgruppen verwenden dieselben gespeicherten Ereignisse; gruppierte Gesamt-Tokenwerte enthalten nur Ereignisse mit explizitem totalTokens-Wert.${providerUnknownTotals > 0 ? ` ${formatNumber(providerUnknownTotals)} dem Provider zugeordnete Ereignisse besitzen keinen expliziten Gesamt-Tokenwert und bleiben unbekannt.` : ""}`,
  );
  const attributionValues = [
    formatAttributionDimension(attribution?.provider),
    formatAttributionDimension(attribution?.model),
    formatAttributionDimension(attribution?.projectId),
    formatAttributionDimension(attribution?.sessionId),
    formatAttributionDimension(attribution?.taskId),
  ];
  return `
    <div class="diagnostics-surface" data-surface="diagnostics" data-diagnostics-preset="${selectedDiagnosticsPreset}">
      <header class="topbar"><div><span class="eyebrow">${t("diagnostics.measuredEvidence")}</span><h1>${t("diagnostics.title")}</h1><p>${t("diagnostics.intro")}</p></div><div class="topbar-actions"><label hidden><span class="sr-only">${t("diagnostics.period")}</span><select class="diagnostics-period" ${diagnosticsBusy ? "disabled" : ""}><option value="1d" ${selectedDiagnosticsPreset === "1d" ? "selected" : ""}>${t("diagnostics.day")}</option><option value="7d" ${selectedDiagnosticsPreset === "7d" ? "selected" : ""}>${t("diagnostics.days7")}</option><option value="30d" ${selectedDiagnosticsPreset === "30d" ? "selected" : ""}>${t("diagnostics.days30")}</option><option value="90d" ${selectedDiagnosticsPreset === "90d" ? "selected" : ""}>${t("diagnostics.days90")}</option><option value="all" ${selectedDiagnosticsPreset === "all" ? "selected" : ""}>${t("diagnostics.allTime")}</option></select></label><button class="button secondary diagnostics-refresh" type="button" ${diagnosticsBusy ? "disabled" : ""}>${diagnosticsBusy === "diagnostics" ? t("common.refreshing") : t("common.refresh")}</button></div></header>
      <section class="diagnostics-range-bar"><div class="diagnostics-range-copy"><small>${t("diagnostics.timeRange")}</small><strong>${diagnosticsRangeLabel(selectedDiagnosticsPreset)}</strong></div><div class="diagnostics-range-options" role="group" aria-label="${t("diagnostics.period")}">${(["1d","7d","30d","90d","all"] as DiagnosticPreset[]).map((preset) => `<button class="diagnostics-range-option ${selectedDiagnosticsPreset === preset ? "active" : ""}" type="button" data-diagnostics-preset="${preset}" ${diagnosticsBusy ? "disabled" : ""}>${preset === "1d" ? "24h" : preset === "all" ? t("projectBrain.all") : preset}</button>`).join("")}</div></section>
      ${diagnosticsClassGrid()}
      <div class="diagnostics-section-head diagnostics-section-head-compact"><div><span class="eyebrow">${t("diagnostics.observedEvidence")}</span><h2>${t("diagnostics.measuredUsage")}</h2><p>${t("diagnostics.rawValues")}</p></div></div>
      <section class="health-strip">
        <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>${t("diagnostics.totalTokens")}</small><strong>${measured(observed?.totalTokens ?? 0)}</strong></div></div>
        <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Input</small><strong>${measured(observed?.inputTokens ?? 0)}</strong></div></div>
        <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Output</small><strong>${measured(observed?.outputTokens ?? 0)}</strong></div></div>
        <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>${t("diagnostics.cachedInput")}</small><strong>${measured(observed?.cacheReadTokens ?? 0)}</strong></div></div>
        <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Reasoning</small><strong>${measured(observed?.reasoningTokens ?? 0)}</strong></div></div>
      </section>
      <section class="progress-panel diagnostics-observed-status"><div><span class="eyebrow">Observed · ${presetLabel(selectedDiagnosticsPreset)}</span><h2>${observed?.eventCount ?? 0} ${lang("measured events", "gemessene Ereignisse")}</h2><p>${esc(error ?? (diagnostics?.hasObservedData ? lang("Stored locally from Codex App Server runtime evidence.", "Lokal aus Runtime-Evidence des Codex App Servers gespeichert.") : lang("No measured usage exists for this period.", "Für diesen Zeitraum liegt keine gemessene Nutzung vor.")))}</p></div><span class="state-pill">${diagnostics?.hasObservedData ? t("diagnostics.measured") : t("common.unknown")}</span></section>
      <section class="provider-primary-card" data-diagnostics-attribution><div><span class="provider-card-kicker">${lang("Evidence attribution", "Evidence-Zuordnung")}</span><h3>${lang("Where the measured events came from", "Woher die gemessenen Ereignisse stammen")}</h3></div><section class="provider-detail-grid">${["Provider","Model",lang("Project","Projekt"),lang("Session","Sitzung"),lang("Task","Aufgabe")].map((label, index) => `<div class="provider-detail"><small>${label}</small><strong>${esc(attributionValues[index] ?? t("common.unavailable"))}</strong></div>`).join("")}</section></section>
      <section class="diagnostics-action-card" data-diagnostics-calculation><div><span class="eyebrow">${lang("Calculation path", "Berechnungsweg")}</span><h3>${lang("How these totals are calculated", "Wie diese Summen berechnet werden")}</h3><p>${esc(calculation)}</p></div></section>
      <section class="diagnostics-action-card diagnostics-measure-compact"><div><span class="eyebrow">${t("diagnostics.connectionDiagnostics")}</span><h3>${t("diagnostics.measureTurn")}</h3><p>${lang("Run one fixed harmless turn and record provider/runtime-owned token evidence. The test prompt is fixed in Core and cannot be supplied by the renderer.", "Einen fest definierten harmlosen Turn ausführen und provider-/runtime-eigene Token-Evidence erfassen. Der Test-Prompt ist fest im Core hinterlegt und kann nicht vom Renderer geliefert werden.")}</p></div><button class="button primary diagnostics-measure" type="button" ${diagnosticsBusy || !connected ? "disabled" : ""}>${diagnosticsBusy === "measure" ? t("diagnostics.measuring") : t("diagnostics.measure")}</button></section>
      ${diagnosticsDetails()}
      <footer class="truth-note"><span class="truth-icon">i</span><p><strong>${t("diagnostics.privacy")}</strong> ${t("diagnostics.noRawCapture")}</p></footer>
    </div>`;
}

const rerenderConnectionsSurface = (fallback: () => void) => {
  const surface = document.querySelector<HTMLElement>("[data-surface='connections']");
  if (!surface) { fallback(); return; }
  surface.outerHTML = renderConnectionsSettingsView();
  bindConnectionDiagnosticsEvents(fallback);
};

const sameConnectorStatus = (before: ConnectorStatus | null, after: ConnectorStatus | null) => JSON.stringify(before) === JSON.stringify(after);

const setRefreshVisualState = (checking: boolean) => {
  const button = document.querySelector<HTMLButtonElement>(".connector-refresh");
  if (!button) return;
  button.disabled = checking || connectorMutating();
  button.textContent = checking ? lang("Checking…", "Prüfe…") : t("common.refresh");
};

const diagnosticsSurface = () => document.querySelector<HTMLElement>("[data-surface='diagnostics']");

const setDiagnosticsVisualBusyState = () => {
  const surface = diagnosticsSurface();
  if (!surface) return;
  const busy = diagnosticsBusy !== null;
  const period = surface.querySelector<HTMLSelectElement>(".diagnostics-period");
  const refresh = surface.querySelector<HTMLButtonElement>(".diagnostics-refresh");
  const measure = surface.querySelector<HTMLButtonElement>(".diagnostics-measure");
  if (period) period.disabled = busy;
  if (refresh) { refresh.disabled = busy; refresh.textContent = diagnosticsBusy === "diagnostics" ? t("common.refreshing") : t("common.refresh"); }
  if (measure) { measure.disabled = busy || connector?.connected !== true; measure.textContent = diagnosticsBusy === "measure" ? t("diagnostics.measuring") : t("diagnostics.measure"); }
  surface.querySelectorAll<HTMLButtonElement>("[data-diagnostics-preset]").forEach((button) => { button.disabled = busy; });
};

const syncDiagnosticsSurface = (fallback: () => void) => {
  const surface = diagnosticsSurface();
  if (!surface) { fallback(); return; }

  const fresh = document.createElement("div");
  fresh.innerHTML = renderDiagnosticsView();
  const next = fresh.firstElementChild as HTMLElement | null;
  if (!next) { fallback(); return; }

  // Keep the diagnostics root node mounted. Only its children change, so titlebar/sidebar/content shell
  // identity cannot flicker or be rebound by a full application render.
  surface.dataset.diagnosticsPreset = selectedDiagnosticsPreset;
  surface.replaceChildren(...Array.from(next.childNodes));
  bindConnectionDiagnosticsEvents(fallback);
};

export function bindConnectionDiagnosticsEvents(rerender: () => void): void {
  document.querySelectorAll<HTMLButtonElement>("[data-provider]").forEach((button) => {
    button.addEventListener("click", async () => {
      const provider = button.dataset.provider;
      if (provider !== "codex" && provider !== "claude" && provider !== "gemini" && provider !== "custom") return;
      selectedProvider = provider;
      rerender();
      if (provider === "codex" && !connector) { await refreshConnector(); rerenderConnectionsSurface(rerender); }
    });
  });

  document.querySelectorAll<HTMLElement>("[data-close-provider]").forEach((element) => {
    element.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-provider-modal]") && !target.closest(".provider-modal-close")) return;
      selectedProvider = null;
      rerender();
    });
  });

  document.querySelector<HTMLButtonElement>(".connector-refresh")?.addEventListener("click", async () => {
    const previousConnector = connector ? { ...connector } : null;
    const previousError = error;
    checkingConnector = true;
    setRefreshVisualState(true);
    try { connector = await invoke<ConnectorStatus>("codex_connector_status"); error = null; }
    catch (cause) { error = String(cause); }
    finally {
      checkingConnector = false;
      const changed = !sameConnectorStatus(previousConnector, connector) || previousError !== error;
      if (changed) rerenderConnectionsSurface(rerender); else setRefreshVisualState(false);
    }
  });

  document.querySelector<HTMLButtonElement>(".connector-connect")?.addEventListener("click", async () => {
    connectorAction = "connect"; error = null; rerenderConnectionsSurface(rerender);
    try { connector = await invoke<ConnectorStatus>("codex_connector_connect", { manualPath: null }); }
    catch (cause) { error = String(cause); }
    finally { connectorAction = null; rerenderConnectionsSurface(rerender); }
  });

  document.querySelector<HTMLButtonElement>(".connector-disconnect")?.addEventListener("click", async () => {
    connectorAction = "disconnect"; error = null; rerenderConnectionsSurface(rerender);
    try { connector = await invoke<ConnectorStatus>("codex_connector_disconnect"); }
    catch (cause) { error = String(cause); }
    finally { connectorAction = null; rerenderConnectionsSurface(rerender); }
  });

  const changePreset = async (next: string) => {
    if (next !== "1d" && next !== "7d" && next !== "30d" && next !== "90d" && next !== "all") return;
    if (selectedDiagnosticsPreset === next && diagnostics?.preset === next) return;
    selectedDiagnosticsPreset = next;
    const refresh = refreshDiagnostics();
    setDiagnosticsVisualBusyState();
    await refresh;
    syncDiagnosticsSurface(rerender);
  };

  document.querySelector<HTMLSelectElement>(".diagnostics-period")?.addEventListener("change", (event) => {
    void changePreset((event.currentTarget as HTMLSelectElement).value);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-diagnostics-preset]").forEach((button) => {
    button.addEventListener("click", () => void changePreset(button.dataset.diagnosticsPreset ?? ""));
  });

  document.querySelector<HTMLButtonElement>(".diagnostics-refresh")?.addEventListener("click", async () => {
    const refresh = refreshDiagnostics();
    setDiagnosticsVisualBusyState();
    await refresh;
    syncDiagnosticsSurface(rerender);
  });

  document.querySelector<HTMLButtonElement>(".diagnostics-measure")?.addEventListener("click", async () => {
    diagnosticsBusy = "measure"; error = null; setDiagnosticsVisualBusyState();
    try {
      const result = await invoke<MeasureResult>("codex_diagnostics_measure", { preset: selectedDiagnosticsPreset });
      connector = result.connection;
      diagnostics = result.diagnostics;
    } catch (cause) { error = String(cause); }
    finally { diagnosticsBusy = null; syncDiagnosticsSurface(rerender); }
  });
}
