import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import { processProviderReturn, providerReturnTaskDigest } from "../src/runtime/provider-return.js";

async function registry(
  path: string,
  projects: Array<{ desktopProjectId: string; localRoot: string }>,
  desktopProjectId: string,
  activationId: string,
): Promise<void> {
  await writeFile(path, JSON.stringify({
    schemaVersion: 1,
    lastActiveDesktopProjectId: desktopProjectId,
    providerActivation: {
      desktopProjectId,
      activationId,
      processId: process.pid,
    },
    projects: projects.map((project) => ({
      desktopProjectId: project.desktopProjectId,
      displayName: project.desktopProjectId,
      localRoot: project.localRoot,
      projectId: null,
      stableProjectIdentity: null,
      state: "registered",
    })),
    legacyMigration: { state: "not-needed" },
  }, null, 2), "utf8");
}

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

test("Desktop A-B-A activation epochs bind Provider Context and reject stale A roundtrips", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-provider-desktop-coordination-"));
  const projectA = resolve(root, "project-a");
  const projectB = resolve(root, "project-b");
  const registryPath = resolve(root, "registry.json");
  const desktopA = randomUUID().toLowerCase();
  const desktopB = randomUUID().toLowerCase();
  const activationA1 = randomUUID().toLowerCase();
  const activationB = randomUUID().toLowerCase();
  const activationA2 = randomUUID().toLowerCase();

  try {
    await mkdir(projectA);
    await mkdir(projectB);
    await initializeProject(projectA, { authorized: true });
    await initializeProject(projectB, { authorized: true });
    const projects = [
      { desktopProjectId: desktopA, localRoot: projectA },
      { desktopProjectId: desktopB, localRoot: projectB },
    ];

    await registry(registryPath, projects, desktopA, activationA1);
    const contextA1 = await buildProviderContext("codex", "Work on project A", projectA, { desktopRegistryPath: registryPath });
    assert.equal(contextA1.state, "ready");
    if (contextA1.state !== "ready") return;
    assert.deepEqual(contextA1.desktopActivation, { desktopProjectId: desktopA, activationId: activationA1 });

    await registry(registryPath, projects, desktopB, activationB);
    await assert.rejects(
      () => buildProviderContext("codex", "Old A session asks again", projectA, { desktopRegistryPath: registryPath }),
      /different project active/i,
    );
    const contextB = await buildProviderContext("codex", "Work on project B", projectB, { desktopRegistryPath: registryPath });
    assert.equal(contextB.state, "ready");
    if (contextB.state !== "ready") return;
    assert.deepEqual(contextB.desktopActivation, { desktopProjectId: desktopB, activationId: activationB });

    await registry(registryPath, projects, desktopA, activationA2);
    const staleA = await processProviderReturn(
      contextA1,
      noCandidateReturn(contextA1),
      undefined,
      projectA,
      { desktopRegistryPath: registryPath },
    );
    assert.equal(staleA.state, "mismatched-context");
    if (staleA.state === "mismatched-context") {
      assert.equal(staleA.phase, "current-project");
      assert.match(staleA.message, /predates the current Livariant Desktop project activation/i);
    }

    const contextA2 = await buildProviderContext("codex", "Return to project A", projectA, { desktopRegistryPath: registryPath });
    assert.equal(contextA2.state, "ready");
    if (contextA2.state !== "ready") return;
    assert.deepEqual(contextA2.desktopActivation, { desktopProjectId: desktopA, activationId: activationA2 });
    assert.notEqual(contextA2.packetId, contextA1.packetId);

    const acceptedA2 = await processProviderReturn(
      contextA2,
      noCandidateReturn(contextA2),
      undefined,
      projectA,
      { desktopRegistryPath: registryPath },
    );
    assert.equal(acceptedA2.state, "no-candidate");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
