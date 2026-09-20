import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("installed multi-project acceptance hook is compile-time gated", async () => {
  const cargo = await readFile("apps/desktop/src-tauri/Cargo.toml", "utf8");
  const lib = await readFile("apps/desktop/src-tauri/src/lib.rs", "utf8");

  assert.match(cargo, /ci-multi-project-acceptance = \[\]/);
  assert.match(lib, /#\[cfg\(feature = "ci-multi-project-acceptance"\)\]\s*mod ci_multi_project_acceptance;/);
  assert.match(lib, /#\[cfg\(feature = "ci-multi-project-acceptance"\)\]\s*ci_multi_project_acceptance::start_if_requested/);
});

test("installed acceptance exercises A-B-A isolation through native scope guards", async () => {
  const acceptance = await readFile("apps/desktop/src-tauri/src/ci_multi_project_acceptance.rs", "utf8");

  assert.match(acceptance, /ci_register_project/);
  assert.match(acceptance, /ci_activate_project/);
  assert.match(acceptance, /with_project_persistence_scope_current/);
  assert.match(acceptance, /replace_staged_file/);
  assert.match(acceptance, /expect_err\("stale Project A commit must be rejected after Project B activation"\)/);
  assert.match(acceptance, /active_diagnostics_project_id/);
  assert.match(acceptance, /ci_detach_project/);
  assert.match(acceptance, /project_brain_marker/);
  assert.match(acceptance, /github-user-access-token\.dpapi/);
  assert.match(acceptance, /measurement-state\.json/);
});

test("Windows installer workflow runs CI-only installed acceptance without replacing upload artifact", async () => {
  const workflow = await readFile(".github/workflows/desktop-windows-installer.yml", "utf8");
  const script = await readFile("apps/desktop/src-tauri/windows/ci-multi-project-acceptance.ps1", "utf8");

  assert.match(workflow, /Verify installer artifact and record digest/);
  assert.match(workflow, /Acceptance installed A-B-A multi-project isolation/);
  assert.match(workflow, /ci-multi-project-acceptance\.ps1/);
  assert.match(workflow, /Upload exact installer artifact/);

  assert.match(script, /--features ci-multi-project-acceptance/);
  assert.match(script, /LIVARIANT_CI_MULTI_PROJECT_ACCEPTANCE/);
  assert.match(script, /LIVARIANT_CI_MULTI_PROJECT_ROOT_A/);
  assert.match(script, /LIVARIANT_CI_MULTI_PROJECT_ROOT_B/);
  assert.match(script, /LIVARIANT_CI_MULTI_PROJECT_RESULT_PATH/);
  assert.match(script, /staleACommitRejected/);
  assert.match(script, /projectARestored/);
  assert.match(script, /projectBIsolated/);
  assert.match(script, /detachPreservedProjectRoot/);
  assert.match(script, /detachPreservedProjectBrain/);
  assert.match(script, /projectStateContainsNoGlobalCredentials/);
  assert.match(script, /projectStateContainsNoGlobalMeasurementState/);
  assert.match(script, /generations/);
});
