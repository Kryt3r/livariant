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
  assert.match(shell, /providerBrandLogo\(row\.id\)/);
  assert.match(shell, /global-health-provider-logo/);
});

test("connection settings notify the shell after provider state changes", () => {
  const source = readFileSync("apps/desktop/src/connections-diagnostics.ts", "utf8");
  assert.match(source, /new Event\("livariant:connections-changed"\)/);
  assert.match(source, /local_provider_connect/);
  assert.match(source, /local_provider_disconnect/);
  assert.match(source, /codex_connector_connect/);
  assert.match(source, /codex_connector_disconnect/);
});


test("Codex connection UI keeps App Server and Livariant MCP integration explicit", () => {
  const source = readFileSync("apps/desktop/src/connections-diagnostics.ts", "utf8");
  const host = readFileSync("apps/desktop/src-tauri/src/connector_host.rs", "utf8");
  const lib = readFileSync("apps/desktop/src-tauri/src/lib.rs", "utf8");

  assert.match(source, /codex_mcp_integration_status/);
  assert.match(source, /codex_mcp_integration_connect/);
  assert.match(source, /codex_mcp_integration_disconnect/);
  assert.match(source, /Livariant MCP aktivieren/);
  assert.match(source, /neue Codex-Session/);
  assert.match(source, /kein Livariant-Projekt ausgewählt oder geroutet/);
  assert.match(source, /App Server/);

  assert.match(host, /["mcp", "get", "livariant", "--json"]/);
  assert.match(host, /["mcp", "add", "livariant", "--"/);
  assert.match(host, /["mcp", "remove", "livariant"]/);
  assert.match(host, /runtime[sS]*core[sS]*dist[sS]*src[sS]*cli[sS]*index.js/);
  assert.match(host, /expectedRuntime/);
  assert.match(host, /does not point to this Livariant Desktop runtime/);
  assert.match(host, /will not remove an MCP entry it cannot verify as its own/);
  assert.doesNotMatch(host, /cmd.exe|ComSpec|powershell/i);

  assert.match(lib, /connector_host::codex_mcp_integration_status/);
  assert.match(lib, /connector_host::codex_mcp_integration_connect/);
  assert.match(lib, /connector_host::codex_mcp_integration_disconnect/);
});
