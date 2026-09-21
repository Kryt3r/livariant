import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("local provider connection intents live under the active Desktop project state root", () => {
  const source = readFileSync("apps/desktop/src-tauri/src/local_provider_desktop.rs", "utf8");
  assert.match(source, /active_project_scope/);
  assert.match(source, /scope\.state_root\.join\("connections"\)/);
  assert.match(source, /legacy_intent_path/);
  assert.match(source, /migrate_legacy_intent_if_needed/);
});

test("Codex connector host is rebound when the active Desktop project changes", () => {
  const source = readFileSync("apps/desktop/src-tauri/src/connector_host.rs", "utf8");
  assert.match(source, /desktop_project_id: String/);
  assert.match(source, /process\.desktop_project_id != scope\.desktop_project_id/);
  assert.match(source, /scope\.state_root, "diagnostics"/);
  assert.match(source, /scope\.state_root, "connections"/);
  assert.match(source, /LIVARIANT_CONNECTION_INTENT_PATH/);
});

test("provider renderer clears and reloads connection state on Desktop project activation", () => {
  const source = readFileSync("apps/desktop/src/connections-diagnostics.ts", "utf8");
  const activation = source.slice(source.lastIndexOf("onDesktopProjectActivated"));
  assert.match(activation, /connector = null/);
  assert.match(activation, /localProviders = \{\}/);
  assert.match(activation, /refreshConnector\(\)/);
  assert.match(activation, /refreshLocalProviders\(\)/);
  assert.match(activation, /notifyConnectionHealthChanged\(\)/);
});

test("startup Codex restore is resolved against the active Desktop project", () => {
  const source = readFileSync("apps/desktop/src-tauri/src/lib.rs", "utf8");
  assert.match(source, /state::<desktop_project_registry::DesktopProjectRegistryState>/);
  assert.match(source, /restore_persistent_connection\(&handle, state\.inner\(\), registry\.inner\(\)\)/);
});
