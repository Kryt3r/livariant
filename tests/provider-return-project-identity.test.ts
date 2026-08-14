import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import { processProviderReturn, providerReturnTaskDigest } from "../src/runtime/provider-return.js";

test("provider return from another logical Project Brain cannot cross project identity", async () => {
  const first = await mkdtemp(resolve(tmpdir(), "livariant-provider-return-project-a-"));
  const second = await mkdtemp(resolve(tmpdir(), "livariant-provider-return-project-b-"));
  try {
    await initializeProject(first, { authorized: true });
    await initializeProject(second, { authorized: true });
    const context = await buildProviderContext("claude-code", "Cross-project return test", first);
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
      candidate: null,
    };

    const result = await processProviderReturn(context, returned, undefined, second);
    assert.equal(result.state, "mismatched-context");
    if (result.state !== "mismatched-context") return;
    assert.equal(result.phase, "current-project");
    assert.equal(result.semanticChangesMade, 0);
  } finally {
    await rm(first, { recursive: true, force: true });
    await rm(second, { recursive: true, force: true });
  }
});
