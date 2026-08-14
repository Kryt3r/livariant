import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import { processProviderReturn } from "../src/runtime/provider-return.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-provider-return-malformed-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("partial provider return fails closed before candidate or Authority handling", async () => {
  await withProject(async (path) => {
    const context = await buildProviderContext("codex", "Reject partial provider return", path);
    assert.equal(context.state, "ready");
    if (context.state !== "ready") return;

    const result = await processProviderReturn(context, {
      schemaVersion: 1,
      packetVersion: 1,
      provider: context.provider,
      contextPacketId: context.packetId,
      candidate: null,
    }, undefined, path);

    assert.equal(result.state, "mismatched-context");
    if (result.state !== "mismatched-context") return;
    assert.equal(result.phase, "provider-return");
    assert.equal(result.semanticChangesMade, 0);
    assert.match(result.message, /missing required field/i);
  });
});
