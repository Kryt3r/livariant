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
