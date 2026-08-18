import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { FRAMEWORK_VERSION } from "../src/lifecycle/state.js";
import { recordAcceptedProjectBrainState } from "../src/project-brain/integrity.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";
import { runDoctor as runLocalEvidenceDoctor } from "../src/runtime/doctor.js";
import { runProtectedDoctor } from "../src/runtime/protected-doctor.js";

test("protected doctor never treats same-user local integrity evidence alone as canonical health", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-protected-doctor-"));
  const project = resolve(root, "project");
  await mkdir(project);
  try {
    const store = new ProjectBrainStore(project);
    await store.bootstrap(
      {
        framework: { version: FRAMEWORK_VERSION, channel: "preview" },
        projectBrain: { schemaVersion: 2, projectId: randomUUID().toLowerCase() },
      },
      { projectName: "protected-doctor-test", evidence: [], unknowns: [] },
    );
    await recordAcceptedProjectBrainState(project, "manual-bootstrap");

    assert.equal((await runLocalEvidenceDoctor(project)).state, "healthy");
    const protectedReport = await runProtectedDoctor(project);
    assert.notEqual(protectedReport.state, "healthy");
    assert.ok(protectedReport.findings.some((finding) =>
      finding.code === "project-brain-integrity-unprotected"
      || finding.code === "project-brain-integrity-protected-invalid",
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
