import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Desktop diagnostics export saving stays behind the native host boundary", async () => {
  const nativeSave = await readFile("apps/desktop/src-tauri/src/diagnostics_export_save.rs", "utf8");
  const nativeLib = await readFile("apps/desktop/src-tauri/src/lib.rs", "utf8");
  const renderer = await readFile("apps/desktop/src/connections-diagnostics.ts", "utf8");

  assert.match(nativeSave, /codex_diagnostics_export\(app, state, preset\)\?/);
  assert.match(nativeSave, /validate_export_for_save\(&evidence\)\?/);
  assert.match(nativeSave, /pick_export_path\(&default_file_name\)\?/);
  assert.match(nativeSave, /fs::write\(&path, encoded\)/);
  assert.match(nativeSave, /rawPromptsIncluded/);
  assert.match(nativeSave, /exportGrantsAuthority/);

  assert.match(nativeLib, /diagnostics_export_save::save_codex_diagnostics_export/);
  assert.doesNotMatch(nativeLib, /connector_host::codex_diagnostics_export,/);
  assert.match(renderer, /invoke<DiagnosticsExportSaveResult>\("save_codex_diagnostics_export", \{ preset: selectedDiagnosticsPreset \}\)/);
  assert.doesNotMatch(renderer, /invoke<[^>]*>\("codex_diagnostics_export"/);
  assert.doesNotMatch(renderer, /save_codex_diagnostics_export", \{[^}]*path/i);
  assert.doesNotMatch(renderer, /save_codex_diagnostics_export", \{[^}]*content/i);
});

test("native save command does not accept renderer supplied path or export content", async () => {
  const nativeSave = await readFile("apps/desktop/src-tauri/src/diagnostics_export_save.rs", "utf8");
  const signature = nativeSave.match(/pub fn save_codex_diagnostics_export\([\s\S]*?\) -> Result<DiagnosticsExportSaveResult, String>/)?.[0];
  assert.ok(signature);
  assert.doesNotMatch(signature, /path\s*:/i);
  assert.doesNotMatch(signature, /content\s*:/i);
  assert.doesNotMatch(signature, /evidence\s*:/i);
  assert.match(signature, /preset: Option<String>/);
});
