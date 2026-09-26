import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("provider session reconciliation is independent of the currently selected Desktop project", async () => {
  const reconciliation = await readFile("apps/desktop/src-tauri/src/provider_session_reconciliation.rs", "utf8");
  const registry = await readFile("apps/desktop/src-tauri/src/desktop_project_registry.rs", "utf8");
  const lib = await readFile("apps/desktop/src-tauri/src/lib.rs", "utf8");

  assert.match(registry, /pub\(crate\) fn registered_provider_projects/);
  assert.match(reconciliation, /registered_provider_projects\(&app\)/);
  assert.doesNotMatch(reconciliation, /active_project_scope|active_diagnostics_project_id/);
  assert.match(reconciliation, /provider-sessions/);
  assert.match(reconciliation, /desktopSelectionControlsRouting["']?:?\s*false/);
  assert.match(reconciliation, /providerSessionEvidenceIsProjectTruth["']?:?\s*false/);
  assert.match(reconciliation, /providerSessionEvidenceGrantsAuthority["']?:?\s*false/);
  assert.match(lib, /provider_session_reconciliation::start_background\(app\.handle\(\)\.clone\(\)\)/);
  assert.match(lib, /provider_session_reconciliation::reconcile_codex_provider_sessions/);
  assert.match(lib, /provider_session_reconciliation::reconcile_provider_hook_sessions/);
  assert.match(reconciliation, /hook-observations\.jsonl/);
  assert.match(reconciliation, /hook-bindings\.json/);
  assert.match(reconciliation, /reconcile_provider_hook_sessions_blocking/);
});

test("Desktop registry no longer persists provider routing activation state", async () => {
  const registry = await readFile("apps/desktop/src-tauri/src/desktop_project_registry.rs", "utf8");
  assert.doesNotMatch(registry, /provider_activation|providerActivation|DesktopProviderActivationRecord/);
});
