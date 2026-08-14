import assert from "node:assert/strict";
import test from "node:test";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import { initializeProject } from "../src/runtime/index.js";
import { parseSuppliedReadyProviderContext } from "../src/runtime/provider-return.js";
import { PROVIDER_CONTEXT_TASK_MAX_BYTES } from "../src/runtime/provider-context-task.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-provider-return-shape-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("ready Provider Context copy rejects structurally invalid evidence", async () => {
  await withProject(async (path) => {
    const context = await buildProviderContext("codex", "Validate copied evidence shape", path);
    assert.equal(context.state, "ready");
    if (context.state !== "ready") return;

    assert.throws(() => parseSuppliedReadyProviderContext({
      ...context,
      evidence: { fabricated: true },
    }), /evidence/i);
  });
});

test("ready Provider Context copy preserves original task bounds", async () => {
  await withProject(async (path) => {
    const context = await buildProviderContext("codex", "Validate copied task bounds", path);
    assert.equal(context.state, "ready");
    if (context.state !== "ready") return;

    assert.throws(() => parseSuppliedReadyProviderContext({
      ...context,
      task: {
        value: "x".repeat(PROVIDER_CONTEXT_TASK_MAX_BYTES + 1),
        authorityClass: "session-ephemeral",
      },
    }), /task input exceeds the supported size limit/i);
  });
});

test("schema-valid copied evidence remains acceptable without becoming trusted issuance proof", async () => {
  await withProject(async (path) => {
    const context = await buildProviderContext("codex", "Validate copied evidence shape", path);
    assert.equal(context.state, "ready");
    if (context.state !== "ready") return;

    const parsed = parseSuppliedReadyProviderContext({
      ...context,
      generatedAt: "1970-01-01T00:00:00.000Z",
      frameworkVersion: "fabricated-but-schema-valid-copy",
      projectLocator: "/untrusted/copied/locator",
      evidence: {
        projectIdentity: [{ value: "Fabricated copy text", authorityClass: "canonical-project" }],
        confirmedGoals: [],
        activeDecisions: [],
        knownFacts: [],
        unresolvedUnknowns: [{ value: "Fabricated unresolved copy text", authorityClass: "unresolved-project" }],
      },
    });

    assert.equal(parsed.packetId, context.packetId);
    assert.equal(parsed.stableProjectIdentity, context.stableProjectIdentity);
    assert.equal(parsed.baseline.digest, context.baseline.digest);
  });
});
