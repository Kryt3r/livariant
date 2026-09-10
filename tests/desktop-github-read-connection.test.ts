import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const text = (path: string) => readFile(resolve(repoRoot, path), "utf8");

test("GitHub Desktop host keeps connection read-only and credentials outside project/plaintext state", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_remote.rs");
  const cargo = await text("apps/desktop/src-tauri/Cargo.toml");
  const lib = await text("apps/desktop/src-tauri/src/lib.rs");

  assert.match(host, /github_begin_device_authorization/);
  assert.match(host, /github_poll_device_authorization/);
  assert.match(host, /github_list_repositories/);
  assert.match(host, /GitHub App client ID/);
  assert.match(host, /ConvertFrom-SecureString/);
  assert.match(host, /github-user-access-token\.dpapi/);
  assert.match(host, /connectionGrantsAuthority[^\n]*false/);
  assert.match(host, /writeCapabilityEnabled[^\n]*false/);
  assert.match(host, /remoteEvidenceIsProjectTruth[^\n]*false/);
  assert.match(host, /https:\/\/api\.github\.com/);
  assert.doesNotMatch(host, /scope["']?\s*[:=]\s*["']repo["']/i);
  assert.doesNotMatch(host, /fs::write[^\n]*(access_token|refresh_token)/i);
  assert.doesNotMatch(cargo, /keyring|ureq/);
  assert.match(lib, /manage\(github_remote::GitHubRemoteState::default\(\)\)/);
});

test("First-run GitHub picker prefers authorized repository discovery while preserving explicit source confirmation", async () => {
  const picker = await text("apps/desktop/src/github-source-picker.ts");
  const integration = await text("apps/desktop/src/github-first-run-integration.ts");
  const entry = await text("apps/desktop/src/desktop-entry.ts");

  assert.match(picker, /private repositories/);
  assert.match(picker, /github_list_repositories/);
  assert.match(picker, /github_begin_device_authorization/);
  assert.match(picker, /Find repository/);
  assert.match(integration, /form\[data-fr-primary\], form\[data-fr-additional\]/);
  assert.match(integration, /repositoryId/);
  assert.match(integration, /remoteUrl/);
  assert.doesNotMatch(integration, /submit\(\)/);
  assert.doesNotMatch(integration, /requestSubmit\(\)/);
  assert.match(entry, /github-first-run-integration/);
});
