import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("GitHub Device Flow and API requests are host-bounded by a fixed timeout", async () => {
  const host = await read("apps/desktop/src-tauri/src/github_remote.rs");

  assert.match(host, /const GITHUB_HTTP_TIMEOUT_SECONDS: u64 = 15;/);
  assert.equal((host.match(/-TimeoutSec \$p\.timeoutSeconds/g) ?? []).length, 2);
  assert.equal((host.match(/"timeoutSeconds": GITHUB_HTTP_TIMEOUT_SECONDS/g) ?? []).length, 2);
  assert.match(host, /Invoke-RestMethod -Method Post/);
  assert.match(host, /Invoke-RestMethod -Method Get/);
});

test("GitHub timeout remains host policy rather than renderer input", async () => {
  const host = await read("apps/desktop/src-tauri/src/github_remote.rs");

  assert.doesNotMatch(host, /timeoutSeconds.*invoke/i);
  assert.doesNotMatch(host, /pub fn .*timeout/i);
  assert.doesNotMatch(host, /GITHUB_HTTP_TIMEOUT_SECONDS.*env::var/);
});


test("updater requests are also bounded by fixed host policy", async () => {
  const updater = await read("apps/desktop/src-tauri/src/updater.rs");

  assert.match(updater, /const UPDATER_REQUEST_TIMEOUT: Duration = Duration::from_secs\(600\);/);
  assert.match(updater, /\.timeout\(UPDATER_REQUEST_TIMEOUT\)/);
  assert.doesNotMatch(updater, /UPDATER_REQUEST_TIMEOUT.*env::var/);
});
