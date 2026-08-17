import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { addConfirmedKnowledge, initializeProject } from "../src/runtime/index.js";
import { buildConflictDriftAssessment, parseDriftObservation } from "../src/runtime/drift-assessment.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

async function withProject(run: (path: string) => Promise<void>) {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-drift-knowledge-"));
  try { await initializeProject(path, { authorized: true }); await run(path); }
  finally { await rm(path, { recursive: true, force: true }); }
}

function observation(statement: string) {
  return parseDriftObservation({ schemaVersion: 1, domain: "project-knowledge", evidenceClass: "dependent-current", statement, locator: "knowledge-surface" });
}

test("knowledge matching stays deterministic", async () => {
  await withProject(async (path) => {
    await mutateAcceptedFixture(path, () => addConfirmedKnowledge("Runtime uses Node", path, { authorized: true }));
    const exact = await buildConflictDriftAssessment(observation("Runtime uses Node"), path);
    const different = await buildConflictDriftAssessment(observation("Runtime uses another engine"), path);
    assert.equal(exact.state, "assessment");
    assert.equal(different.state, "assessment");
    if (exact.state !== "assessment" || different.state !== "assessment") return;
    assert.equal(exact.assessment.diagnosis, "consistent");
    assert.equal(different.assessment.diagnosis, "insufficient-evidence");
  });
});
