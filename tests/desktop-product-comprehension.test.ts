import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Overview is a truthful project guidance surface rather than a link grid", () => {
  const shell = readFileSync("apps/desktop/src/shell-redesign.ts", "utf8");

  assert.match(shell, /getActiveDesktopProject/);
  assert.match(shell, /getCurrentProjectSourceReviewPresentation/);
  assert.match(shell, /loadProjectSourceReviewPresentation/);
  assert.match(shell, /data-shell-next-action/);
  assert.match(shell, /Know what matters before the next AI acts/);
  assert.match(shell, /Suggestions are not automatically project truth|Evidence and AI output can inform changes/);
  assert.doesNotMatch(shell, /completion score|quality score|project progress percentage/i);
});

test("the optional guided tour is one-time by default and restartable from Settings", () => {
  const shell = readFileSync("apps/desktop/src/shell-redesign.ts", "utf8");
  const main = readFileSync("apps/desktop/src/main.ts", "utf8");
  const firstRun = readFileSync("apps/desktop/src/first-run-ui.ts", "utf8");

  assert.match(shell, /PRODUCT_TOUR_STORAGE_KEY/);
  assert.match(shell, /loadFirstRunLifecycle/);
  assert.match(shell, /snapshot\.status !== "complete"/);
  assert.match(shell, /PRODUCT_TOUR_EVENT/);
  assert.match(main, /data-start-product-tour/);
  assert.match(main, /livariant:start-product-tour/);
  assert.match(firstRun, /short optional tour/);
  assert.match(firstRun, /kurze optionale Tour/);
});

test("normal-user surfaces explain meaning before technical detail", () => {
  const main = readFileSync("apps/desktop/src/main.ts", "utf8");
  const sources = readFileSync("apps/desktop/src/project-source-review-lazy-view.ts", "utf8");
  const diagnostics = readFileSync("apps/desktop/src/diagnostics-cockpit.ts", "utf8");
  const connections = readFileSync("apps/desktop/src/connections-diagnostics.ts", "utf8");

  assert.match(main, /purpose, direction and rules Livariant should use/i);
  assert.match(main, /current Desktop editor is still a review preview/i);
  assert.match(sources, /Where your project information comes from/);
  assert.match(sources, /Nothing is treated as project truth automatically/);
  assert.match(diagnostics, /What Livariant actually observed/);
  assert.match(diagnostics, /not project progress, quality or money saved/);
  assert.match(connections, /A connection only makes a provider available/);
});


test("maintainer review follow-up keeps primary work surfaces aligned and tour contextual", () => {
  const shell = readFileSync("apps/desktop/src/shell-redesign.ts", "utf8");
  const shellCss = readFileSync("apps/desktop/src/shell-redesign.css", "utf8");
  const diagnostics = readFileSync("apps/desktop/src/diagnostics-cockpit.ts", "utf8");
  const emptyPolish = readFileSync("apps/desktop/src/diagnostics-empty-state-polish.ts", "utf8");
  const projectPolish = readFileSync("apps/desktop/src/wp056-redesign-polish.ts", "utf8");

  assert.match(shell, /navigateProductTour/);
  assert.match(shell, /scrollIntoView/);
  assert.match(shell, /Show next area/);
  assert.match(shell, /Try this:/);
  assert.match(shellCss, /truth-workspace-redesign,[\s\S]*diagnostics-surface[\s\S]*1500px/);
  assert.match(diagnostics, /if \(!data\.hasObservedData\)/);
  assert.match(diagnostics, /Keine beobachteten Diagnosedaten/);
  assert.doesNotMatch(emptyPolish, /codex_diagnostics_summary/);
  assert.doesNotMatch(projectPolish, /PROJECT-BRAIN-ARBEITSBEREICH/);
});


test("Block-A review follow-up does not leave duplicated function declarations or nested language binding", () => {
  const shell = readFileSync("apps/desktop/src/shell-redesign.ts", "utf8");
  const main = readFileSync("apps/desktop/src/main.ts", "utf8");
  const polish = readFileSync("apps/desktop/src/wp056-redesign-polish.ts", "utf8");

  assert.doesNotMatch(shell, /const syncNotificationProxy = \(\) => \{const syncNotificationProxy/);
  assert.doesNotMatch(polish, /const localizeNotificationCopy = \(\) => \{const localizeNotificationCopy/);
  assert.doesNotMatch(polish, /const removeDuplicateOverviewComposition = \(\) => \{const removeDuplicateOverviewComposition/);
  assert.match(shell, /target: "\.connections-settings"/);
  assert.match(main, /\}\);\n\nonLanguageChange\(\(\) => \{/);
});
