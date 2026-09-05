import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("Desktop i18n runtime does not defer translation to a paint frame", async () => {
  const runtime = await read("apps/desktop/src/i18n/runtime.ts");
  assert.doesNotMatch(runtime, /requestAnimationFrame\s*\(/);
  assert.match(runtime, /record\.addedNodes/);
  assert.match(runtime, /localizeElement/);
});

test("legacy observer translators are not part of the active Desktop import boundary", async () => {
  const guard = await read("apps/desktop/src/i18n-hmr-guard.ts");
  assert.match(guard, /\.\/i18n\/runtime\.js/);
  assert.doesNotMatch(guard, /desktop-i18n-runtime/);
  assert.doesNotMatch(guard, /desktop-i18n-diagnostics/);
  assert.doesNotMatch(guard, /desktop-i18n-host-details/);
  assert.doesNotMatch(guard, /desktop-i18n-settings-sync/);
});

test("supported locale catalog entries are explicit and bilingual", async () => {
  const catalog = await read("apps/desktop/src/i18n/catalog.ts");
  const entries = [...catalog.matchAll(/"([a-zA-Z0-9.]+)": \{ segment: "([a-zA-Z]+)", en: "([^"]*)", de: "([^"]*)" \}/g)];
  assert.ok(entries.length >= 85, `expected a substantial controlled catalog, found ${entries.length} entries`);
  const keys = new Set<string>();
  for (const [, key, segment, en, de] of entries) {
    assert.ok(!keys.has(key), `duplicate i18n key: ${key}`);
    keys.add(key);
    assert.ok(segment.length > 0, `missing segment for ${key}`);
    assert.ok(en.trim().length > 0, `missing English copy for ${key}`);
    assert.ok(de.trim().length > 0, `missing German copy for ${key}`);
  }
  for (const required of [
    "navigation.diagnostics",
    "updates.installRestart",
    "diagnostics.title",
    "settings.appLanguage",
    "projectBrain.workspace",
    "projectBrain.description",
    "projectBrain.currentProject",
    "projectBrain.noProjectSelected",
    "projectBrain.confirmedAreas",
    "projectBrain.knowledgeGaps",
    "projectBrain.potentialConflicts",
    "projectBrain.curatedTitle",
    "projectBrain.projectPurpose",
    "projectBrain.currentDirection",
    "projectBrain.rulesConstraints",
  ]) {
    assert.ok(keys.has(required), `missing required controlled key ${required}`);
  }
});

test("Diagnostics behavior is structural and cannot depend on localized heading copy", async () => {
  const diagnostics = await read("apps/desktop/src/connections-diagnostics.ts");
  assert.match(diagnostics, /data-surface="diagnostics"/);
  assert.match(diagnostics, /\[data-surface='diagnostics'\]/);
  assert.doesNotMatch(diagnostics, /textContent\?\.trim\(\) === ["']Diagnostics["']/);
  assert.doesNotMatch(diagnostics, /textContent\?\.trim\(\) === ["']Diagnose["']/);
});

test("Diagnostics refresh keeps its root node mounted", async () => {
  const diagnostics = await read("apps/desktop/src/connections-diagnostics.ts");
  assert.match(diagnostics, /surface\.replaceChildren/);
  assert.doesNotMatch(diagnostics, /app\.innerHTML/);
});

test("Diagnostics range guard prevents a preset click from rebubbling into the surface preset handler", async () => {
  const guard = await read("apps/desktop/src/diagnostics-range-guard.ts");
  assert.match(guard, /\.diagnostics-range-option\[data-diagnostics-preset\]/);
  assert.match(guard, /event\.stopPropagation\(\)/);
  assert.match(guard, /capture: true/);
});

test("Diagnostics live layout is scoped to the structural diagnostics surface", async () => {
  const css = await read("apps/desktop/src/live-ui-regressions.css");
  assert.match(css, /\.diagnostics-surface \.health-strip/);
  assert.match(css, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\[data-diagnostics-attribution\]/);
});

test("UI polish discovers Updates structurally, not through visible text", async () => {
  const polish = await read("apps/desktop/src/ui-polish.ts");
  assert.match(polish, /active\[data-view='updates'\]/);
  assert.doesNotMatch(polish, /\.topbar h1/);
  assert.doesNotMatch(polish, /textContent.*Updates/);
  assert.doesNotMatch(polish, /eyebrowText/);
});

test("Updater has one active install CTA owner and keeps the available action stable", async () => {
  const index = await read("apps/desktop/index.html");
  const updater = await read("apps/desktop/src/updater-ui.ts");
  const css = await read("apps/desktop/src/live-ui-regressions.css");
  assert.match(index, /\/src\/updater-ui\.ts/);
  assert.doesNotMatch(index, /updater-cta-stabilizer/);
  assert.match(updater, /const button = installButton \?\? document\.createElement\("button"\)/);
  assert.match(updater, /button\.parentElement !== panel/);
  assert.doesNotMatch(updater, /document\.querySelector\("\.install-update"\)\?\.remove\(\);/);
  assert.match(css, /\.updates-status-card \.install-update/);
  assert.match(css, /opacity: 1 !important/);
  assert.match(css, /pointer-events: auto !important/);
  assert.match(css, /animation: none !important/);
});
