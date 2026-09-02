import "./connections-redesign.css";
import "./connections-polish.css";
import { invoke } from "@tauri-apps/api/core";

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

const esc = (value: string) => value.replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;" })[character] ?? character);
const formatNumber = (value: number) => new Intl.NumberFormat().format(value);
const measured = (value: number) => diagnostics?.hasObservedData ? formatNumber(value) : "—";
const connectorMutating = () => connectorAction !== null;
const presetLabel = (preset: DiagnosticPreset) => ({ "1d": "1 day", "7d": "7 days", "30d": "30 days", "90d": "90 days", all: "All time" })[preset];

const formatAttributionDimension = (dimension: ObservedAttributionDimension | undefined): string => {
  if (!dimension || dimension.groups.length === 0) return "Unavailable";
  const visible = dimension.groups.slice(0, 3).map((group) => `${esc(group.value)} · ${formatNumber(group.eventCount)} event${group.eventCount === 1 ? "" : "s"}`);
  const remainder = dimension.groups.length - visible.length;
  return `${visible.join(" · ")}${remainder > 0 ? ` · +${formatNumber(remainder)} more` : ""}`;
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
  if (checkingConnector) return { label: "Checking", tone: "checking", detail: "Inspecting the local Codex installation…" };
  if (connector?.connected) return { label: "Connected", tone: "connected", detail: `Codex ${connector.version ?? ""} · App Server connected` };
  if (connector?.installationState === "available") return { label: "Ready", tone: "ready", detail: `Codex ${connector.version ?? ""} detected locally` };
  if (connector?.installationState === "unusable") return { label: "Needs attention", tone: "warning", detail: "Codex was found but cannot be used yet" };
  if (connector?.installationState === "not-found") return { label: "Setup needed", tone: "warning", detail: "Codex CLI was not found on this machine" };
  return { label: "Not checked", tone: "muted", detail: "Open Codex to check the local connection" };
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
    <span class="provider-card-main">
      ${providerGlyph(provider)}
      <span class="provider-copy"><strong>${name}</strong><small>${description}</small></span>
    </span>
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
        <button class="provider-modal-close" type="button" data-close-provider aria-label="Close Codex settings">×</button>
        <header class="provider-modal-header">
          ${providerGlyph("codex")}
          <div><span class="eyebrow">OpenAI</span><h2 id="provider-codex-title">Codex</h2><p>Connect Livariant through the official local Codex App Server boundary.</p></div>
          <span class="provider-status provider-status-${state.tone}"><i></i>${state.label}</span>
        </header>

        ${error ? `<div class="provider-alert provider-alert-error"><div class="provider-alert-copy"><strong>Connection needs attention</strong><p>${esc(error)}</p></div></div>` : ""}

        <section class="provider-primary-card">
          <div><span class="provider-card-kicker">Connection</span><h3>${connected ? "Codex is connected" : detected ? "Ready for one-click connection" : "Codex setup required"}</h3><p>${esc(error ?? connector?.detail ?? state.detail)}</p></div>
          <div class="provider-primary-actions">
            <button class="button secondary connector-refresh" type="button" ${checkingConnector || connectorMutating() ? "disabled" : ""}>${checkingConnector ? "Checking…" : "Refresh"}</button>
            ${connected
              ? `<button class="button secondary connector-disconnect" type="button" ${connectorMutating() ? "disabled" : ""}>${connectorAction === "disconnect" ? "Disconnecting…" : "Disconnect"}</button>`
              : `<button class="button primary connector-connect" type="button" ${connectorMutating() || !detected ? "disabled" : ""}>${connectorAction === "connect" ? "Connecting…" : "Connect Codex"}</button>`}
          </div>
        </section>

        ${!detected && !connected ? `
          <section class="provider-setup-card">
            <span class="provider-setup-icon">i</span>
            <div><strong>Codex CLI is required</strong><p>Livariant could not find a usable local Codex installation. Install the official Codex CLI, then choose Refresh. A future guided setup may perform installation steps for you only after a clear permission request that shows exactly what will be changed.</p></div>
          </section>` : ""}

        <section class="provider-detail-grid" aria-label="Codex connection details">
          <div class="provider-detail"><small>Installation</small><strong>${detected ? `Codex ${esc(connector?.version ?? "")}` : connector?.installationState === "unusable" ? "Unusable" : "Not detected"}</strong></div>
          <div class="provider-detail"><small>App Server</small><strong>${connected ? "Connected" : "Disconnected"}</strong></div>
          <div class="provider-detail"><small>Connection method</small><strong>${connected ? (mode === "manual" ? "Local fallback" : "Automatic") : "Not active"}</strong></div>
          <div class="provider-detail"><small>Approvals</small><strong>${connector?.pendingApprovals ?? 0} pending</strong></div>
        </section>

        <footer class="provider-boundary"><span>i</span><p><strong>Authority stays separate.</strong> Connecting Codex does not authorize file changes, commands, merges or releases.</p></footer>
      </section>
    </div>`;
};

const renderPlannedProviderModal = (provider: Exclude<ProviderId, "codex">) => {
  const copy = {
    claude: { name: "Claude", vendor: "Anthropic", text: "Claude connection support is part of the provider expansion, but it is not enabled in this preview yet." },
    gemini: { name: "Gemini", vendor: "Google", text: "Gemini connection support is planned, but Livariant does not currently claim a working Gemini connection boundary." },
    custom: { name: "Custom connection", vendor: "Advanced", text: "Custom provider connections are planned for advanced setups. The capability and authority boundary must be defined before this option becomes active." },
  }[provider];
  return `
    <div class="provider-modal-backdrop" data-close-provider>
      <section class="provider-modal provider-modal-compact" role="dialog" aria-modal="true" aria-labelledby="provider-${provider}-title" data-provider-modal>
        <button class="provider-modal-close" type="button" data-close-provider aria-label="Close provider details">×</button>
        <header class="provider-modal-header">
          ${providerGlyph(provider)}
          <div><span class="eyebrow">${copy.vendor}</span><h2 id="provider-${provider}-title">${copy.name}</h2><p>${copy.text}</p></div>
          <span class="provider-status provider-status-muted"><i></i>Planned</span>
        </header>
        <section class="provider-setup-card"><span class="provider-setup-icon">i</span><div><strong>Not available in this preview</strong><p>This entry is visible now so the Connections layout already scales to multiple providers without pretending unsupported functionality exists.</p></div></section>
      </section>
    </div>`;
};

const renderProviderModal = () => {
  if (!selectedProvider) return "";
  if (selectedProvider === "codex") return renderCodexModal();
  return renderPlannedProviderModal(selectedProvider);
};

export function renderConnectionsSettingsView(): string {
  const state = codexState();
  const connectedCount = connector?.connected ? 1 : 0;
  return `
    <section class="settings-panel connections-settings">
      <div class="connections-heading">
        <div><span class="eyebrow">LLMs & agents</span><h2>Connections</h2><p>Connect the tools you work with. Livariant keeps connection state separate from project Authority.</p></div>
        <div class="connections-overview"><strong>${connectedCount}</strong><span>connected</span></div>
      </div>
      <div class="connection-summary-row">
        <span><i class="summary-dot ${connector?.connected ? "connected" : ""}"></i><strong>${connector?.connected ? "1 provider connected" : "No providers connected"}</strong></span>
        <small>Provider setup stays here in Settings so the main workspace remains focused.</small>
      </div>
      <div class="provider-grid" aria-label="Available LLM and agent connections">
        ${renderProviderCard("codex", "Codex", "OpenAI · local App Server", state.label, state.tone)}
        ${renderProviderCard("claude", "Claude", "Anthropic · provider support", "Planned", "muted", false)}
        ${renderProviderCard("gemini", "Gemini", "Google · provider support", "Planned", "muted", false)}
        ${renderProviderCard("custom", "Custom connection", "Advanced provider setup", "Planned", "muted", false)}
      </div>
      ${renderProviderModal()}
    </section>`;
}

export function renderConnectionsView(): string {
  return `
    <header class="topbar"><div><span class="eyebrow">Settings</span><h1>Connections</h1><p>Connections now live in Settings. This compatibility view uses the same provider overview.</p></div></header>
    ${renderConnectionsSettingsView()}`;
}

export function renderDiagnosticsView(): string {
  const observed = diagnostics?.observed;
  const attribution = diagnostics?.attribution;
  const connected = connector?.connected === true;
  const providerUnknownTotals = unknownTotalEvents(attribution?.provider);
  return `
    <header class="topbar"><div><span class="eyebrow">Measured evidence</span><h1>Diagnostics</h1><p>These counters contain only provider/runtime-owned observations. Unknown is never replaced by synthetic zero.</p></div><div class="topbar-actions"><label><span class="sr-only">Diagnostics period</span><select class="diagnostics-period" ${diagnosticsBusy ? "disabled" : ""}><option value="1d" ${selectedDiagnosticsPreset === "1d" ? "selected" : ""}>1 day</option><option value="7d" ${selectedDiagnosticsPreset === "7d" ? "selected" : ""}>7 days</option><option value="30d" ${selectedDiagnosticsPreset === "30d" ? "selected" : ""}>30 days</option><option value="90d" ${selectedDiagnosticsPreset === "90d" ? "selected" : ""}>90 days</option><option value="all" ${selectedDiagnosticsPreset === "all" ? "selected" : ""}>All time</option></select></label><button class="button secondary diagnostics-refresh" type="button" ${diagnosticsBusy ? "disabled" : ""}>${diagnosticsBusy === "diagnostics" ? "Refreshing…" : "Refresh"}</button></div></header>
    <section class="health-strip">
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Total tokens</small><strong>${measured(observed?.totalTokens ?? 0)}</strong></div></div>
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Input</small><strong>${measured(observed?.inputTokens ?? 0)}</strong></div></div>
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Output</small><strong>${measured(observed?.outputTokens ?? 0)}</strong></div></div>
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Cached input</small><strong>${measured(observed?.cacheReadTokens ?? 0)}</strong></div></div>
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Reasoning</small><strong>${measured(observed?.reasoningTokens ?? 0)}</strong></div></div>
    </section>
    <section class="progress-panel"><div><span class="eyebrow">Observed · ${presetLabel(selectedDiagnosticsPreset)}</span><h2>${observed?.eventCount ?? 0} measured events</h2><p>${esc(error ?? (diagnostics?.hasObservedData ? "Stored locally from Codex App Server runtime evidence." : `No measured usage exists for ${presetLabel(selectedDiagnosticsPreset).toLowerCase()}. Connect Codex and run the measurement test to create the first observation.`))}</p></div><span class="state-pill">${diagnostics?.hasObservedData ? "Measured" : "Unknown"}</span></section>
    <section class="provider-primary-card" aria-label="Observed diagnostics attribution">
      <div><span class="provider-card-kicker">Evidence attribution</span><h3>Where the measured events came from</h3><p>Livariant groups only attribution retained on Observed events in the selected period. Missing dimensions stay unavailable.</p></div>
      <section class="provider-detail-grid">
        <div class="provider-detail"><small>Provider</small><strong>${formatAttributionDimension(attribution?.provider)}</strong></div>
        <div class="provider-detail"><small>Model</small><strong>${formatAttributionDimension(attribution?.model)}</strong></div>
        <div class="provider-detail"><small>Project</small><strong>${formatAttributionDimension(attribution?.projectId)}</strong></div>
        <div class="provider-detail"><small>Session</small><strong>${formatAttributionDimension(attribution?.sessionId)}</strong></div>
        <div class="provider-detail"><small>Task</small><strong>${formatAttributionDimension(attribution?.taskId)}</strong></div>
      </section>
    </section>
    <section class="diagnostics-action-card"><div><span class="eyebrow">Calculation path</span><h3>How these totals are calculated</h3><p>Token counters come only from provider/runtime-owned Observed evidence inside ${presetLabel(selectedDiagnosticsPreset).toLowerCase()}. Attribution groups reuse those retained events; grouped total-token sums include only events that explicitly contain <code>totalTokens</code>.${providerUnknownTotals > 0 ? ` ${formatNumber(providerUnknownTotals)} provider-attributed event${providerUnknownTotals === 1 ? " has" : "s have"} no explicit total-token value and remain unknown.` : ""}</p></div></section>
    <section class="diagnostics-action-card"><div><span class="eyebrow">Connection diagnostics</span><h3>Measure a real Codex turn</h3><p>Run one fixed harmless turn and record provider/runtime-owned token evidence. The test prompt is fixed in Core and cannot be supplied by the renderer.</p></div><button class="button primary diagnostics-measure" type="button" ${diagnosticsBusy || !connected ? "disabled" : ""}>${diagnosticsBusy === "measure" ? "Measuring…" : "Run measurement test"}</button></section>
    <footer class="truth-note"><span class="truth-icon">i</span><p><strong>Measurement boundary:</strong> Observed ≠ Avoided ≠ Estimated. This page shows Observed usage and retained attribution only for the selected period; it does not claim counterfactual savings.</p></footer>`;
}

const rerenderConnectionsSurface = (fallback: () => void) => {
  const surface = document.querySelector<HTMLElement>(".connections-settings");
  if (!surface) {
    fallback();
    return;
  }
  surface.outerHTML = renderConnectionsSettingsView();
  bindConnectionDiagnosticsEvents(fallback);
};

const sameConnectorStatus = (before: ConnectorStatus | null, after: ConnectorStatus | null) => JSON.stringify(before) === JSON.stringify(after);

const setRefreshVisualState = (checking: boolean) => {
  const button = document.querySelector<HTMLButtonElement>(".connector-refresh");
  if (!button) return;
  button.disabled = checking || connectorMutating();
  button.textContent = checking ? "Checking…" : "Refresh";
};

export function bindConnectionDiagnosticsEvents(rerender: () => void): void {
  document.querySelectorAll<HTMLButtonElement>("[data-provider]").forEach((button) => {
    button.addEventListener("click", async () => {
      const provider = button.dataset.provider;
      if (provider !== "codex" && provider !== "claude" && provider !== "gemini" && provider !== "custom") return;
      selectedProvider = provider;
      rerender();
      if (provider === "codex" && !connector) {
        await refreshConnector();
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
    try {
      connector = await invoke<ConnectorStatus>("codex_connector_status");
      error = null;
    } catch (cause) {
      error = String(cause);
    } finally {
      checkingConnector = false;
      const changed = !sameConnectorStatus(previousConnector, connector) || previousError !== error;
      if (changed) rerenderConnectionsSurface(rerender);
      else setRefreshVisualState(false);
    }
  });

  document.querySelector<HTMLButtonElement>(".connector-connect")?.addEventListener("click", async () => {
    connectorAction = "connect";
    error = null;
    rerenderConnectionsSurface(rerender);
    try { connector = await invoke<ConnectorStatus>("codex_connector_connect", { manualPath: null }); }
    catch (cause) { error = String(cause); }
    finally {
      connectorAction = null;
      rerenderConnectionsSurface(rerender);
    }
  });

  document.querySelector<HTMLButtonElement>(".connector-disconnect")?.addEventListener("click", async () => {
    connectorAction = "disconnect";
    error = null;
    rerenderConnectionsSurface(rerender);
    try { connector = await invoke<ConnectorStatus>("codex_connector_disconnect"); }
    catch (cause) { error = String(cause); }
    finally {
      connectorAction = null;
      rerenderConnectionsSurface(rerender);
    }
  });

  document.querySelector<HTMLSelectElement>(".diagnostics-period")?.addEventListener("change", async (event) => {
    const next = (event.currentTarget as HTMLSelectElement).value;
    if (next !== "1d" && next !== "7d" && next !== "30d" && next !== "90d" && next !== "all") return;
    selectedDiagnosticsPreset = next;
    await refreshDiagnostics();
    rerender();
  });

  document.querySelector<HTMLButtonElement>(".diagnostics-refresh")?.addEventListener("click", async () => { await refreshDiagnostics(); rerender(); });
  document.querySelector<HTMLButtonElement>(".diagnostics-measure")?.addEventListener("click", async () => {
    diagnosticsBusy = "measure";
    error = null;
    rerender();
    try {
      const result = await invoke<MeasureResult>("codex_diagnostics_measure", { preset: selectedDiagnosticsPreset });
      connector = result.connection;
      diagnostics = result.diagnostics;
    } catch (cause) { error = String(cause); }
    finally {
      diagnosticsBusy = null;
      rerender();
    }
  });
}
