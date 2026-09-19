import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("revisit onboarding reserves visible bottom space", async () => {
  const ui = await read("apps/desktop/src/first-run-ui.ts");
  const css = await read("apps/desktop/src/first-run-ui.css");

  assert.match(ui, /first-run-frame \$\{options\.force \? "first-run-revisit" : ""\}/);
  assert.match(css, /\.first-run-revisit \.fr-rail\s*\{[\s\S]*padding-bottom:\s*64px;/);
  assert.match(css, /\.first-run-frame\s*\{[\s\S]*height:\s*100dvh;/);
});

test("Codex connection redesign styles the actual modal rather than a stage wrapper", async () => {
  const source = await read("apps/desktop/src/connections-diagnostics.ts");
  const css = await read("apps/desktop/src/connections-redesign.css");

  const codexStart = source.indexOf("const renderCodexModal");
  const plannedStart = source.indexOf("const renderPlannedProviderModal", codexStart);
  const codexBlock = source.slice(codexStart, plannedStart);

  assert.doesNotMatch(codexBlock, /provider-modal-stage/);
  assert.match(codexBlock, /provider-modal provider-modal-codex/);
  assert.match(codexBlock, /provider-modal-header provider-modal-hero/);
  assert.match(codexBlock, /provider-detail-section/);
  assert.match(css, /\.provider-modal-codex\s*\{/);
  assert.match(css, /\.provider-modal-backdrop::before,[\s\S]*\.provider-modal-backdrop::after\s*\{[\s\S]*display:\s*none !important;/);
});
