import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject, recordAcceptedDecision, supersedeAcceptedDecision } from "../src/runtime/index.js";
import { buildConflictDriftAssessment, parseDriftObservation } from "../src/runtime/drift-assessment.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-drift-decision-"));
  try { await initializeProject(path, { authorized: true }); await run(path); }
  finally { await rm(path, { recursive: true, force: true }); }
}

function input(statement: string, evidenceClass: "dependent-current" | "historical" | "provider-observation", decisionId: string) {
  return parseDriftObservation({ schemaVersion: 1, domain: "project-decision", evidenceClass, statement, locator: "test-evidence", decisionId });
}

test("active decision assessment is deterministic and read-only", async () => {
  await withProject(async (path) => {
    let decision!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      decision = await recordAcceptedDecision("Use passkeys", path, { authorized: true });
    });
    const observation = input(decision.text, "dependent-current", decision.id);
    const before = await readFile(resolve(path, ".project-brain", "decisions.md"));
    const first = await buildConflictDriftAssessment(observation, path);
    const second = await buildConflictDriftAssessment(observation, path);
    assert.equal(first.state, "assessment");
    assert.equal(second.state, "assessment");
    if (first.state !== "assessment" || second.state !== "assessment") return;
    assert.equal(first.assessment.diagnosis, "consistent");
    assert.equal(first.assessment.assessmentId, second.assessment.assessmentId);
    assert.equal(first.assessment.actionability.mutationAuthorization, false);
    assert.equal(first.assessment.actionability.applySupported, false);
    assert.equal(first.assessment.changesMade, 0);
    assert.deepEqual(await readFile(resolve(path, ".project-brain", "decisions.md")), before);
  });
});

test("superseded decision separates current drift, history, and provider evidence", async () => {
  await withProject(async (path) => {
    let old!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      old = await recordAcceptedDecision("Use passwords", path, { authorized: true });
    });
    await mutateAcceptedFixture(path, () => supersedeAcceptedDecision({ decisionId: old.id, replacement: "Use passkeys" }, path, { authorized: true }));
    const current = await buildConflictDriftAssessment(input(old.text, "dependent-current", old.id), path);
    const historical = await buildConflictDriftAssessment(input(old.text, "historical", old.id), path);
    const provider = await buildConflictDriftAssessment(input(old.text, "provider-observation", old.id), path);
    assert.equal(current.state, "assessment");
    assert.equal(historical.state, "assessment");
    assert.equal(provider.state, "assessment");
    if (current.state !== "assessment" || historical.state !== "assessment" || provider.state !== "assessment") return;
    assert.equal(current.assessment.diagnosis, "confirmed-drift");
    assert.equal(historical.assessment.diagnosis, "historical-match");
    assert.equal(provider.assessment.diagnosis, "authority-ambiguous");
    assert.notEqual(current.assessment.assessmentId, historical.assessment.assessmentId);
  });
});
