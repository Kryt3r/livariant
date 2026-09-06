import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const CANONICAL_PREVIEW_FEED = "https://raw.githubusercontent.com/Kryt3r/livariant/desktop-preview-index/latest.json";

test("desktop static and runtime updater configuration use the canonical preview feed", () => {
  const configPath = resolve("apps/desktop/src-tauri/tauri.conf.json");
  const updaterPath = resolve("apps/desktop/src-tauri/src/updater.rs");
  const config = JSON.parse(readFileSync(configPath, "utf8")) as {
    plugins?: { updater?: { endpoints?: unknown } };
  };
  assert.deepEqual(config.plugins?.updater?.endpoints, [CANONICAL_PREVIEW_FEED]);

  const updaterSource = readFileSync(updaterPath, "utf8");
  assert.ok(
    updaterSource.includes(CANONICAL_PREVIEW_FEED),
    "runtime updater source must use the same canonical preview feed as tauri.conf.json",
  );
});
