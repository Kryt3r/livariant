import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import { processProviderReturn, providerReturnTaskDigest } from "../src/runtime/provider-return.js";

function noCandidateReturn(context: Awaited<ReturnType<typeof buildProviderContext>>) {
  assert.equal(context.state, "ready");
  if (context.state !== "ready") throw new Error("expected ready Provider Context");
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

test("provider sessions bind independently to their actual project and never to Desktop UI selection", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-provider-project-session-"));
  const projectA = resolve(root, "project-a");
  const projectB = resolve(root, "project-b");
  const sessionA1 = randomUUID().toLowerCase();
  const sessionA2 = randomUUID().toLowerCase();
  const sessionB1 = randomUUID().toLowerCase();

  try {
    await mkdir(projectA);
    await mkdir(projectB);
    await initializeProject(projectA, { authorized: true });
    await initializeProject(projectB, { authorized: true });

    const contextA1 = await buildProviderContext("codex", "Work in project A", projectA, { providerSessionId: sessionA1 });
    const contextB1 = await buildProviderContext("codex", "Work in project B", projectB, { providerSessionId: sessionB1 });
    const contextA2 = await buildProviderContext("codex", "Work in project A", projectA, { providerSessionId: sessionA2 });

    assert.equal(contextA1.state, "ready");
    assert.equal(contextB1.state, "ready");
    assert.equal(contextA2.state, "ready");
    if (contextA1.state !== "ready" || contextB1.state !== "ready" || contextA2.state !== "ready") return;

    assert.deepEqual(contextA1.providerSession, { id: sessionA1, source: "mcp-session" });
    assert.deepEqual(contextB1.providerSession, { id: sessionB1, source: "mcp-session" });
    assert.deepEqual(contextA2.providerSession, { id: sessionA2, source: "mcp-session" });
    assert.notEqual(contextA1.stableProjectIdentity, contextB1.stableProjectIdentity);
    assert.equal(contextA1.stableProjectIdentity, contextA2.stableProjectIdentity);
    assert.notEqual(contextA1.packetId, contextA2.packetId);

    const acceptedA = await processProviderReturn(contextA1, noCandidateReturn(contextA1), undefined, projectA);
    assert.equal(acceptedA.state, "no-candidate");

    const wrongProject = await processProviderReturn(contextA1, noCandidateReturn(contextA1), undefined, projectB);
    assert.equal(wrongProject.state, "mismatched-context");
    if (wrongProject.state === "mismatched-context") {
      assert.equal(wrongProject.phase, "current-project");
      assert.match(wrongProject.message, /different logical Project Brain identity/i);
    }

    const acceptedB = await processProviderReturn(contextB1, noCandidateReturn(contextB1), undefined, projectB);
    assert.equal(acceptedB.state, "no-candidate");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("provider session id must be canonical and cannot be supplied as arbitrary routing text", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-provider-project-session-invalid-"));
  try {
    await initializeProject(root, { authorized: true });
    await assert.rejects(
      () => buildProviderContext("codex", "task", root, { providerSessionId: "project-a" }),
      /canonical UUID/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
