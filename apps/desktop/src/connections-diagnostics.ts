import { invoke } from "@tauri-apps/api/core";

export type ConnectorDesktopView = "connections" | "diagnostics";

type ConnectorStatus = {
  installationState: "available" | "not-found" | "unusable";
  version: string | null;
  connected: boolean;
  connectionState: string;
  pendingApprovals: number;
  detail: string;
};

type DiagnosticsSummary = {
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
};

type MeasureResult = { connection: ConnectorStatus; diagnostics: DiagnosticsSummary };

let connector: ConnectorStatus | null = null;
let diagnostics: DiagnosticsSummary | null = null;
let busy: "inspect" | "connect" | "disconnect" | "measure" | "diagnostics" | null = null;
let error: string | null = null;

const esc = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
const formatNumber = (value: number) => new Intl.NumberFormat().format(value);
const measured = (value: number) => diagnostics?.hasObservedData ? formatNumber(value) : "—";

export async function refreshConnector(): Promise<void> {
  busy = "inspect";
  error = null;
  try { connector = await invoke<ConnectorStatus>("codex_connector_status"); }
  catch (cause) { error = String(cause); }
  finally { busy = null; }
}

export async function refreshDiagnostics(): Promise<void> {
  busy = "diagnostics";
  error = null;
  try { diagnostics = await invoke<DiagnosticsSummary>("codex_diagnostics_summary"); }
  catch (cause) { error = String(cause); }
  finally { busy = null; }
}

export function renderConnectionsView(): string {
  const detected = connector?.installationState === "available";
  const connected = connector?.connected === true;
  return `
    <header class="topbar"><div><span class="eyebrow">LLMs & Agents</span><h1>Connections</h1><p>Connect coding agents without turning connection state into project Authority.</p></div></header>
    <section class="progress-panel">
      <div><span class="eyebrow">Codex App Server</span><h2>${connected ? "Connected" : detected ? "Ready to connect" : "Not connected"}</h2><p>${esc(error ?? connector?.detail ?? "Check whether Codex is installed on this machine.")}</p></div>
      <div class="step-actions">
        <button class="button secondary connector-refresh" type="button" ${busy ? "disabled" : ""}>Check</button>
        ${connected
          ? `<button class="button secondary connector-disconnect" type="button" ${busy ? "disabled" : ""}>Disconnect</button>`
          : `<button class="button primary connector-connect" type="button" ${busy || !detected ? "disabled" : ""}>Connect</button>`}
      </div>
    </section>
    <section class="health-strip">
      <div class="health-card ${detected ? "" : "muted"}"><span class="health-icon">${detected ? "●" : "○"}</span><div><small>Installation</small><strong>${detected ? `Codex ${esc(connector?.version ?? "")}` : connector?.installationState ?? "Unknown"}</strong></div></div>
      <div class="health-card ${connected ? "" : "muted"}"><span class="health-icon">${connected ? "●" : "○"}</span><div><small>App Server</small><strong>${connected ? "Handshake verified" : "Disconnected"}</strong></div></div>
      <div class="health-card ${connector?.pendingApprovals ? "" : "muted"}"><span class="health-icon">○</span><div><small>Approvals</small><strong>${connector?.pendingApprovals ?? 0} pending</strong></div></div>
    </section>
    <section class="steps">
      <article class="step-card state-open"><div class="step-head"><div class="step-number">01</div><div class="step-copy"><div class="step-title-row"><h3>Connection boundary</h3><span class="state-pill">${connected ? "Verified" : "Inactive"}</span></div><p>Livariant starts Codex through the official App Server boundary. The renderer receives no arbitrary shell or executable capability.</p></div></div></article>
      <article class="step-card state-open"><div class="step-head"><div class="step-number">02</div><div class="step-copy"><div class="step-title-row"><h3>Measure a real turn</h3><span class="state-pill">Observed only</span></div><p>Runs one fixed harmless Codex turn and records provider/runtime-owned token usage. The test prompt is fixed in Core and cannot be supplied by the renderer.</p><div class="step-actions"><button class="button primary diagnostics-measure" type="button" ${busy || !connected ? "disabled" : ""}>${busy === "measure" ? "Measuring…" : "Run measurement test"}</button></div></div></div></article>
    </section>
    <footer class="truth-note"><span class="truth-icon">i</span><p><strong>Authority boundary:</strong> Connect does not authorize file changes, commands, merges or releases. Codex approval requests remain pending/fail-closed in this milestone.</p></footer>`;
}

