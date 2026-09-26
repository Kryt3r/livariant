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


test("live Codex diagnostics keeps unmatched provider evidence visible", async () => {
  const cockpit = await readFile("apps/desktop/src/diagnostics-cockpit.ts", "utf8");
  const css = await readFile("apps/desktop/src/diagnostics-cockpit.css", "utf8");

  assert.match(cockpit, /Provider catalog/);
  assert.match(cockpit, /Andere registrierte Projekte/);
  assert.match(cockpit, /Nicht zugeordnete Provider-Threads/);
  assert.match(cockpit, /binding\.project === null/);
  assert.match(cockpit, /binding\.project !== null && !belongsToDiagnosticsProject/);
  assert.match(cockpit, /binding\.cwd/);

  assert.match(css, /\.dc-session-catalog-summary/);
  assert.match(css, /\.dc-session-diagnostic-group/);
});


test("Codex live reconciliation prefers direct Provider Context thread evidence over provider cwd fallback", async () => {
  const server = await readFile("src/mcp/server.ts", "utf8");
  const observation = await readFile("src/connectors/provider-context-observation.ts", "utf8");
  const reconciliation = await readFile("src/connectors/codex-thread-reconciliation-cli.ts", "utf8");
  const desktop = await readFile("apps/desktop/src-tauri/src/provider_session_reconciliation.rs", "utf8");
  const cockpit = await readFile("apps/desktop/src/diagnostics-cockpit.ts", "utf8");

  assert.match(server, /_meta\.threadId/);
  assert.match(server, /appendProviderContextSessionObservation/);
  assert.match(server, /stableProjectIdentity: result\.stableProjectIdentity/);
  assert.match(server, /projectPath/);

  assert.match(observation, /provider-context-session-observation/);
  assert.match(observation, /context-observations\.jsonl/);
  assert.match(observation, /projectTruth: false/);
  assert.match(observation, /grantsAuthority: false/);

  assert.match(desktop, /read_provider_context_observations/);
  assert.match(desktop, /contextObservations/);
  assert.match(desktop, /directProviderContextDrivesProjectAttribution/);
  assert.match(desktop, /cwdIsFallbackAttribution/);

  assert.match(reconciliation, /applyDirectProviderContextEvidence/);
  assert.match(reconciliation, /providerThreadId === binding\.threadId/);
  assert.match(reconciliation, /stableProjectIdentity === observation\.stableProjectIdentity/);
  assert.match(reconciliation, /attribution: "provider-context"/);
  assert.match(reconciliation, /attribution: "provider-context-conflict"/);
  assert.match(reconciliation, /runtime workspace roots/);
  assert.match(reconciliation, /provider-owned Codex project metadata/);
  assert.match(reconciliation, /cwd as final fallback/);

  assert.match(cockpit, /Direkter Provider Context/);
  assert.match(cockpit, /Widersprüchliche direkte Evidence/);
});


test("live Codex diagnostics exposes direct evidence pipeline counts", async () => {
  const reconciliation = await readFile("src/connectors/codex-thread-reconciliation-cli.ts", "utf8");
  const cockpit = await readFile("apps/desktop/src/diagnostics-cockpit.ts", "utf8");
  const css = await readFile("apps/desktop/src/diagnostics-cockpit.css", "utf8");

  assert.match(reconciliation, /directContextEvidence/);
  assert.match(reconciliation, /codexObservationsWithThreadId/);
  assert.match(reconciliation, /observationsMatchingRegisteredProjectIdentity/);
  assert.match(reconciliation, /distinctObservationThreadIdsMatchingCatalog/);
  assert.match(reconciliation, /bindingsUsingDirectContext/);
  assert.match(reconciliation, /bindingsWithDirectContextConflict/);

  assert.match(cockpit, /Direkte Provider-Context-Evidence/);
  assert.match(cockpit, /mit Thread-ID/);
  assert.match(cockpit, /passender registrierter Projektidentität/);
  assert.match(cockpit, /Thread-IDs im Provider-Katalog gefunden/);
  assert.match(css, /\.dc-direct-evidence-summary/);
});


test("Codex reconciliation can use provider-owned project roots before cwd fallback", async () => {
  const appServer = await readFile("src/connectors/codex-app-server.ts", "utf8");
  const runtime = await readFile("src/connectors/codex-runtime.ts", "utf8");
  const projectCatalog = await readFile("src/connectors/codex-project-catalog.ts", "utf8");
  const reconciliation = await readFile("src/connectors/codex-thread-reconciliation-cli.ts", "utf8");
  const binding = await readFile("src/connectors/provider-project-binding.ts", "utf8");
  const cockpit = await readFile("apps/desktop/src/diagnostics-cockpit.ts", "utf8");

  assert.match(appServer, /experimentalApi/);
  assert.match(runtime, /experimentalApi\?: boolean/);
  assert.match(projectCatalog, /project\/list/);
  assert.match(projectCatalog, /projectId/);
  assert.match(projectCatalog, /roots/);

  assert.match(reconciliation, /listCodexProjects/);
  assert.match(reconciliation, /experimentalApi: true/);
  assert.match(reconciliation, /applyCodexProviderProjectBindings/);
  assert.match(reconciliation, /providerProjectEvidence/);

  assert.match(binding, /attribution: "provider-project"/);
  assert.match(binding, /attribution: "provider-project-conflict"/);
  assert.match(binding, /providerProject\.roots/);

  assert.match(cockpit, /Codex-Projektmetadaten/);
  assert.match(cockpit, /Threads mit Projekt-ID/);
});


test("Codex reconciliation can use loaded runtime workspace roots without resuming threads", async () => {
  const catalog = await readFile("src/connectors/codex-thread-catalog.ts", "utf8");
  const reconciliation = await readFile("src/connectors/codex-thread-reconciliation-cli.ts", "utf8");
  const binding = await readFile("src/connectors/provider-project-binding.ts", "utf8");
  const cockpit = await readFile("apps/desktop/src/diagnostics-cockpit.ts", "utf8");

  assert.match(catalog, /runtimeWorkspaceRoots/);
  assert.match(catalog, /thread\.environments/);
  assert.match(catalog, /environments must be an array or null/);

  assert.match(binding, /applyCodexRuntimeWorkspaceBindings/);
  assert.match(binding, /attribution: "provider-workspace"/);
  assert.match(binding, /attribution: "provider-workspace-conflict"/);
  assert.match(binding, /thread\.runtimeWorkspaceRoots/);

  assert.match(reconciliation, /applyCodexRuntimeWorkspaceBindings/);
  assert.match(reconciliation, /runtimeWorkspaceEvidence/);
  assert.match(reconciliation, /threadsWithRuntimeWorkspaceRoots/);
  assert.match(reconciliation, /bindingsUsingRuntimeWorkspace/);
  assert.doesNotMatch(reconciliation, /thread\/resume/);

  assert.match(cockpit, /Codex-Runtime-Workspace-Evidence/);
  assert.match(cockpit, /Threads mit Runtime-Roots/);
  assert.match(cockpit, /Codex-Runtime-Workspace/);
});
