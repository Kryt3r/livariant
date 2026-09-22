import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/project/initialization.js";
import {
  projectKnowledgeAreasFromDecisionRecords,
} from "../src/project/desktop-project-knowledge.js";
import { recordAcceptedDecision } from "../src/project-brain/decisions-write.js";

test("Desktop Project Knowledge projection reads only tagged active Project Brain decisions", () => {
  const areas = projectKnowledgeAreasFromDecisionRecords([
    { id: "d1", status: "active", text: "Project purpose: Keep project truth explicit", legacy: false },
    { id: "d2", status: "active", text: "Unrelated accepted decision", legacy: false },
  ]);
  const purpose = areas.find((area) => area.id === "purpose");
  assert.equal(purpose?.state, "confirmed");
  assert.equal(purpose?.confirmedValue, "Keep project truth explicit");
  assert.equal(areas.find((area) => area.id === "direction")?.state, "open");
});

test("Desktop Project Knowledge proposal path remains protected and uses add-or-supersede semantics", async () => {
  const core = await readFile("src/project/desktop-project-knowledge.ts", "utf8");
  assert.match(core, /Project Knowledge proposal preparation requires protected canonical state/);
  assert.match(core, /changeKind: current\.activeDecisionId \? "supersede" : "add"/);
  assert.match(core, /targetDecisionId: current\.activeDecisionId/);
  assert.match(core, /origin: "explicit-user"/);
});


test("Desktop renderer no longer promotes session-only values into confirmed Project Knowledge", async () => {
  const main = await readFile("apps/desktop/src/main.ts", "utf8");
  assert.match(main, /loadProjectKnowledge/);
  assert.match(main, /prepareProjectKnowledgeProposal/);
  assert.match(main, /Confirmed values on this page now come from the active project's canonical Project Brain/);
  assert.doesNotMatch(main, /area\.confirmedValue = proposal/);
  assert.match(main, /applyProjectKnowledgeSnapshot\(applied\.snapshot\)/);
  assert.match(main, /Project Brain apply needs attention/);
});


test("Desktop Project Knowledge protected apply remains Guardian-backed and re-reads canonical state", async () => {
  const core = await readFile("src/project/desktop-project-knowledge.ts", "utf8");
  const authorization = await readFile("src/runtime/authorization.ts", "utf8");
  const rust = await readFile("apps/desktop/src-tauri/src/project_knowledge_bridge.rs", "utf8");
  const main = await readFile("apps/desktop/src/main.ts", "utf8");

  assert.match(core, /runProtectedDoctor/);
  assert.match(core, /authorizeActionableProposal/);
  assert.match(core, /issueSemanticGuardianAuthority/);
  assert.match(core, /applyActionableProposal/);
  assert.match(core, /readDesktopProjectKnowledge/);
  assert.match(authorization, /same-principal local audit\/recovery intent only/);
  assert.match(rust, /operation remained bound to the original project; stale renderer result rejected/);
  assert.match(main, /applyProjectKnowledgeSnapshot\(applied\.snapshot\)/);
  assert.doesNotMatch(main, /area\.confirmedValue = proposal/);
});


test("Desktop protected Project Knowledge setup is fixed-path, per-machine and non-silent", async () => {
  const builder = await readFile("scripts/build-protected-bootstrap-assets.mjs", "utf8");
  const config = await readFile("apps/desktop/src-tauri/tauri.conf.json", "utf8");
  const hook = await readFile("apps/desktop/src-tauri/windows/language-hooks.nsh", "utf8");
  const rust = await readFile("apps/desktop/src-tauri/src/project_knowledge_bridge.rs", "utf8");
  const workflow = await readFile(".github/workflows/desktop-windows-installer.yml", "utf8");

  assert.match(builder, /guardian-bootstrap-desktop\.ps1/);
  assert.match(builder, /C:\\\\Program Files\\\\Livariant\\\\Desktop\\\\livariant-node\.exe/);
  assert.match(builder, /desktop-stage-a\.ps1/);
  assert.match(config, /"installMode": "perMachine"/);
  assert.match(hook, /StrCpy \$INSTDIR "\$PROGRAMFILES64\\Livariant\\Desktop"/);
  assert.match(hook, /C:\\Program Files\\Livariant\\Bootstrap\\v1\\bootstrap-release\.json/);
  assert.match(hook, /Existing protected bootstrap state is never silently replaced/);
  assert.match(workflow, /protected-bootstrap-assets/);
  assert.match(rust, /C:\\\\Program Files\\\\Livariant\\\\Bootstrap\\\\v1\\\\guardian-bootstrap-desktop\.ps1/);
  assert.match(rust, /guardian-bootstrap-required/);
  assert.match(rust, /rendererSuppliesExecutable": false/);
  assert.match(rust, /"uacRequired": true/);
});


test("canonical reads are blocked until protected integrity and initial acceptance is explicit", async () => {
  const core = await readFile("src/project/desktop-project-knowledge.ts", "utf8");
  const bridge = await readFile("apps/desktop/src/project-knowledge-bridge.ts", "utf8");
  const main = await readFile("apps/desktop/src/main.ts", "utf8");

  assert.match(core, /if \(!status\.canonicalReadReady\)/);
  assert.match(core, /integrity-acceptance-required/);
  assert.match(core, /confirmedDigest !== before\.integrity\.digest/);
  assert.match(core, /establishProtectedProjectBrainIntegrityState/);
  assert.match(bridge, /accept_project_knowledge_integrity/);
  assert.match(main, /Protect current Project Brain/);
  assert.match(main, /acceptProjectKnowledgeIntegrity\(digest\)/);
  assert.doesNotMatch(main, /projectKnowledgeProtection\.protectedSource/);
});
