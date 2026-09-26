import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { providerCapabilityMatrix } from "../src/connectors/provider-capabilities.js";

test("provider capability truth distinguishes Codex, Claude, Gemini and Custom", () => {
  const codex = providerCapabilityMatrix("codex").capabilities;
  const claude = providerCapabilityMatrix("claude").capabilities;
  const gemini = providerCapabilityMatrix("gemini").capabilities;
  const custom = providerCapabilityMatrix("custom").capabilities;

  assert.equal(codex["live-project-context"].state, "supported");
  assert.equal(codex["live-session-correlation"].state, "supported");
  assert.equal(codex["retrospective-session-attribution"].state, "supported");
  assert.equal(codex["provider-owned-usage-telemetry"].state, "supported");

  assert.equal(claude["live-project-context"].state, "supported");
  assert.equal(claude["live-session-correlation"].state, "mcp-session-only");
  assert.equal(claude["retrospective-session-attribution"].state, "provider-capable-not-integrated");
  assert.equal(claude["provider-owned-usage-telemetry"].state, "not-integrated");

  assert.equal(gemini["live-project-context"].state, "supported");
  assert.equal(gemini["live-session-correlation"].state, "mcp-session-only");
  assert.equal(gemini["retrospective-session-attribution"].state, "provider-capable-not-integrated");
  assert.equal(gemini["provider-owned-usage-telemetry"].state, "not-integrated");

  for (const capability of Object.values(custom)) {
    assert.equal(capability.state, "bridge-dependent");
  }
});

test("Desktop provider UI presents capabilities separately from connection state", async () => {
  const source = await readFile("apps/desktop/src/connections-diagnostics.ts", "utf8");
  assert.match(source, /Actual capabilities · connection alone does not imply feature parity/);
  assert.match(source, /Tatsächliche Fähigkeiten · eine Verbindung bedeutet nicht Funktionsgleichheit/);
  assert.match(source, /renderProviderCapabilities\("codex", connector\?\.capabilities\)/);
  assert.match(source, /renderProviderCapabilities\(provider, status\?\.capabilities\)/);
  assert.match(source, /Provider supports it · not integrated yet/);
  assert.match(source, /Abhängig von Bridge/);
});

test("local provider probe and Codex host expose the central capability matrix", async () => {
  const local = await readFile("src/connectors/local-provider-desktop-cli.ts", "utf8");
  const codex = await readFile("src/connectors/desktop-connector-host.ts", "utf8");
  assert.match(local, /providerCapabilityMatrix\(provider\)\.capabilities/);
  assert.match(codex, /providerCapabilityMatrix\("codex"\)\.capabilities/);
});
