import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MAIN = "apps/desktop/src/main.ts";
const EXPLORER = "apps/desktop/src/knowledge-explorer-view.ts";
const BRIDGE = "apps/desktop/src/project-knowledge-bridge.ts";

test("Knowledge Explorer is a read-only categorized child of protected Project Knowledge, not an alternate truth page", async () => {
  const [main, view, bridge] = await Promise.all([MAIN, EXPLORER, BRIDGE].map((path) => readFile(path, "utf8")));
  assert.match(main, /renderKnowledgeExplorer\(\)/);
  assert.match(main, /bindKnowledgeExplorerEvents\(\)/);
  assert.match(main, /refreshKnowledgeExplorer\(\)/);
  assert.match(main, /invalidateKnowledgeExplorer\(\)/);
  assert.match(main, /projectKnowledgeRequestGeneration/);
  assert.match(main, /if \(generation !== projectKnowledgeRequestGeneration\) return/);
  assert.match(main, /if \(generation === projectKnowledgeRequestGeneration\)/);
  assert.match(view, /loadProjectKnowledgeExplorer\(\)/);
  assert.match(bridge, /invoke<ProjectKnowledgeExplorer>\("project_knowledge_explorer"\)/);

  assert.match(view, /"decision", "fact", "goal", "project-identity"/);
  assert.match(view, /"observation", "open-question", "unclassified-knowledge"/);
  assert.match(view, /aria-pressed=/);
  assert.match(view, /<details class="knowledge-explorer-entry">/);
  assert.match(view, /data-explorer-search/);
  assert.match(view, /data-explorer-more/);
  assert.match(view, /const PAGE_SIZE = 60/);
  assert.match(view, /source\.document/);
  assert.match(view, /source\.sourceRecordId/);
  assert.match(view, /revisionDigest/);
  assert.match(view, /supersededBy/);
});

test("Explorer outputs escape untrusted display fields and display boundaries rather than granting authority", async () => {
  const [main, view, style] = await Promise.all([
    readFile(MAIN, "utf8"),
    readFile(EXPLORER, "utf8"),
    readFile("apps/desktop/src/knowledge-explorer.css", "utf8"),
  ]);
  assert.match(view, /html\(entry\.statement\)/);
  assert.match(view, /html\(entry\.source\.document\)/);
  assert.match(view, /html\(entry\.source\.sourceSection\)/);
  assert.match(view, /html\(entry\.revisionDigest\)/);
  assert.match(view, /result\.boundaries\.grantsAuthority !== false/);
  assert.match(view, /result\.boundaries\.mutationSupported !== false/);
  assert.match(view, /request !== generation/);
  assert.match(view, /Beobachtungen, offene Fragen und unklassifizierte Notizen sind keine verbindlichen Projektregeln/);
  assert.match(view, /Schreibgeschützte Project-Brain-Evidence/);
  assert.doesNotMatch(view, /applyActionableProposal|issueSemanticGuardianAuthority|authorizeActionableProposal/);
  assert.match(main, /if \(currentView === "steps"\) void refreshKnowledgeExplorer\(\)/);
  assert.match(main, /onDesktopProjectActivated\(\(\) => \{\s*projectKnowledgeRequestGeneration\+\+;\s*invalidateKnowledgeExplorer\(\)/);
  assert.match(style, /\.knowledge-explorer-search input:focus-visible/);
});

test("Explorer does not replace curated purpose/direction/rules review and existing protected apply path", async () => {
  const main = await readFile(MAIN, "utf8");
  const start = main.indexOf("const renderProjectTruthView");
  const end = main.indexOf("const renderContent", start);
  assert.ok(start >= 0 && end > start);
  const section = main.slice(start, end);
  assert.match(section, /areas\.map\(renderAreaCard\)/);
  assert.match(section, /\$\{renderKnowledgeExplorer\(\)\}/);
  assert.match(section, /renderProjectKnowledgeProtection\(\)/);
  assert.match(section, /renderTruthReviewModal\(\)/);
  assert.match(section, /renderTruthSourceModal\(\)/);
  assert.match(main, /applyProjectKnowledgeProposal\(/);
  assert.match(main, /applyProjectKnowledgeSnapshot\(applied\.snapshot\)/);
});
