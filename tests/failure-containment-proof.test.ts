import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { addConfirmedGoal, initializeProject } from "../src/runtime/index.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import {
  processProviderReturn,
  providerReturnTaskDigest,
} from "../src/runtime/provider-return.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

const managedFiles = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"];

async function captureManaged(path: string): Promise<Map<string, Buffer>> {
  return new Map(
    await Promise.all(
      managedFiles.map(async (name) => [name, await readFile(resolve(path, ".project-brain", name))] as const),
    ),
  );
}

async function assertManagedUnchanged(path: string, before: Map<string, Buffer>): Promise<void> {
  for (const name of managedFiles) {
    assert.deepEqual(await readFile(resolve(path, ".project-brain", name)), before.get(name));
  }
}

test("proof: stale agent evidence cannot silently become Project Truth or self-authorize mutation", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-failure-containment-proof-"));

  try {
    await initializeProject(path, { authorized: true });
    await mutateAcceptedFixture(path, () =>
      addConfirmedGoal("Keep the accepted architecture direction", path, { authorized: true }),
    );

    const context = await buildProviderContext(
      "codex",
      "Review a proposed durable project change against current Project Truth",
      path,
    );
    assert.equal(context.state, "ready");
    if (context.state !== "ready") return;

    const returnedCandidate = {
      schemaVersion: 1,
      packetVersion: 1,
      provider: context.provider,
      contextPacketId: context.packetId,
      stableProjectIdentity: context.stableProjectIdentity,
      baselineDigest: context.baseline.digest,
      taskDigest: providerReturnTaskDigest(context.task.value),
      candidate: {
        schemaVersion: 1,
        domain: "project-goal",
        changeKind: "add",
        proposedStatement: "Replace the accepted architecture direction with the stale agent assumption",
        rationale: "The agent believes an older assumption should become durable project state.",
        origin: "provider-observation",
      },
    };

    const beforeUnauthorizedAttempt = await captureManaged(path);
    const unauthorized = await processProviderReturn(context, returnedCandidate, undefined, path);

    assert.equal(unauthorized.state, "candidate-received");
    if (unauthorized.state !== "candidate-received") return;
    assert.equal(unauthorized.maintenance.state, "authorization-required");
    assert.equal(unauthorized.semanticChangesMade, 0);
    await assertManagedUnchanged(path, beforeUnauthorizedAttempt);

    await mutateAcceptedFixture(path, () =>
      addConfirmedGoal("Newer accepted canonical change", path, { authorized: true }),
    );

    const beforeStaleAttempt = await captureManaged(path);
    const stale = await processProviderReturn(context, returnedCandidate, undefined, path);

    assert.equal(stale.state, "stale-context");
    assert.equal(stale.semanticChangesMade, 0);
    await assertManagedUnchanged(path, beforeStaleAttempt);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
