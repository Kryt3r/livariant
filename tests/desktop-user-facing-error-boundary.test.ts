import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("shared technical details disclosure keeps raw host text optional", async () => {
  const helper = await read("apps/desktop/src/technical-details.ts");
  const css = await read("apps/desktop/src/technical-details.css");

  assert.match(helper, /Show technical details/);
  assert.match(helper, /Technische Details anzeigen/);
  assert.match(helper, /<details class="lv-technical-details">/);
  assert.match(helper, /<pre>\$\{esc\(value\)\}<\/pre>/);
  assert.match(css, /\.lv-technical-details pre/);
});

test("GitHub repository picker shows friendly summaries before technical errors", async () => {
  const picker = await read("apps/desktop/src/github-source-picker.ts");

  assert.match(picker, /renderTechnicalDetails\(error\)/);
  assert.match(picker, /GitHub repositories could not be loaded/);
  assert.match(picker, /GitHub connection status could not be checked/);
  assert.match(picker, /GitHub authorization could not be checked/);
  assert.doesNotMatch(picker, /<small class="fr-github-error">\$\{esc\(error\)\}<\/small>/);
});

test("Codex and diagnostics errors keep technical detail separate and scoped", async () => {
  const connections = await read("apps/desktop/src/connections-diagnostics.ts");

  assert.match(connections, /errorContext: "connector" \| "diagnostics"/);
  assert.match(connections, /const connectorError = errorContext === "connector"/);
  assert.match(connections, /renderTechnicalDetails\(connectorError\)/);
  assert.match(connections, /errorContext === "diagnostics" && error \? renderTechnicalDetails\(error\)/);
  assert.match(connections, /Codex could not be connected/);
  assert.match(connections, /Diagnostics could not be refreshed/);
  assert.doesNotMatch(connections, /<p>\$\{esc\(error\)\}<\/p>/);
  assert.doesNotMatch(connections, /esc\(error \?\?/);
});

test("Project Sources and Review use friendly summaries with optional host detail", async () => {
  const bridge = await read("apps/desktop/src/project-source-review-bridge.ts");
  const view = await read("apps/desktop/src/project-source-review-view.ts");

  assert.match(bridge, /technicalDetail\?: string/);
  assert.match(bridge, /technicalDetail: String\(error\)/);
  assert.match(bridge, /Existing project state remains unchanged/);
  assert.doesNotMatch(bridge, /:\s*\$\{String\(error\)\}/);

  assert.match(view, /technicalDetail\?: string/);
  assert.match(view, /renderTechnicalDetails\(selection\.technicalDetail\)/);
  assert.match(view, /renderTechnicalDetails\(technicalDetail\)/);
});