export function renderDiagnosticsView(): string {
  const observed = diagnostics?.observed;
  return `
    <header class="topbar"><div><span class="eyebrow">Measured evidence</span><h1>Diagnostics</h1><p>These counters contain only provider/runtime-owned observations. Unknown is never replaced by synthetic zero.</p></div><button class="button secondary diagnostics-refresh" type="button" ${busy ? "disabled" : ""}>Refresh</button></header>
    <section class="health-strip">
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Total tokens</small><strong>${measured(observed?.totalTokens ?? 0)}</strong></div></div>
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Input</small><strong>${measured(observed?.inputTokens ?? 0)}</strong></div></div>
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Output</small><strong>${measured(observed?.outputTokens ?? 0)}</strong></div></div>
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Cached input</small><strong>${measured(observed?.cacheReadTokens ?? 0)}</strong></div></div>
      <div class="health-card ${diagnostics?.hasObservedData ? "" : "muted"}"><span class="health-icon">●</span><div><small>Reasoning</small><strong>${measured(observed?.reasoningTokens ?? 0)}</strong></div></div>
    </section>
    <section class="progress-panel"><div><span class="eyebrow">Observed</span><h2>${observed?.eventCount ?? 0} measured events</h2><p>${esc(error ?? (diagnostics?.hasObservedData ? "Stored locally from Codex App Server runtime evidence." : "No measured usage exists yet. Connect Codex and run the measurement test to create the first observation."))}</p></div><span class="state-pill">${diagnostics?.hasObservedData ? "Measured" : "Unknown"}</span></section>
    <footer class="truth-note"><span class="truth-icon">i</span><p><strong>Measurement boundary:</strong> Observed ≠ Avoided ≠ Estimated. This page currently shows Observed Codex usage only; it does not claim counterfactual savings.</p></footer>`;
}

export function bindConnectionDiagnosticsEvents(rerender: () => void): void {
  document.querySelector<HTMLButtonElement>(".connector-refresh")?.addEventListener("click", async () => { await refreshConnector(); rerender(); });
  document.querySelector<HTMLButtonElement>(".connector-connect")?.addEventListener("click", async () => {
    busy = "connect"; error = null; rerender();
    try { connector = await invoke<ConnectorStatus>("codex_connector_connect"); }
    catch (cause) { error = String(cause); }
    finally { busy = null; rerender(); }
  });
  document.querySelector<HTMLButtonElement>(".connector-disconnect")?.addEventListener("click", async () => {
    busy = "disconnect"; error = null; rerender();
    try { connector = await invoke<ConnectorStatus>("codex_connector_disconnect"); }
    catch (cause) { error = String(cause); }
    finally { busy = null; rerender(); }
  });
  document.querySelector<HTMLButtonElement>(".diagnostics-refresh")?.addEventListener("click", async () => { await refreshDiagnostics(); rerender(); });
  document.querySelector<HTMLButtonElement>(".diagnostics-measure")?.addEventListener("click", async () => {
    busy = "measure"; error = null; rerender();
    try {
      const result = await invoke<MeasureResult>("codex_diagnostics_measure");
      connector = result.connection;
      diagnostics = result.diagnostics;
    } catch (cause) { error = String(cause); }
    finally { busy = null; rerender(); }
  });
}
