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
  assert.match(source, /codex_provider_connect/);
  assert.match(source, /codex_provider_disconnect/);
});


test("normal Codex connection orchestrates App Server and Livariant MCP while keeping technical layers separate", () => {
  const source = readFileSync("apps/desktop/src/connections-diagnostics.ts", "utf8");
  const host = readFileSync("apps/desktop/src-tauri/src/connector_host.rs", "utf8");
  const lib = readFileSync("apps/desktop/src-tauri/src/lib.rs", "utf8");

  assert.match(source, /codex_mcp_integration_status/);
  assert.match(source, /codex_mcp_integration_connect/);
  assert.match(source, /codex_mcp_integration_disconnect/);
  assert.match(source, /codex_provider_connect/);
  assert.match(source, /Codex ist mit Livariant verbunden/);
  assert.match(source, /if \(codexMcp\?\.state === "unavailable"\)/);
  assert.doesNotMatch(source, /connected && codexMcp\?\.state === "unavailable"/);
  assert.match(source, /Technische Details/);
  assert.match(source, /<details class="provider-disclosure/);
  assert.match(source, /Neue Codex-Session/);
  assert.match(source, /App Server/);

  const bulkFlow = source.slice(
    source.lastIndexOf('document.querySelector<HTMLButtonElement>(".connect-all-providers")'),
    source.lastIndexOf('document.querySelector<HTMLButtonElement>(".connector-refresh")'),
  );
  assert.doesNotMatch(bulkFlow, /codex_(?:connector|provider)_connect|codex_mcp_integration_connect/);

  assert.ok(host.includes('["mcp", "get", "livariant", "--json"]'));
  assert.match(host, /"mcp",\s*"add",\s*"livariant",\s*"--"/s);
  assert.ok(host.includes('["mcp", "remove", "livariant"]'));
  for (const segment of ["runtime", "core", "dist", "src", "cli", "index.js"]) assert.ok(host.includes(segment));
  assert.match(host, /expectedRuntime/);
  assert.match(host, /does not point to this Livariant Desktop runtime/);
  assert.match(host, /state.*not-registered/s);
  assert.match(host, /Codex MCP configuration could not be changed safely/);
  assert.match(host, /will not remove an MCP entry it cannot verify as its own/);
  assert.doesNotMatch(host, /cmd.exe|ComSpec|powershell/i);

  assert.match(lib, /connector_host::codex_mcp_integration_status/);
  assert.match(lib, /connector_host::codex_mcp_integration_connect/);
  assert.match(lib, /connector_host::codex_mcp_integration_disconnect/);
  assert.match(lib, /connector_host::codex_provider_connect/);
  assert.match(lib, /connector_host::codex_provider_disconnect/);

  const providerDisconnect = host.slice(host.indexOf("pub fn codex_provider_disconnect"), host.indexOf("pub fn codex_connector_disconnect"));
  assert.ok(providerDisconnect.indexOf("codex_mcp_status_inner") < providerDisconnect.indexOf('"disconnect"'));
  assert.match(providerDisconnect, /Ok\(inspected_mcp\) => inspected_mcp/);

  const disconnectHandler = source.slice(source.indexOf('".connector-disconnect"'), source.indexOf('".codex-mcp-connect"'));
  assert.match(disconnectHandler, /codex_provider_disconnect/);
  assert.match(disconnectHandler, /await refreshConnector\(\)/);
});
