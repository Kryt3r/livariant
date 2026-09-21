import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("project switcher renderer is idempotent so open state survives shell enhancement", () => {
  const source = readFileSync("apps/desktop/src/shell-project-switcher.ts", "utf8");
  assert.match(source, /const renderedMarkup = new WeakMap<HTMLElement, string>\(\)/);
  assert.match(source, /if \(renderedMarkup\.get\(host\) === nextMarkup\) return/);
  assert.match(source, /const wasOpen = .*dataset\.open === "true"/);
});

test("global header health reads every supported local provider and refreshes on connection changes", () => {
  const shell = readFileSync("apps/desktop/src/shell-redesign.ts", "utf8");
  assert.match(shell, /local_provider_status", \{ provider: "claude" \}/);
  assert.match(shell, /local_provider_status", \{ provider: "gemini" \}/);
  assert.match(shell, /local_provider_status", \{ provider: "custom" \}/);
  assert.match(shell, /livariant:connections-changed/);
  assert.match(shell, /connectedProviderRows/);
});

test("connection settings notify the shell after provider state changes", () => {
  const source = readFileSync("apps/desktop/src/connections-diagnostics.ts", "utf8");
  assert.match(source, /new Event\("livariant:connections-changed"\)/);
  assert.match(source, /local_provider_connect/);
  assert.match(source, /local_provider_disconnect/);
  assert.match(source, /codex_connector_connect/);
  assert.match(source, /codex_connector_disconnect/);
});
