import "./connections-redesign.css";
import "./connections-polish.css";
import "./diagnostics-redesign.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage, t } from "./i18n/runtime.js";
import { onDesktopProjectActivated } from "./desktop-project-registry.js";
import {
  bindProjectConnectionsSettingsEvents,
  refreshProjectConnectionsSettings,
  renderProjectConnectionsSettings,
} from "./project-connections-settings.js";

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
  scope: {
    kind: "project";
    projectId: string;
    unattributedEventCount: number;
  };
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
type DiagnosticsExportSaveResult = { saved: boolean; fileName?: string | null };
type ProviderId = "codex" | "claude" | "gemini" | "custom";
type LocalProviderId = Exclude<ProviderId, "codex">;
type ConnectorAction = "connect" | "disconnect" | null;
type LocalProviderStatus = {
  provider: LocalProviderId;
  installationState: "available" | "not-found" | "unusable";
  authState: "authenticated" | "configured" | "unknown" | "unavailable";
  version: string | null;
  connected: boolean;
  detail: string;
  connectionMode: "auto" | "manual";
  configuredPath?: string | null;
  launchSource?: string | null;
};

let connector: ConnectorStatus | null = null;
let diagnostics: DiagnosticsSummary | null = null;
let checkingConnector = false;
let connectorAction: ConnectorAction = null;
let localProviderAction: { provider: LocalProviderId; action: ConnectorAction } | null = null;
let localProviders: Partial<Record<LocalProviderId, LocalProviderStatus>> = {};
let localProviderErrors: Partial<Record<LocalProviderId, string>> = {};
let diagnosticsBusy: "measure" | "diagnostics" | "export" | null = null;
let error: string | null = null;
let diagnosticsNotice: string | null = null;
let selectedProvider: ProviderId | null = null;
let selectedDiagnosticsPreset: DiagnosticPreset = "30d";
let diagnosticsProjectGeneration = 0;
let activeDiagnosticsRerender: (() => void) | null = null;

const notifyConnectionHealthChanged = () => {
  document.dispatchEvent(new Event("livariant:connections-changed"));
};

const esc = (value: string) => value.replace(/[&<>'\"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;",
})[character] ?? character);

const formatNumber = (value: number) => new Intl.NumberFormat(getLanguage() === "de" ? "de-DE" : "en-US").format(value);
const measured = (value: number) => diagnostics?.hasObservedData ? formatNumber(value) : "—";
const connectorMutating = () => connectorAction !== null;
const lang = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;

const connectionSurfaceError = (area: "connector" | "diagnostics" | "export" | "measure"): string => {
  if (area === "connector") return lang(
    "The Codex connection could not be refreshed. Check the local Codex installation and try again.",
    "Die Codex-Verbindung konnte nicht aktualisiert werden. Prüfe die lokale Codex-Installation und versuche es erneut.",
  );
  if (area === "export") return lang(
    "The diagnostics export could not be saved. Check the destination and try again.",
    "Der Diagnose-Export konnte nicht gespeichert werden. Prüfe das Ziel und versuche es erneut.",
  );
  if (area === "measure") return lang(
    "The diagnostics measurement could not be completed. Existing evidence was kept.",
    "Die Diagnosemessung konnte nicht abgeschlossen werden. Bestehende Evidence wurde beibehalten.",
  );
  return lang(
    "Diagnostics could not be refreshed. Existing evidence was kept; try again.",
    "Die Diagnose konnte nicht aktualisiert werden. Bestehende Evidence wurde beibehalten; versuche es erneut.",
  );
};

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

