import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/project/initialization.js";
import {
  prepareDesktopProjectKnowledgeProposal,
  readDesktopProjectKnowledge,
} from "../src/project/desktop-project-knowledge.js";
import { recordAcceptedDecision } from "../src/project-brain/decisions-write.js";

test("Desktop Project Knowledge reads only tagged active Project Brain decisions", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-project-knowledge-"));
  try {
    await writeFile(resolve(path, "package.json"), JSON.stringify({ name: "desktop-project-knowledge-test" }));
    await initializeProject(path, { authorized: true });
    await recordAcceptedDecision("Project purpose: Keep project truth explicit", path, { authorized: true });
    await recordAcceptedDecision("Unrelated accepted decision", path, { authorized: true });

    const snapshot = await readDesktopProjectKnowledge(path);
    const purpose = snapshot.areas.find((area) => area.id === "purpose");
    assert.equal(purpose?.state, "confirmed");
    assert.equal(purpose?.confirmedValue, "Keep project truth explicit");
    assert.equal(snapshot.boundaries.rendererOwnsTruth, false);
    assert.equal(snapshot.boundaries.performsSemanticApply, false);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});

test("Desktop Project Knowledge prepares add then supersede proposals without mutation", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-project-knowledge-proposal-"));
  try {
    await writeFile(resolve(path, "package.json"), JSON.stringify({ name: "desktop-project-knowledge-proposal-test" }));
    await initializeProject(path, { authorized: true });

    const add = await prepareDesktopProjectKnowledgeProposal(path, { areaId: "direction", value: "Ship a clear first release" });
    assert.equal(add.proposal.mutationScope.domain, "project-decision");
    assert.equal(add.proposal.mutationScope.changeKind, "add");
    assert.equal(add.proposal.mutationScope.proposedStatement, "Current direction: Ship a clear first release");

    const decisionsBefore = await readFile(resolve(path, ".project-brain", "decisions.md"), "utf8");
    assert.doesNotMatch(decisionsBefore, /Current direction:/);

    await recordAcceptedDecision("Current direction: Stabilize onboarding", path, { authorized: true });
    const supersede = await prepareDesktopProjectKnowledgeProposal(path, { areaId: "direction", value: "Ship the public release" });
    assert.equal(supersede.proposal.mutationScope.changeKind, "supersede");
    assert.ok(supersede.proposal.mutationScope.targetDecisionId);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});


test("Desktop renderer no longer promotes session-only values into confirmed Project Knowledge", async () => {
  const main = await readFile("apps/desktop/src/main.ts", "utf8");
  assert.match(main, /loadProjectKnowledge/);
  assert.match(main, /prepareProjectKnowledgeProposal/);
  assert.match(main, /Confirmed values on this page now come from the active project's canonical Project Brain/);
  assert.doesNotMatch(main, /area\.confirmedValue = proposal/);
  assert.match(main, /no canonical write has happened yet/i);
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
