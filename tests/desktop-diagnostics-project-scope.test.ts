import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Desktop diagnostics commands bind to the active logical project id", async () => {
  const registry = await readFile("apps/desktop/src-tauri/src/desktop_project_registry.rs", "utf8");
  const host = await readFile("apps/desktop/src-tauri/src/connector_host.rs", "utf8");

  assert.match(registry, /pub\(crate\) fn active_diagnostics_project_id/);
  assert.match(registry, /active Desktop project has no logical projectId/i);
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