const localizedCodexDetail = (detail: string | null | undefined): string | null => {
  if (!detail) return null;
  if (detail === "Codex was found only through a Windows command shim whose native executable could not be resolved without invoking a shell.") {
    return lang(
      "Codex was found through a Windows command shim, but Livariant could not resolve its native executable safely.",
      "Codex wurde über einen Windows-Befehls-Shim gefunden, aber Livariant konnte die native Programmdatei nicht sicher auflösen.",
    );
  }
  if (detail === "The configured Codex executable is no longer a native executable that Livariant can validate without a shell.") {
    return lang(
      "The configured Codex executable is no longer available as a native executable.",
      "Die konfigurierte native Codex-Programmdatei ist nicht mehr verfügbar.",
    );
  }
  return detail;
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
  catch (_cause) { error = connectionSurfaceError("connector"); }
  finally { checkingConnector = false; }
}

async function refreshLocalProviders(): Promise<void> {
  const providers: LocalProviderId[] = ["claude", "gemini", "custom"];
  await Promise.all(providers.map(async (provider) => {
    try {
      localProviders[provider] = await invoke<LocalProviderStatus>("local_provider_status", { provider });
      delete localProviderErrors[provider];
    } catch (_cause) {
      localProviderErrors[provider] = lang(
        "The local provider could not be inspected. Check its local installation and try again.",
        "Der lokale Anbieter konnte nicht geprüft werden. Prüfe die lokale Installation und versuche es erneut.",
      );
    }
  }));
}

export async function refreshConnectionsSettings(): Promise<void> {
  await Promise.all([refreshConnector(), refreshLocalProviders(), refreshProjectConnectionsSettings()]);
}

export async function refreshDiagnostics(): Promise<void> {
  const generation = diagnosticsProjectGeneration;
  diagnosticsBusy = "diagnostics";
  error = null;
  diagnosticsNotice = null;
  try {
    const next = await invoke<DiagnosticsSummary>("codex_diagnostics_summary", { preset: selectedDiagnosticsPreset });
    if (generation !== diagnosticsProjectGeneration) return;
    diagnostics = next;
  }
  catch (cause) {
    if (generation !== diagnosticsProjectGeneration) return;
    error = connectionSurfaceError("diagnostics");
  }
  finally {
    if (generation === diagnosticsProjectGeneration) diagnosticsBusy = null;
  }
}

const renderProviderCard = (provider: ProviderId, name: string, description: string, status: string, tone: string) => `
  <button class="provider-card" type="button" data-provider="${provider}">
    <span class="provider-card-main">${providerGlyph(provider)}<span class="provider-copy"><strong>${name}</strong><small>${description}</small></span></span>
    <span class="provider-card-state"><span class="provider-status provider-status-${tone}"><i></i>${status}</span><span class="provider-chevron">›</span></span>
  </button>`;

const localProviderCopy = (provider: LocalProviderId) => ({
  claude: { name: "Claude", vendor: "Anthropic", description: lang("Claude Code · local CLI", "Claude Code · lokale CLI") },
  gemini: { name: "Gemini", vendor: "Google", description: lang("Gemini CLI · local CLI", "Gemini CLI · lokale CLI") },
  custom: { name: lang("Custom connection", "Eigene Verbindung"), vendor: lang("Advanced", "Erweitert"), description: lang("Local Livariant provider bridge", "Lokale Livariant-Provider-Bridge") },
})[provider];

const localProviderState = (provider: LocalProviderId) => {
  const status = localProviders[provider];
  if (localProviderAction?.provider === provider) return { label: lang("Working", "Wird verarbeitet"), tone: "checking" };
  if (status?.connected) return { label: t("connections.connected"), tone: "connected" };
  if (status?.installationState === "available" && status.authState !== "unavailable") return { label: t("common.ready"), tone: "ready" };
  if (status?.installationState === "unusable" || status?.authState === "unavailable") return { label: t("connections.needsAttention"), tone: "warning" };
  if (status?.installationState === "not-found") return { label: t("connections.setupNeeded"), tone: "warning" };
  return { label: t("connections.notChecked"), tone: "muted" };
};

