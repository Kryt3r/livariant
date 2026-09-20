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

  assert.match(main, /Desktop preview/);
  assert.match(main, /Project context \+ diagnostics/);
  assert.match(settingsSync, /systemFoundation: "Desktop preview"/);
  assert.match(settingsSync, /systemFoundation: "Desktop-Vorschau"/);
  assert.match(settingsSync, /foundation: "App settings"/);
  assert.match(settingsSync, /foundation: "App-Einstellungen"/);
});
