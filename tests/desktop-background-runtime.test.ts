import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path: string) => readFile(path, "utf8");

test("Desktop background runtime hides only the main window on close and keeps explicit quit separate", async () => {
  const background = await text("apps/desktop/src-tauri/src/background_runtime.rs");

  assert.match(background, /MAIN_WINDOW_LABEL: &str = "main"/);
  assert.match(background, /WindowEvent::CloseRequested/);
  assert.match(background, /api\.prevent_close\(\)/);
  assert.match(background, /window\.hide\(\)/);
  assert.match(background, /window\.label\(\) != MAIN_WINDOW_LABEL/);

  assert.match(background, /TRAY_QUIT_ID => app\.exit\(0\)/);
  assert.match(background, /TRAY_OPEN_ID => show_main_window\(app\)/);
  assert.match(background, /get_webview_window\(MAIN_WINDOW_LABEL\)/);
  assert.match(background, /window\.unminimize\(\)/);
  assert.match(background, /window\.show\(\)/);
  assert.match(background, /window\.set_focus\(\)/);
});

test("Tray is native-host owned and renderer receives no background lifecycle authority", async () => {
  const background = await text("apps/desktop/src-tauri/src/background_runtime.rs");
  const lib = await text("apps/desktop/src-tauri/src/lib.rs");
  const cargo = await text("apps/desktop/src-tauri/Cargo.toml");

  assert.match(cargo, /tauri = \{ version = "2", features = \["tray-icon"\] \}/);
  assert.match(background, /TrayIconBuilder::with_id\(TRAY_ID\)/);
  assert.match(background, /show_menu_on_left_click\(false\)/);
  assert.match(background, /MouseButton::Left/);
  assert.match(background, /MouseButtonState::Up/);
  assert.match(lib, /background_runtime::install\(app\)\?/);
  assert.match(lib, /\.on_window_event\(background_runtime::handle_window_event\)/);
  assert.doesNotMatch(lib, /background_runtime::[^,\n]*,/);
});

test("Existing persisted Codex reconnect remains the single startup reconnect path", async () => {
  const lib = await text("apps/desktop/src-tauri/src/lib.rs");
  const connector = await text("apps/desktop/src-tauri/src/connector_host.rs");

  assert.equal((lib.match(/restore_persistent_connection/g) ?? []).length, 1);
  assert.match(lib, /std::thread::spawn[\s\S]*restore_persistent_connection\(&handle, state\.inner\(\)\)/);
  assert.match(connector, /pub fn restore_persistent_connection/);
  assert.match(connector, /persisted_connection_desired/);
  assert.match(connector, /request\(app, state, "inspect", None, None\)\.map\(\|_\| \(\)\)/);
  assert.doesNotMatch(await text("apps/desktop/src-tauri/src/background_runtime.rs"), /restore_persistent_connection|codex_connector_connect|desiredConnected/);
});
