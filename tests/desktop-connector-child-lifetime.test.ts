import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Windows connector host child is bound to parent lifetime", async () => {
  const source = await readFile("apps/desktop/src-tauri/src/connector_host.rs", "utf8");

  assert.match(source, /JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE/);
  assert.match(source, /CreateJobObjectW/);
  assert.match(source, /SetInformationJobObject/);
  assert.match(source, /AssignProcessToJobObject/);
  assert.match(source, /ChildLifetimeGuard::attach\(&child\)/);
  assert.match(source, /_lifetime_guard: lifetime_guard/);
});

test("connector host still performs explicit graceful child cleanup", async () => {
  const source = await readFile("apps/desktop/src-tauri/src/connector_host.rs", "utf8");

  assert.match(source, /impl Drop for ConnectorHostProcess/);
  assert.match(source, /self\.child\.kill\(\)/);
  assert.match(source, /self\.child\.wait\(\)/);
});

test("non-Windows connector lifetime guard remains a no-op", async () => {
  const source = await readFile("apps/desktop/src-tauri/src/connector_host.rs", "utf8");

  assert.match(source, /#\[cfg\(not\(target_os = "windows"\)\)\]\s*mod child_lifetime/);
  assert.match(source, /pub\(crate\) struct ChildLifetimeGuard;/);
});