const renderCodexModal = () => {
  const state = codexState();
  const detected = connector?.installationState === "available";
  const connected = connector?.connected === true;
  const mode = connector?.connectionMode ?? "auto";
  return `
    <div class="provider-modal-backdrop" data-close-provider>
      <section class="provider-modal provider-modal-codex" role="dialog" aria-modal="true" aria-labelledby="provider-codex-title" data-provider-modal>
        <button class="provider-modal-close" type="button" data-close-provider aria-label="${lang("Close Codex settings", "Codex-Einstellungen schließen")}">×</button>
        <header class="provider-modal-header provider-modal-hero">
          ${providerGlyph("codex")}
          <div><span class="eyebrow">OpenAI</span><h2 id="provider-codex-title">Codex</h2><p>${lang("Connect Livariant through the official local Codex App Server boundary.", "Verbinde Livariant über die offizielle lokale Codex-App-Server-Grenze.")}</p></div>
          <span class="provider-status provider-status-${state.tone}"><i></i>${state.label}</span>
        </header>
        ${error ? `<div class="provider-alert provider-alert-error"><div class="provider-alert-copy"><strong>${t("connections.needsAttention")}</strong><p>${esc(error)}</p></div></div>` : ""}
        <section class="provider-primary-card provider-primary-card-emphasis">
          <div><span class="provider-card-kicker">${lang("Connection", "Verbindung")}</span><h3>${connected ? lang("Codex is connected", "Codex ist verbunden") : detected ? lang("Ready for one-click connection", "Bereit für die Ein-Klick-Verbindung") : lang("Codex setup required", "Codex-Einrichtung erforderlich")}</h3><p>${esc(error ?? localizedCodexDetail(connector?.detail) ?? state.detail)}</p></div>
          <div class="provider-primary-actions">
            <button class="button secondary connector-refresh" type="button" ${checkingConnector || connectorMutating() ? "disabled" : ""}>${checkingConnector ? lang("Checking…", "Prüfe…") : t("common.refresh")}</button>
            ${connected
              ? `<button class="button secondary connector-disconnect" type="button" ${connectorMutating() ? "disabled" : ""}>${connectorAction === "disconnect" ? lang("Disconnecting…", "Trenne…") : t("connections.disconnect")}</button>`
              : `<button class="button primary connector-connect" type="button" ${connectorMutating() || !detected ? "disabled" : ""}>${connectorAction === "connect" ? lang("Connecting…", "Verbinde…") : t("connections.connectCodex")}</button>`}
          </div>
        </section>
        <section class="provider-detail-section">
          <div class="provider-section-heading"><span>${lang("Connection details", "Verbindungsdetails")}</span><small>${lang("Observed locally", "Lokal beobachtet")}</small></div>
          <div class="provider-detail-grid" aria-label="${lang("Codex connection details", "Codex-Verbindungsdetails")}">
            <div class="provider-detail"><small>${lang("Installation", "Installation")}</small><strong>${detected ? `Codex ${esc(connector?.version ?? "")}` : connector?.installationState === "unusable" ? lang("Unusable", "Nicht nutzbar") : lang("Not detected", "Nicht erkannt")}</strong></div>
            <div class="provider-detail"><small>App Server</small><strong>${connected ? t("connections.connected") : lang("Disconnected", "Getrennt")}</strong></div>
            <div class="provider-detail"><small>${lang("Connection method", "Verbindungsmethode")}</small><strong>${connected ? (mode === "manual" ? lang("Local fallback", "Lokaler Fallback") : lang("Automatic", "Automatisch")) : lang("Not active", "Nicht aktiv")}</strong></div>
            <div class="provider-detail"><small>${lang("Approvals", "Freigaben")}</small><strong>${connector?.pendingApprovals ?? 0} ${lang("pending", "ausstehend")}</strong></div>
          </div>
        </section>
        <footer class="provider-boundary provider-boundary-panel"><span>i</span><p><strong>${lang("Authority stays separate.", "Authority bleibt getrennt.")}</strong> ${lang("Connecting Codex does not authorize file changes, commands, merges or releases.", "Das Verbinden von Codex autorisiert keine Dateiänderungen, Befehle, Merges oder Releases.")}</p></footer>
      </section>
    </div>`;
};

