import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const text = (path: string) => readFile(path, "utf8");

test("GitHub local clone host is bounded to the selected live repository", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_remote.rs");
  assert.match(host, /github_clone_repository/);
  assert.match(host, /\/repositories\/\{numeric_id\}/);
  assert.match(host, /eq_ignore_ascii_case\(repository_id\)/);
  assert.match(host, /Clone destination is not empty/);
  assert.match(host, /must not be a symbolic link/);
  assert.match(host, /GIT_TERMINAL_PROMPT/);
  assert.match(host, /GIT_CONFIG_KEY_0/);
  assert.match(host, /http\.https:\/\/github\.com\/\.extraheader/);
  assert.match(host, /credential\.helper/);
  assert.doesNotMatch(host, /https:\/\/x-access-token:/);
  assert.doesNotMatch(host, /remove_dir_all/);
});

test("clone remains separate from Livariant source confirmation and Authority", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_remote.rs");
  const ui = await text("apps/desktop/src/github-first-run-integration.ts");
  const lib = await text("apps/desktop/src-tauri/src/lib.rs");

  assert.match(lib, /github_remote::github_clone_repository/);
  assert.match(host, /"cloneIsProjectTruth": false/);
  assert.match(host, /"cloneGrantsAuthority": false/);
  assert.match(host, /"localBindingAutomatic": false/);
  assert.match(host, /"remoteMutationPerformed": false/);
  assert.match(ui, /Use existing checkout/);
  assert.match(ui, /Clone locally/);
  assert.match(ui, /Later \/ remote only/);
  assert.match(ui, /inspect_first_run_repository/);
  assert.match(ui, /github_clone_repository/);
  assert.match(ui, /Confirm the repository form/);
});
