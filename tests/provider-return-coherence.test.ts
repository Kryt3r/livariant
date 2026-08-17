import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { addConfirmedGoal, initializeProject } from "../src/runtime/index.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import { processProviderReturn, providerReturnTaskDigest } from "../src/runtime/provider-return.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-provider-return-coherence-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("provider return candidate is not rebound when accepted Project Brain changes after current-context check", async () => {
  await withProject(async (path) => {
    const context = await buildProviderContext("codex", "Review one candidate", path);
    assert.equal(context.state, "ready");
    if (context.state !== "ready") return;

    const returned = {
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
        proposedStatement: "Old agent evidence must stay on its reviewed baseline",
        rationale: "Roundtrip coherence test",
        origin: "provider-observation",
      },
    };

    const result = await processProviderReturn(context, returned, undefined, path, {
      afterCurrentContextCheckBeforeMaintenance: async () => {
        await mutateAcceptedFixture(path, () => addConfirmedGoal("Concurrent canonical goal", path, { authorized: true }));
      },
    });

    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") return;
    assert.equal(result.phase, "maintenance");
    assert.equal(result.recoveryRequired, false);
    assert.equal(result.semanticChangesMade, 0);
    assert.match(result.message, /expected roundtrip context/i);
  });
});