const renderLocalProviderModal = (provider: LocalProviderId) => {
  const copy = localProviderCopy(provider);
  const status = localProviders[provider];
  const state = localProviderState(provider);
  const connected = status?.connected === true;
  const available = status?.installationState === "available" && status.authState !== "unavailable";
  const busy = localProviderAction?.provider === provider;
  const errorCopy = localProviderErrors[provider];
  return `
    <div class="provider-modal-backdrop" data-close-provider>
      <section class="provider-modal provider-modal-codex" role="dialog" aria-modal="true" data-provider-modal data-local-provider="${provider}">
        <button class="provider-modal-close" type="button" data-close-provider aria-label="${lang("Close provider details", "Anbieterdetails schließen")}">×</button>
        <header class="provider-modal-header provider-modal-hero">
          ${providerGlyph(provider)}
          <div><span class="eyebrow">${copy.vendor}</span><h2>${copy.name}</h2><p>${copy.description}</p></div>
          <span class="provider-status provider-status-${state.tone}"><i></i>${state.label}</span>
        </header>
        ${errorCopy ? `<div class="provider-alert provider-alert-error"><div class="provider-alert-copy"><strong>${t("connections.needsAttention")}</strong><p>${esc(errorCopy)}</p></div></div>` : ""}
        <section class="provider-primary-card provider-primary-card-emphasis">
          <div><span class="provider-card-kicker">${lang("Local connection", "Lokale Verbindung")}</span><h3>${connected ? lang("Provider is connected", "Anbieter ist verbunden") : available ? lang("Ready to connect", "Bereit zum Verbinden") : lang("Local setup required", "Lokale Einrichtung erforderlich")}</h3><p>${esc(status?.detail ?? lang("Inspect the local provider installation.", "Prüfe die lokale Provider-Installation."))}</p></div>
          <div class="provider-primary-actions">
            <button class="button secondary local-provider-refresh" type="button" ${busy ? "disabled" : ""}>${lang("Refresh", "Aktualisieren")}</button>
            ${connected
              ? `<button class="button secondary local-provider-disconnect" type="button" ${busy ? "disabled" : ""}>${localProviderAction?.action === "disconnect" ? lang("Disconnecting…", "Trenne…") : t("connections.disconnect")}</button>`
              : `<button class="button primary local-provider-connect" type="button" ${busy || (provider !== "custom" && !available) ? "disabled" : ""}>${localProviderAction?.action === "connect" ? lang("Connecting…", "Verbinde…") : lang("Connect", "Verbinden")}</button>`}
          </div>
        </section>
        ${provider === "custom" ? `<section class="provider-detail-section"><div class="provider-section-heading"><span>${lang("Executable", "Programmdatei")}</span><small>${lang("No shell scripts", "Keine Shell-Skripte")}</small></div><input class="provider-custom-path" type="text" value="${esc(status?.configuredPath ?? "")}" placeholder="${lang("Path to local provider executable", "Pfad zur lokalen Provider-Programmdatei")}" autocomplete="off" spellcheck="false"></section>` : ""}
        <section class="provider-detail-section">
          <div class="provider-section-heading"><span>${lang("Connection details", "Verbindungsdetails")}</span><small>${lang("Observed locally", "Lokal beobachtet")}</small></div>
          <div class="provider-detail-grid">
            <div class="provider-detail"><small>${lang("Installation", "Installation")}</small><strong>${status?.installationState ?? lang("Not checked", "Nicht geprüft")}</strong></div>
            <div class="provider-detail"><small>${lang("Authentication", "Authentifizierung")}</small><strong>${status?.authState ?? lang("Unknown", "Unbekannt")}</strong></div>
            <div class="provider-detail"><small>${lang("Version", "Version")}</small><strong>${esc(status?.version ?? "—")}</strong></div>
            <div class="provider-detail"><small>${lang("Connection method", "Verbindungsmethode")}</small><strong>${status?.connectionMode === "manual" ? lang("Explicit local executable", "Explizite lokale Programmdatei") : lang("Local CLI discovery", "Lokale CLI-Erkennung")}</strong></div>
          </div>
        </section>
        <footer class="provider-boundary provider-boundary-panel"><span>i</span><p><strong>${lang("Authority stays separate.", "Authority bleibt getrennt.")}</strong> ${lang("This connection stores only local connection intent. Livariant does not import provider API keys or grant file, command, merge or release authority.", "Diese Verbindung speichert nur die lokale Verbindungsabsicht. Livariant importiert keine Provider-API-Schlüssel und erteilt keine Datei-, Befehls-, Merge- oder Release-Authority.")}</p></footer>
      </section>
    </div>`;
};

