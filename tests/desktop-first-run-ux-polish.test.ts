import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const text = (path: string) => readFile(resolve(repoRoot, path), "utf8");

test("first-run uses bounded folder selection, detected repo confirmation and context preservation", async () => {
  const ui = await text("apps/desktop/src/first-run-ui.ts");
  const host = await text("apps/desktop/src-tauri/src/first_run_ux.rs");

  assert.match(ui, /pick_first_run_folder/);
  assert.match(ui, /inspect_first_run_repository/);
  assert.match(ui, /suggestProjectIdFromPath/);
  assert.match(ui, /Repository erkannt/);
  assert.match(ui, /Hauptrepository bestätigen/);
  assert.match(ui, /captureContext/);
  assert.match(ui, /scrollTop/);
  assert.match(ui, /preventScroll/);
  assert.doesNotMatch(ui, /@tauri-apps\/plugin-dialog/);

  assert.match(host, /FolderBrowserDialog/);
  assert.match(host, /inspect_first_run_repository/);
  assert.match(host, /git@github\.com:/);
  assert.doesNotMatch(host, /local_path[\s\S]*-Command[\s\S]*local_path/);
});

test("known discovery questions and Project Sources presentation respect Desktop language", async () => {
  const questionPresentation = await text("apps/desktop/src/first-run-presentation.ts");
  const sourceReview = await text("apps/desktop/src/project-source-review-view.ts");
  const navigation = await text("apps/desktop/src/project-source-review-navigation.ts");

  for (const id of ["unknown:project-purpose", "unknown:current-product-direction", "unknown:non-negotiable-project-rules"]) {
    assert.match(questionPresentation, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(questionPresentation, /Projektzweck/);
  assert.match(questionPresentation, /Aktuelle Ausrichtung/);
  assert.match(questionPresentation, /Regeln und Grenzen/);
  assert.match(sourceReview, /Projektquellen & Prüfung/);
  assert.match(sourceReview, /Keine aktuelle Prüfung geladen/);
  assert.match(sourceReview, /Nicht autorisiert/);
  assert.match(sourceReview, /Nicht übernommen/);
  assert.match(navigation, /Projektquellen & Prüfung/);
});

test("Project Sources navigation localization does not self-trigger its MutationObserver", async () => {
  const navigation = await text("apps/desktop/src/project-source-review-navigation.ts");
  assert.match(navigation, /const desiredLabel = text\(/);
  assert.match(navigation, /if \(label && label\.textContent !== desiredLabel\) label\.textContent = desiredLabel/);
  assert.match(navigation, /button\.innerHTML = `\$\{sourcesIcon\(\)\}<span>\$\{desiredLabel\}<\/span>`/);
  assert.doesNotMatch(navigation, /\n\s*button\.innerHTML = `\$\{sourcesIcon\(\)\}<span>\$\{text\(/);
});

test("normal onboarding copy avoids exposing internal safety jargon as the primary UX", async () => {
  const ui = await text("apps/desktop/src/first-run-ui.ts");
  assert.match(ui, /Änderungen bleiben kontrolliert/);
  assert.match(ui, /Livariant-Freigabepfad/);
  assert.doesNotMatch(ui, /kanonischen Discovery/);
  assert.doesNotMatch(ui, /Candidate Evidence/);
  assert.doesNotMatch(ui, /Semantic Apply/);
});
