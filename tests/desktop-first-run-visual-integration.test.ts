import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const text = (path: string) => readFile(resolve(repoRoot, path), "utf8");

test("first-run loads the canonical Desktop visual foundation before rendering", async () => {
  const entry = await text("apps/desktop/src/desktop-entry.ts");
  const glassIndex = entry.indexOf('import "./glass.css"');
  const stylesIndex = entry.indexOf('import "./styles.css"');
  const firstRunIndex = entry.indexOf('import { mountFirstRunOnboarding } from "./first-run-ui.js"');

  assert.ok(glassIndex >= 0, "desktop entry must load the shared glass foundation");
  assert.ok(stylesIndex >= 0, "desktop entry must load the shared app styles");
  assert.ok(glassIndex < firstRunIndex, "glass styles must be available before first-run mounts");
  assert.ok(stylesIndex < firstRunIndex, "shared app styles must be available before first-run mounts");
});

test("first-run presentation reuses the normal Desktop palette and geometry", async () => {
  const css = await text("apps/desktop/src/first-run-ui.css");

  assert.match(css, /grid-template-columns:\s*244px\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /background:[\s\S]*var\(--bg\)/);
  assert.match(css, /color:\s*var\(--text\)/);
  assert.match(css, /color:\s*var\(--muted\)/);
  assert.match(css, /border[^;]*var\(--line\)/);
  assert.doesNotMatch(css, /font-family:\s*(Georgia|serif)/i);
});
