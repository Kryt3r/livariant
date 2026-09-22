import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("normal Desktop surfaces do not expose stale Foundation preview wording", async () => {
  const main = await read("apps/desktop/src/main.ts");
  const settingsSync = await read("apps/desktop/src/desktop-i18n-settings-sync.ts");
  const runtime = await read("apps/desktop/src/desktop-i18n-runtime.ts");

  for (const source of [main, settingsSync, runtime]) {
    assert.doesNotMatch(source, /Foundation preview|Foundation-Vorschau|Settings foundation|Einstellungs-Basis/);
  }

  assert.match(main, /Livariant Desktop/);
  assert.match(main, /Project context under your control/);
  assert.match(settingsSync, /systemFoundation: "Desktop preview"/);
  assert.match(settingsSync, /systemFoundation: "Desktop-Vorschau"/);
  assert.match(settingsSync, /foundation: "App settings"/);
  assert.match(settingsSync, /foundation: "App-Einstellungen"/);
});


test("first-run host failures are translated into actionable product copy", async () => {
  const firstRun = await read("apps/desktop/src/first-run-ui.ts");

  assert.match(firstRun, /friendlyFolderError/);
  assert.match(firstRun, /friendlyCodexError/);
  assert.match(firstRun, /Codex could not be connected/);
  assert.match(firstRun, /You can also continue and set it up later/);
  assert.match(firstRun, /Livariant did not change project files/);
  assert.doesNotMatch(firstRun, /error = String\(cause\)/);
  assert.doesNotMatch(firstRun, /return raw;/);
});