const renderProviderModal = () => selectedProvider
  ? selectedProvider === "codex" ? renderCodexModal() : renderLocalProviderModal(selectedProvider)
  : "";

export function renderConnectionsSettingsView(): string {
  const state = codexState();
  const connectedCount = (connector?.connected ? 1 : 0) + (["claude", "gemini", "custom"] as LocalProviderId[]).filter((provider) => localProviders[provider]?.connected).length;
  const connectedLabel = connectedCount === 1
    ? lang("1 provider connected", "1 Anbieter verbunden")
    : lang(`${connectedCount} providers connected`, `${connectedCount} Anbieter verbunden`);
  return `
    <section class="settings-panel connections-settings" data-surface="connections">
      <div class="connections-heading">
        <div><span class="eyebrow">${t("connections.llmsAgents")}</span><h2>${t("connections.title")}</h2><p>${t("connections.description")}</p></div>
        <div class="connections-overview"><strong>${connectedCount}</strong><span>${lang("connected", "verbunden")}</span></div>
      </div>
      <div class="connection-summary-row"><span><i class="summary-dot ${connectedCount > 0 ? "connected" : ""}"></i><strong>${connectedCount > 0 ? connectedLabel : t("connections.noProviders")}</strong></span></div>
      <div class="provider-grid" aria-label="${lang("Available LLM and agent connections", "Verfügbare LLM- und Agent-Verbindungen")}">
        ${renderProviderCard("codex", "Codex", lang("OpenAI · local App Server", "OpenAI · lokaler App Server"), state.label, state.tone)}
        ${(["claude", "gemini", "custom"] as LocalProviderId[]).map((provider) => {
          const copy = localProviderCopy(provider);
          const providerState = localProviderState(provider);
          return renderProviderCard(provider, copy.name, copy.description, providerState.label, providerState.tone);
        }).join("")}
      </div>
      ${renderProjectConnectionsSettings()}
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
      <header class="topbar"><div><span class="eyebrow">${t("diagnostics.measuredEvidence")}</span><h1>${t("diagnostics.title")}</h1><p>${t("diagnostics.intro")}</p></div><div class="topbar-actions"><label hidden><span class="sr-only">${t("diagnostics.period")}</span><select class="diagnostics-period" ${diagnosticsBusy ? "disabled" : ""}><option value="1d" ${selectedDiagnosticsPreset === "1d" ? "selected" : ""}>${t("diagnostics.day")}</option><option value="7d" ${selectedDiagnosticsPreset === "7d" ? "selected" : ""}>${t("diagnostics.days7")}</option><option value="30d" ${selectedDiagnosticsPreset === "30d" ? "selected" : ""}>${t("diagnostics.days30")}</option><option value="90d" ${selectedDiagnosticsPreset === "90d" ? "selected" : ""}>${t("diagnostics.days90")}</option><option value="all" ${selectedDiagnosticsPreset === "all" ? "selected" : ""}>${t("diagnostics.allTime")}</option></select></label><button class="button secondary diagnostics-export" type="button" ${diagnosticsBusy ? "disabled" : ""}>${diagnosticsBusy === "export" ? lang("Saving…", "Speichere…") : lang("Export", "Exportieren")}</button><button class="button secondary diagnostics-refresh" type="button" ${diagnosticsBusy ? "disabled" : ""}>${diagnosticsBusy === "diagnostics" ? t("common.refreshing") : t("common.refresh")}</button></div></header>
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
      <section class="progress-panel diagnostics-observed-status"><div><span class="eyebrow">Observed · ${presetLabel(selectedDiagnosticsPreset)}</span><h2>${observed?.eventCount ?? 0} ${lang("measured events", "gemessene Ereignisse")}</h2><p>${esc(diagnosticsNotice ?? error ?? (diagnostics?.hasObservedData ? lang("Stored locally from Codex App Server runtime evidence.", "Lokal aus Runtime-Evidence des Codex App Servers gespeichert.") : lang("No measured usage exists for this period.", "Für diesen Zeitraum liegt keine gemessene Nutzung vor.")))}</p></div><span class="state-pill">${diagnostics?.hasObservedData ? t("diagnostics.measured") : t("common.unknown")}</span></section>
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
  const exportButton = surface.querySelector<HTMLButtonElement>(".diagnostics-export");
  const refresh = surface.querySelector<HTMLButtonElement>(".diagnostics-refresh");
  const measure = surface.querySelector<HTMLButtonElement>(".diagnostics-measure");
  if (period) period.disabled = busy;
  if (exportButton) { exportButton.disabled = busy; exportButton.textContent = diagnosticsBusy === "export" ? lang("Saving…", "Speichere…") : lang("Export", "Exportieren"); }
  if (refresh) { refresh.disabled = busy; refresh.textContent = diagnosticsBusy === "diagnostics" ? t("common.refreshing") : t("common.refresh"); }
  if (measure) { measure.disabled = busy || connector?.connected !== true; measure.textContent = diagnosticsBusy === "measure" ? t("diagnostics.measuring") : t("diagnostics.measure"); }
  surface.querySelectorAll<HTMLButtonElement>("[data-diagnostics-preset]").forEach((button) => { button.disabled = busy; });
};

const syncDiagnosticsSurface = (fallback: () => void) => {
  const surface = diagnosticsSurface();
  if (!surface) { fallback(); return; }

  // Once the redesigned diagnostics cockpit has claimed this root, legacy diagnostics
  // rendering must never replace its children. The cockpit owns all visible refresh,
  // range, export and measurement presentation from that point onward.
  if (surface.dataset.diagnosticsCockpit === "mounted") return;

  const fresh = document.createElement("div");
  fresh.innerHTML = renderDiagnosticsView();
  const next = fresh.firstElementChild as HTMLElement | null;
  if (!next) { fallback(); return; }

  surface.dataset.diagnosticsPreset = selectedDiagnosticsPreset;
  surface.replaceChildren(...Array.from(next.childNodes));
  bindConnectionDiagnosticsEvents(fallback);
};

export function bindConnectionDiagnosticsEvents(rerender: () => void): void {
  activeDiagnosticsRerender = rerender;
  bindProjectConnectionsSettingsEvents(rerender);
  document.querySelectorAll<HTMLButtonElement>("[data-provider]").forEach((button) => {
    button.addEventListener("click", async () => {
      const provider = button.dataset.provider;
      if (provider !== "codex" && provider !== "claude" && provider !== "gemini" && provider !== "custom") return;
      selectedProvider = provider;
      rerender();
      if (provider === "codex" && !connector) {
        await refreshConnector();
        rerenderConnectionsSurface(rerender);
      } else if (provider !== "codex" && !localProviders[provider]) {
        try {
          localProviders[provider] = await invoke<LocalProviderStatus>("local_provider_status", { provider });
          delete localProviderErrors[provider];
        } catch (_cause) {
          localProviderErrors[provider] = lang(
            "The local provider could not be inspected. Check its local installation and try again.",
            "Der lokale Anbieter konnte nicht geprüft werden. Prüfe die lokale Installation und versuche es erneut.",
          );
        }
        rerenderConnectionsSurface(rerender);
      }
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
    try { connector = await invoke<ConnectorStatus>("codex_connector_status"); error = null; notifyConnectionHealthChanged(); }
    catch (_cause) { error = connectionSurfaceError("connector"); }
    finally {
      checkingConnector = false;
      const changed = !sameConnectorStatus(previousConnector, connector) || previousError !== error;
      if (changed) rerenderConnectionsSurface(rerender); else setRefreshVisualState(false);
    }
  });

  document.querySelector<HTMLButtonElement>(".connector-connect")?.addEventListener("click", async () => {
    connectorAction = "connect"; error = null; rerenderConnectionsSurface(rerender);
    try { connector = await invoke<ConnectorStatus>("codex_connector_connect", { manualPath: null }); notifyConnectionHealthChanged(); }
    catch (_cause) { error = connectionSurfaceError("connector"); }
    finally { connectorAction = null; rerenderConnectionsSurface(rerender); }
  });

  document.querySelector<HTMLButtonElement>(".connector-disconnect")?.addEventListener("click", async () => {
    connectorAction = "disconnect"; error = null; rerenderConnectionsSurface(rerender);
    try { connector = await invoke<ConnectorStatus>("codex_connector_disconnect"); notifyConnectionHealthChanged(); }
    catch (_cause) { error = connectionSurfaceError("connector"); }
    finally { connectorAction = null; rerenderConnectionsSurface(rerender); }
  });

  const activeLocalProvider = (): LocalProviderId | null =>
    selectedProvider === "claude" || selectedProvider === "gemini" || selectedProvider === "custom"
      ? selectedProvider
      : null;

  document.querySelector<HTMLButtonElement>(".local-provider-refresh")?.addEventListener("click", async () => {
    const provider = activeLocalProvider();
    if (!provider) return;
    localProviderAction = { provider, action: null };
    delete localProviderErrors[provider];
    rerenderConnectionsSurface(rerender);
    try { localProviders[provider] = await invoke<LocalProviderStatus>("local_provider_status", { provider }); notifyConnectionHealthChanged(); }
    catch (_cause) {
      localProviderErrors[provider] = lang(
        "The local provider could not be inspected. Check its local installation and try again.",
        "Der lokale Anbieter konnte nicht geprüft werden. Prüfe die lokale Installation und versuche es erneut.",
      );
    }
    finally { localProviderAction = null; rerenderConnectionsSurface(rerender); }
  });

  document.querySelector<HTMLButtonElement>(".local-provider-connect")?.addEventListener("click", async () => {
    const provider = activeLocalProvider();
    if (!provider) return;
    const manualPath = provider === "custom"
      ? document.querySelector<HTMLInputElement>(".provider-custom-path")?.value.trim() || null
      : null;
    localProviderAction = { provider, action: "connect" };
    delete localProviderErrors[provider];
    rerenderConnectionsSurface(rerender);
    try { localProviders[provider] = await invoke<LocalProviderStatus>("local_provider_connect", { provider, manualPath }); notifyConnectionHealthChanged(); }
    catch (_cause) {
      localProviderErrors[provider] = provider === "custom"
        ? lang("Custom provider connection failed. Verify the executable path and Livariant probe contract.", "Die eigene Provider-Verbindung ist fehlgeschlagen. Prüfe Programmdatei und Livariant-Probevertrag.")
        : lang("Provider connection failed. Verify the local CLI installation and provider authentication.", "Die Provider-Verbindung ist fehlgeschlagen. Prüfe lokale CLI-Installation und Provider-Authentifizierung.");
    }
    finally { localProviderAction = null; rerenderConnectionsSurface(rerender); }
  });

  document.querySelector<HTMLButtonElement>(".local-provider-disconnect")?.addEventListener("click", async () => {
    const provider = activeLocalProvider();
    if (!provider) return;
    localProviderAction = { provider, action: "disconnect" };
    delete localProviderErrors[provider];
    rerenderConnectionsSurface(rerender);
    try { localProviders[provider] = await invoke<LocalProviderStatus>("local_provider_disconnect", { provider }); notifyConnectionHealthChanged(); }
    catch (_cause) {
      localProviderErrors[provider] = lang("Provider disconnect failed. Try again.", "Das Trennen des Providers ist fehlgeschlagen. Versuche es erneut.");
    }
    finally { localProviderAction = null; rerenderConnectionsSurface(rerender); }
  });

  const changePreset = async (next: string) => {
    if (next !== "1d" && next !== "7d" && next !== "30d" && next !== "90d" && next !== "all") return;
    if (selectedDiagnosticsPreset === next && diagnostics?.preset === next) return;
    selectedDiagnosticsPreset = next;
    diagnosticsNotice = null;
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

  document.querySelector<HTMLButtonElement>(".diagnostics-export")?.addEventListener("click", async () => {
    const generation = diagnosticsProjectGeneration;
    diagnosticsBusy = "export"; error = null; diagnosticsNotice = null; setDiagnosticsVisualBusyState();
    try {
      const result = await invoke<DiagnosticsExportSaveResult>("save_codex_diagnostics_export", { preset: selectedDiagnosticsPreset });
      if (generation !== diagnosticsProjectGeneration) return;
      if (result.saved) {
        const fileName = result.fileName ?? lang("JSON file", "JSON-Datei");
        diagnosticsNotice = lang(`Export saved as ${fileName}.`, `Export als ${fileName} gespeichert.`);
      }
    } catch (cause) {
      if (generation !== diagnosticsProjectGeneration) return;
      error = connectionSurfaceError("export");
    }
    finally {
      if (generation !== diagnosticsProjectGeneration) return;
      diagnosticsBusy = null;
      syncDiagnosticsSurface(rerender);
    }
  });

  document.querySelector<HTMLButtonElement>(".diagnostics-refresh")?.addEventListener("click", async () => {
    diagnosticsNotice = null;
    const refresh = refreshDiagnostics();
    setDiagnosticsVisualBusyState();
    await refresh;
    syncDiagnosticsSurface(rerender);
  });

  document.querySelector<HTMLButtonElement>(".diagnostics-measure")?.addEventListener("click", async () => {
    const generation = diagnosticsProjectGeneration;
    diagnosticsBusy = "measure"; error = null; diagnosticsNotice = null; setDiagnosticsVisualBusyState();
    try {
      const result = await invoke<MeasureResult>("codex_diagnostics_measure", { preset: selectedDiagnosticsPreset });
      if (generation !== diagnosticsProjectGeneration) return;
      connector = result.connection;
      diagnostics = result.diagnostics;
    } catch (cause) {
      if (generation !== diagnosticsProjectGeneration) return;
      error = connectionSurfaceError("measure");
    }
    finally {
      if (generation !== diagnosticsProjectGeneration) return;
      diagnosticsBusy = null;
      syncDiagnosticsSurface(rerender);
    }
  });
}

onDesktopProjectActivated(() => {
  diagnosticsProjectGeneration += 1;
  diagnostics = null;
  diagnosticsBusy = null;
  diagnosticsNotice = null;
  connector = null;
  localProviders = {};
  localProviderErrors = {};
  error = null;
  notifyConnectionHealthChanged();

  const rerender = activeDiagnosticsRerender;
  void Promise.all([refreshConnector(), refreshLocalProviders()])
    .then(() => {
      notifyConnectionHealthChanged();
      if (rerender) rerenderConnectionsSurface(rerender);
    })
    .catch(() => {
      notifyConnectionHealthChanged();
      if (rerender) rerenderConnectionsSurface(rerender);
    });

  if (rerender) void refreshDiagnostics().then(() => syncDiagnosticsSurface(rerender));
});
