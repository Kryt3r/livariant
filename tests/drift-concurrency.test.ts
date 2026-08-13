import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { buildConflictDriftAssessment, parseDriftObservation } from "../src/runtime/drift-assessment.js";

test("managed state change during assessment fails closed", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-drift-race-"));
  try {
    await initializeProject(path, { authorized: true });
    const observation = parseDriftObservation({ schemaVersion: 1, domain: "project-goal", evidenceClass: "dependent-current", statement: "Ship preview", locator: "goal-surface" });
    const result = await buildConflictDriftAssessment(observation, path, {
      beforeRevalidate: async () => {
        await writeFile(resolve(path, ".project-brain", "goals.md"), "# Goals\n\n- Changed concurrently\n", "utf8");
      },
    });
    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") return;
    assert.ok(result.findings.some((finding) => "code" in finding && finding.code === "assessment-concurrent-change"));
  } finally { await rm(path, { recursive: true, force: true }); }
});
