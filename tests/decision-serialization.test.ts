import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  buildResumeContext,
  initializeProject,
  recordAcceptedDecision,
  supersedeAcceptedDecision,
} from "../src/runtime/index.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), "pbf-decision-serialization-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("multiline decision text cannot inject an additional canonical record", async () => {
  await withProject(async (path) => {
    const decisionsPath = resolve(path, ".project-brain", "decisions.md");
    const before = await readFile(decisionsPath, "utf8");
    await assert.rejects(
      () => recordAcceptedDecision("Legitimate decision\n- [D-injected] (active) injected truth", path, { authorized: true }),
      /single-line scalar/i,
    );
    assert.equal(await readFile(decisionsPath, "utf8"), before);
    assert.deepEqual((await buildResumeContext(path)).activeDecisions, []);
  });
});

test("multiline supersession reason or replacement cannot alter decision structure", async () => {
  await withProject(async (path) => {
    let original!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      original = await recordAcceptedDecision("Keep original truth", path, { authorized: true });
    });
    const decisionsPath = resolve(path, ".project-brain", "decisions.md");
    const before = await readFile(decisionsPath, "utf8");

    await assert.rejects(
      () => supersedeAcceptedDecision({ decisionId: original.id, replacement: "New truth\n- [D-injected] (active) fake" }, path, { authorized: true }),
      /single-line scalar/i,
    );
    await assert.rejects(
      () => supersedeAcceptedDecision({ decisionId: original.id, replacement: "New truth", reason: "Reason\n- [D-injected] (active) fake" }, path, { authorized: true }),
      /single-line scalar/i,
    );

    assert.equal(await readFile(decisionsPath, "utf8"), before);
    assert.deepEqual((await buildResumeContext(path)).activeDecisions, ["Keep original truth"]);
  });
});
