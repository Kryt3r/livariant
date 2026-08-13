import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { addConfirmedGoal, initializeProject } from "../src/runtime/index.js";
import { buildConflictDriftAssessment, parseDriftObservation } from "../src/runtime/drift-assessment.js";

async function withProject(run: (path: string) => Promise<void>) {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-drift-goal-"));
  try { await initializeProject(path, { authorized: true }); await run(path); }
  finally { await rm(path, { recursive: true, force: true }); }
}

function observation(statement: string) {
  return parseDriftObservation({ schemaVersion: 1, domain: "project-goal", evidenceClass: "dependent-current", statement, locator: "goal-surface" });
}

test("goal exact match and different text stay distinct", async () => {
  await withProject(async (path) => {
    await addConfirmedGoal("Ship a safe preview", path, { authorized: true });
    const exact = await buildConflictDriftAssessment(observation("Ship a safe preview"), path);
    const different = await buildConflictDriftAssessment(observation("Ship a public beta"), path);
    assert.equal(exact.state, "assessment");
    assert.equal(different.state, "assessment");
    if (exact.state !== "assessment" || different.state !== "assessment") return;
    assert.equal(exact.assessment.diagnosis, "consistent");
    assert.equal(different.assessment.diagnosis, "insufficient-evidence");
  });
});
