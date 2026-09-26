import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Desktop diagnostics commands bind to the active logical project id", async () => {
  const registry = await readFile("apps/desktop/src-tauri/src/desktop_project_registry.rs", "utf8");
  const host = await readFile("apps/desktop/src-tauri/src/connector_host.rs", "utf8");

  assert.match(registry, /pub\(crate\) fn active_diagnostics_project_id/);
  assert.match(registry, /observed_machine_local_stable_project_identity/);
  assert.match(registry, /diagnostics_project_id/);
  assert.match(registry, /neither a logical projectId nor a stable Project Brain identity/i);
  assert.match(registry, /bind_stable_project_identity_at/);
  assert.match(host, /diagnosticsProjectId/);
  assert.match(host, /active_diagnostics_project_id\(&app, registry\.inner\(\)\)\?/);
  assert.match(host, /"diagnostics", None, preset, Some\(&project_id\)/);
  assert.match(host, /"export", None, preset, Some\(&project_id\)/);
  assert.match(host, /"measure", None, preset, Some\(&project_id\)/);
});

test("connector host filters event evidence while keeping measurement state global", async () => {
  const host = await readFile("src/connectors/desktop-connector-host.ts", "utf8");

  assert.match(host, /filterDiagnosticEventsByProjectScope/);
  assert.match(host, /new DiagnosticMeasurementStateStore\(join\(diagnosticsRoot, "measurement-state\.json"\)\)/);
  assert.doesNotMatch(host, /measurement-state[^\n]*projectId/);
  assert.match(host, /measurementProjectScopes/);
  assert.match(host, /projectId: measurementProjectId/);
  assert.match(host, /diagnostics: await diagnostics\(preset, projectId\)/);
});

test("project export preserves canonical evidence root and carries explicit scope", async () => {
  const host = await readFile("src/connectors/desktop-connector-host.ts", "utf8");
  const save = await readFile("apps/desktop/src-tauri/src/diagnostics_export_save.rs", "utf8");

  assert.match(host, /\.\.\.evidence/);
  assert.match(host, /projectScope:/);
  assert.match(host, /unattributedEventCount: scoped\.unattributedEventCount/);
  assert.match(save, /projectScope/);
  assert.match(save, /unattributedEventCount/);
  assert.match(save, /livariant-diagnostics-evidence-export/);
});

test("diagnostics renderer state is invalidated on project activation", async () => {
  const cockpit = await readFile("apps/desktop/src/diagnostics-cockpit.ts", "utf8");
  const connections = await readFile("apps/desktop/src/connections-diagnostics.ts", "utf8");
  const empty = await readFile("apps/desktop/src/diagnostics-empty-state-polish.ts", "utf8");

  assert.match(cockpit, /onDesktopProjectActivated\(\(\) => \{/);
  assert.match(cockpit, /projectActivationGeneration \+= 1/);
  assert.match(cockpit, /generation !== projectActivationGeneration/);
  assert.match(cockpit, /state\.data = null/);

  assert.match(connections, /onDesktopProjectActivated\(\(\) => \{/);
  assert.match(connections, /diagnosticsProjectGeneration \+= 1/);
  assert.match(connections, /generation !== diagnosticsProjectGeneration/);
  assert.match(connections, /diagnostics = null/);

  // Empty-state semantics now belong to the cockpit's already project-scoped summary.
  // The old polish module must not start a second project-sensitive request after paint.
  assert.doesNotMatch(empty, /codex_diagnostics_summary/);
  assert.match(empty, /DiagnosticsSummary\.hasObservedData/);
});


test("diagnostics data contract separates provider connection from qualified telemetry", async () => {
  const host = await readFile("src/connectors/desktop-connector-host.ts", "utf8");
  const cockpit = await readFile("apps/desktop/src/diagnostics-cockpit.ts", "utf8");
  const preview = await readFile("apps/desktop/src/visual-preview-entry.ts", "utf8");

  assert.match(host, /connectionDoesNotImplyTelemetry: true/);
  assert.match(host, /evidenceContract: "qualified-provider-owned-usage"/);
  assert.match(host, /providerCapabilityMatrix\(provider\)\.capabilities\["provider-owned-usage-telemetry"\]/);
  assert.match(host, /telemetryCoverage: diagnosticsTelemetryCoverage\(\)/);

  assert.match(cockpit, /Telemetry coverage/);
  assert.match(cockpit, /Eine Provider-Verbindung bedeutet nicht/);
  assert.match(cockpit, /Missing provider telemetry stays missing/);
  assert.match(cockpit, /verbundene Provider keine Nutzung hatten/);

  assert.match(preview, /qualifiedProviders: \["codex"\]/);
  assert.doesNotMatch(preview, /value: "Claude", eventCount/);
  assert.doesNotMatch(preview, /value: "Gemini", eventCount/);
});


test("diagnostics exposes live provider sessions as branded provider accordions", async () => {
  const cockpit = await readFile("apps/desktop/src/diagnostics-cockpit.ts", "utf8");
  const css = await readFile("apps/desktop/src/diagnostics-cockpit.css", "utf8");
  const reconciliation = await readFile("apps/desktop/src-tauri/src/provider_session_reconciliation.rs", "utf8");

  assert.match(cockpit, /"sessions", lang\("Live sessions", "Live-Sessions"\)/);
  assert.match(cockpit, /providerBrandLogo\(provider\)/);
  assert.match(cockpit, /reconcile_codex_provider_sessions/);
  assert.match(cockpit, /reconcile_provider_hook_sessions/);
  assert.match(cockpit, /Desktop project selection only filters the view/);
  assert.match(cockpit, /temporären Diagnose-Mess-Thread/);
  assert.match(cockpit, /data-dc-provider/);
  assert.match(cockpit, /openProviders/);
  assert.match(cockpit, /LIVE_SESSION_REFRESH_MS = 15_000/);

  assert.match(css, /\.dc-provider-accordion/);
  assert.match(css, /\.dc-provider-brand/);
  assert.match(css, /\.dc-session-row/);
  assert.match(css, /\.dc-session-state\.ok/);

  assert.match(reconciliation, /loop \{/);
  assert.match(reconciliation, /Duration::from_secs\(30\)/);
  assert.match(reconciliation, /reconcile_codex_sessions_blocking\(app\.clone\(\)\)/);
  assert.match(reconciliation, /reconcile_provider_hook_sessions_blocking\(app\.clone\(\)\)/);
});
