import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { FRAMEWORK_VERSION } from "../src/lifecycle/state.js";
import {
  inspectProjectBrainIntegrity,
  recordAcceptedProjectBrainState,
} from "../src/project-brain/integrity.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";

async function bootstrap(project: string): Promise<void> {
  const store = new ProjectBrainStore(project);
  await store.bootstrap(
    {
      framework: { version: FRAMEWORK_VERSION, channel: "preview" },
      projectBrain: { schemaVersion: 2, projectId: randomUUID().toLowerCase() },
    },
    { projectName: "integrity-directory-race-test", evidence: [], unknowns: [] },
  );
}

test("concurrent integrity writers safely converge on one real machine-local directory chain", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-integrity-directory-race-"));
  const home = resolve(root, "home");
  const first = resolve(root, "project-a");
  const second = resolve(root, "project-b");
  await Promise.all([mkdir(home), mkdir(first), mkdir(second)]);

  try {
    await Promise.all([bootstrap(first), bootstrap(second)]);
    await Promise.all([
      recordAcceptedProjectBrainState(first, "manual-bootstrap", { homeDir: home }),
      recordAcceptedProjectBrainState(second, "manual-bootstrap", { homeDir: home }),
    ]);

    const [firstState, secondState] = await Promise.all([
      inspectProjectBrainIntegrity(first, { homeDir: home }),
      inspectProjectBrainIntegrity(second, { homeDir: home }),
    ]);
    assert.equal(firstState.state, "match");
    assert.equal(secondState.state, "match");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
