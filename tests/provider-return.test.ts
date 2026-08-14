import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { addConfirmedGoal, initializeProject } from "../src/runtime/index.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import {
  processProviderReturn,
  providerReturnTaskDigest,
} from "../src/runtime/provider-return.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-provider-return-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

async function readyContext(path: string, task: string = "Review durable project changes") {
  const context = await buildProviderContext("codex", task, path);
  assert.equal(context.state, "ready");
  if (context.state !== "ready") throw new Error("expected ready provider context");
  return context;
}

function noCandidateReturn(context: Awaited<ReturnType<typeof readyContext>>) {
  return {
    schemaVersion: 1,
    packetVersion: 1,
    provider: context.provider,
    contextPacketId: context.packetId,
    stableProjectIdentity: context.stableProjectIdentity,
    baselineDigest: context.baseline.digest,
    taskDigest: providerReturnTaskDigest(context.task.value),
    candidate: null,
  };
}

function goalCandidate(statement: string) {
  return {
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Agent observed an explicit durable goal candidate.",
    origin: "provider-observation",
  };
}

test("matching provider return with no candidate is read-only", async () => {
  await withProject(async (path) => {
    const context = await readyContext(path);
    const result = await processProviderReturn(context, noCandidateReturn(context), undefined, path);
    assert.equal(result.state, "no-candidate");
    assert.equal(result.semanticChangesMade, 0);
  });
});

test("matching typed provider candidate without authorization reaches maintenance but cannot mutate", async () => {
  await withProject(async (path) => {
    const context = await readyContext(path);
    const returned = { ...noCandidateReturn(context), candidate: goalCandidate("Ship provider roundtrip evidence") };
    const result = await processProviderReturn(context, returned, undefined, path);
    assert.equal(result.state, "candidate-received");
    if (result.state !== "candidate-received") return;
    assert.equal(result.maintenance.state, "authorization-required");
    assert.equal(result.semanticChangesMade, 0);
  });
});

test("stale provider context is classified before returned candidate is rebound", async () => {
  await withProject(async (path) => {
    const context = await readyContext(path);
    await addConfirmedGoal("Concurrent canonical change", path, { authorized: true });
    const returned = { ...noCandidateReturn(context), candidate: goalCandidate("Stale agent candidate") };
    const result = await processProviderReturn(context, returned, undefined, path);
    assert.equal(result.state, "stale-context");
    assert.equal(result.semanticChangesMade, 0);
  });
});

test("return packet must match provider context correlation material", async () => {
  await withProject(async (path) => {
    const context = await readyContext(path);
    const wrongProvider = { ...noCandidateReturn(context), provider: "claude-code" };
    const wrongTask = { ...noCandidateReturn(context), taskDigest: "0".repeat(64) };
    const wrongPacket = { ...noCandidateReturn(context), contextPacketId: `pcx_${"0".repeat(64)}` };

    for (const returned of [wrongProvider, wrongTask, wrongPacket]) {
      const result = await processProviderReturn(context, returned, undefined, path);
      assert.equal(result.state, "mismatched-context");
      assert.equal(result.semanticChangesMade, 0);
    }
  });
});

test("provider context packet id is recomputed instead of trusted", async () => {
  await withProject(async (path) => {
    const context = await readyContext(path);
    const forgedContext = { ...context, packetId: `pcx_${"0".repeat(64)}` };
    const returned = { ...noCandidateReturn(context), contextPacketId: forgedContext.packetId };
    const result = await processProviderReturn(forgedContext, returned, undefined, path);
    assert.equal(result.state, "mismatched-context");
    if (result.state !== "mismatched-context") return;
    assert.equal(result.phase, "context-copy");
  });
});

test("fully fabricated self-consistent context bytes still cannot manufacture authority", async () => {
  await withProject(async (path) => {
    const genuine = await readyContext(path, "Fabricated wrapper test");
    const fabricated = {
      ...genuine,
      generatedAt: "1970-01-01T00:00:00.000Z",
      frameworkVersion: "fabricated-untrusted-copy",
      projectLocator: "/fabricated/location",
      evidence: {
        projectIdentity: [{ value: "Fabricated project identity evidence", authorityClass: "canonical-project" }],
        confirmedGoals: [{ value: "Fabricated goal evidence", authorityClass: "canonical-project" }],
        activeDecisions: [],
        knownFacts: [],
        unresolvedUnknowns: [{ value: "Fabricated unresolved evidence", authorityClass: "unresolved-project" }],
      },
    };
    const returned = {
      ...noCandidateReturn(genuine),
      candidate: goalCandidate("Fabricated packet cannot approve this candidate"),
    };
    const result = await processProviderReturn(fabricated, returned, undefined, path);
    assert.equal(result.state, "candidate-received");
    if (result.state !== "candidate-received") return;
    assert.equal(result.maintenance.state, "authorization-required");
    assert.equal(result.semanticChangesMade, 0);
  });
});

test("approval smuggling fields are rejected rather than strengthening provider return", async () => {
  await withProject(async (path) => {
    const context = await readyContext(path);
    const returned = {
      ...noCandidateReturn(context),
      candidate: goalCandidate("Smuggled approval must fail"),
      approved: true,
      mutationAuthorization: true,
    };
    const result = await processProviderReturn(context, returned, undefined, path);
    assert.equal(result.state, "mismatched-context");
    if (result.state !== "mismatched-context") return;
    assert.equal(result.phase, "provider-return");
    assert.equal(result.semanticChangesMade, 0);
  });
});

test("blocked provider context cannot be used as a ready roundtrip root", async () => {
  await withProject(async (path) => {
    const context = await readyContext(path);
    const blocked = { ...context, state: "blocked", safetyState: "blocked" };
    const result = await processProviderReturn(blocked, noCandidateReturn(context), undefined, path);
    assert.equal(result.state, "mismatched-context");
    if (result.state !== "mismatched-context") return;
    assert.equal(result.phase, "context-copy");
  });
});
