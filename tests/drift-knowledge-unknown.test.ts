import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { buildConflictDriftAssessment, parseDriftObservation } from "../src/runtime/drift-assessment.js";
import { acceptFixtureProjectBrain } from "./accepted-project-brain-fixture.js";

test("unresolved knowledge is not promoted to confirmed truth", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-drift-unknown-"));
  try {
    await initializeProject(path, { authorized: true });
    await writeFile(resolve(path, ".project-brain", "knowledge.md"), "# Knowledge\n\n## Known unknowns\n\n- Deployment region\n", "utf8");
    await acceptFixtureProjectBrain(path);
    const observation = parseDriftObservation({ schemaVersion: 1, domain: "project-knowledge", evidenceClass: "dependent-current", statement: "Deployment region", locator: "knowledge-surface" });
    const result = await buildConflictDriftAssessment(observation, path);
    assert.equal(result.state, "assessment");
    if (result.state !== "assessment") return;
    assert.equal(result.assessment.diagnosis, "authority-ambiguous");
  } finally { await rm(path, { recursive: true, force: true }); }
});
