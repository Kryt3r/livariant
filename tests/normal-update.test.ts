import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyNormalUpdate,
  checkForUpdate,
  getStatus,
  initializeProject,
  planNormalUpdate,
  type ReleaseDescriptor,
} from "../src/runtime/index.js";
import { readActiveRuntimePointer } from "../src/distribution/runtime-installation.js";
import type { LocalReleaseArtifact } from "../src/distribution/release-integrity.js";
import { createRuntimePackageFixture, type RuntimePackageFixture } from "./runtime-package-fixture.js";
import {
  NORMAL_TARGET_VERSION,
  TEST_SOURCE_CHANNEL,
  TEST_SOURCE_VERSION,
} from "./release-test-baseline.js";

const normalArtifactPath = fileURLToPath(new URL("../../tests/fixtures/releases/runtime-normal.artifact", import.meta.url));
const projectOwnedBrainFiles = ["project.md", "goals.md", "decisions.md", "knowledge.md"] as const;
const trustedSourceIds = new Set(["official-local-test-source"]);
const normalDigest = "92aec86650434112d3e4655385deaa9aa633330af26ad7cff6e8697c8b01cbca";
const targetVersion = NORMAL_TARGET_VERSION;

function localArtifact(overrides: Partial<LocalReleaseArtifact> = {}): LocalReleaseArtifact {
  return { sourceId: "official-local-test-source", releaseVersion: targetVersion, artifactId: "runtime-node-cli", path: normalArtifactPath, ...overrides };
}
function descriptor(version: string, channel: "stable" | "preview" | "development" = TEST_SOURCE_CHANNEL): ReleaseDescriptor {
  return { version, channel, projectBrainSchema: 2, compatibility: { from: [TEST_SOURCE_VERSION] }, sourceId: "official-local-test-source", artifact: { id: "runtime-node-cli", sha256: normalDigest } };
}
function installedRelease(fixture: RuntimePackageFixture): ReleaseDescriptor {
  return { version: targetVersion, channel: TEST_SOURCE_CHANNEL, projectBrainSchema: 2, compatibility: { from: [TEST_SOURCE_VERSION] }, sourceId: "official-local-test-source", artifact: { id: "runtime-node-cli", sha256: fixture.sha256 } };
}
function installedArtifact(fixture: RuntimePackageFixture, overrides: Partial<LocalReleaseArtifact> = {}): LocalReleaseArtifact {
  return { sourceId: "official-local-test-source", releaseVersion: targetVersion, artifactId: "runtime-node-cli", path: fixture.path, ...overrides };
}
async function withRuntimeRelease(run: (fixture: RuntimePackageFixture, release: ReleaseDescriptor) => Promise<void>): Promise<void> {
  const fixture = await createRuntimePackageFixture(targetVersion); try { await run(fixture, installedRelease(fixture)); } finally { await fixture.cleanup(); }
}
async function loadReleases(): Promise<ReleaseDescriptor[]> { return [descriptor(targetVersion)]; }
async function withInitializedProject(run: (projectPath: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "pbf-normal-update-")); try { await initializeProject(projectPath, { authorized: true }); await run(projectPath); } finally { await rm(projectPath, { recursive: true, force: true }); }
}
async function snapshotProjectOwnedBrain(projectPath: string): Promise<Map<string, Buffer>> { const snapshot = new Map<string, Buffer>(); for (const file of projectOwnedBrainFiles) snapshot.set(file, await readFile(resolve(projectPath, ".project-brain", file))); return snapshot; }

test("normal update discovery is read-only and channel-scoped", async () => {
  await withInitializedProject(async (projectPath) => {
    const releases = await loadReleases(); const beforeMetadata = await readFile(resolve(projectPath, ".project-brain", "metadata.json")); const beforeOwned = await snapshotProjectOwnedBrain(projectPath); const check = await checkForUpdate(projectPath, releases);
    assert.equal(check.installedVersion, TEST_SOURCE_VERSION); assert.equal(check.availableVersion, targetVersion); assert.equal(check.channel, TEST_SOURCE_CHANNEL); assert.equal(check.compatibility, "compatible"); assert.equal(check.migrationRequired, false); assert.equal(check.availableRelease?.sourceId, "official-local-test-source"); assert.equal(check.availableRelease?.artifactSha256, normalDigest); assert.deepEqual(await readFile(resolve(projectPath, ".project-brain", "metadata.json")), beforeMetadata);
    const afterOwned = await snapshotProjectOwnedBrain(projectPath); for (const file of projectOwnedBrainFiles) assert.deepEqual(afterOwned.get(file), beforeOwned.get(file));
  });
});

test("same, older, wrong-channel, and malformed releases are not offered as normal updates", async () => {
  const wrongChannel = TEST_SOURCE_CHANNEL === "preview" ? "development" : "preview";
  await withInitializedProject(async (projectPath) => { const releases: ReleaseDescriptor[] = [descriptor(TEST_SOURCE_VERSION),descriptor("0.0.0-alpha.1"),descriptor("not-semver"),descriptor(targetVersion, wrongChannel)]; const check=await checkForUpdate(projectPath,releases); assert.equal(check.availableVersion,undefined); assert.equal(check.compatibility,"none"); assert.equal(await planNormalUpdate(projectPath,releases),null); });
});

test("normal update plan binds exact release source, artifact identity, and digest", async () => {
  await withInitializedProject(async (projectPath) => { const plan=await planNormalUpdate(projectPath,await loadReleases()); assert.ok(plan); assert.equal(plan.sourceVersion,TEST_SOURCE_VERSION); assert.equal(plan.targetVersion,targetVersion); assert.equal(plan.sourceId,"official-local-test-source"); assert.equal(plan.artifactId,"runtime-node-cli"); assert.equal(plan.artifactSha256,normalDigest); assert.equal(plan.migrationRequired,false); assert.equal(plan.projectImpact,"none"); assert.equal(plan.checkpointRequired,false); assert.equal(plan.authorizationRequired,true); assert.deepEqual(plan.effects,["framework-release-state"]); });
});

test("correct installable artifact never replaces explicit authorization", async () => {
  await withRuntimeRelease(async (fixture,release)=>{await withInitializedProject(async(projectPath)=>{const plan=await planNormalUpdate(projectPath,[release]); assert.ok(plan); await assert.rejects(()=>applyNormalUpdate(projectPath,plan,{authorized:false,artifact:installedArtifact(fixture),trustedSourceIds}),/authorization/i); assert.equal((await getStatus(projectPath)).frameworkVersion,TEST_SOURCE_VERSION); assert.equal(await readActiveRuntimePointer(projectPath),null);});});
});

test("tampered artifact and unexpected source fail before runtime installation or project activation", async () => {
  await withRuntimeRelease(async(fixture,release)=>{await withInitializedProject(async(projectPath)=>{const plan=await planNormalUpdate(projectPath,[release]); assert.ok(plan); const beforeOwned=await snapshotProjectOwnedBrain(projectPath); const tamperedPath=resolve(projectPath,"tampered-release.tgz"); await writeFile(tamperedPath,"tampered bytes\n","utf8"); await assert.rejects(()=>applyNormalUpdate(projectPath,plan,{authorized:true,artifact:installedArtifact(fixture,{path:tamperedPath}),trustedSourceIds}),/integrity verification failed/i); assert.equal(await readActiveRuntimePointer(projectPath),null); await assert.rejects(()=>applyNormalUpdate(projectPath,plan,{authorized:true,artifact:installedArtifact(fixture,{sourceId:"unexpected-mirror"}),trustedSourceIds}),/source does not match/i); assert.equal(await readActiveRuntimePointer(projectPath),null); assert.equal((await getStatus(projectPath)).frameworkVersion,TEST_SOURCE_VERSION); const afterOwned=await snapshotProjectOwnedBrain(projectPath); for(const file of projectOwnedBrainFiles) assert.deepEqual(afterOwned.get(file),beforeOwned.get(file));});});
});

test("target release activates only after a real installed Runtime attests the target identity", async () => {
  await withRuntimeRelease(async(fixture,release)=>{await withInitializedProject(async(projectPath)=>{const plan=await planNormalUpdate(projectPath,[release]); assert.ok(plan); const beforeOwned=await snapshotProjectOwnedBrain(projectPath); await applyNormalUpdate(projectPath,plan,{authorized:true,artifact:installedArtifact(fixture),trustedSourceIds}); const active=await readActiveRuntimePointer(projectPath); assert.equal(active?.version,targetVersion); assert.match(active?.cliPath??"",/node_modules[\\/]livariant[\\/]/); const status=await getStatus(projectPath); assert.equal(status.frameworkVersion,targetVersion); assert.equal(status.channel,TEST_SOURCE_CHANNEL); const afterOwned=await snapshotProjectOwnedBrain(projectPath); for(const file of projectOwnedBrainFiles) assert.deepEqual(afterOwned.get(file),beforeOwned.get(file));});});
});

test("stale normal update plans cannot reinstall or overwrite newer active release state", async () => {
  await withRuntimeRelease(async(fixture,release)=>{await withInitializedProject(async(projectPath)=>{const plan=await planNormalUpdate(projectPath,[release]); assert.ok(plan); const options={authorized:true,artifact:installedArtifact(fixture),trustedSourceIds} as const; await applyNormalUpdate(projectPath,plan,options); await assert.rejects(()=>applyNormalUpdate(projectPath,plan,options),/stale/i);});});
});

test("a preservation failure before the Project pin commit cannot half-activate the target release", async () => {
  await withRuntimeRelease(async (fixture, release) => {
    await withInitializedProject(async (projectPath) => {
      const plan = await planNormalUpdate(projectPath, [release]);
      assert.ok(plan);
      const knowledgePath = resolve(projectPath, ".project-brain", "knowledge.md");
      const originalKnowledge = await readFile(knowledgePath, "utf8");
      const concurrentKnowledge = `${originalKnowledge}\nConcurrent project-owned change\n`;

      await assert.rejects(
        () => applyNormalUpdate(projectPath, plan, {
          authorized: true,
          artifact: installedArtifact(fixture),
          trustedSourceIds,
          beforePinCommit: async () => {
            await writeFile(knowledgePath, concurrentKnowledge, "utf8");
          },
        }),
        /project-owned Project Brain file changed: knowledge\.md/i,
      );

      const status = await getStatus(projectPath);
      assert.equal(status.frameworkVersion, plan.sourceVersion);
      assert.equal(status.lifecycle, "initialized");
      assert.equal(await readActiveRuntimePointer(projectPath), null);
      assert.equal(await readFile(knowledgePath, "utf8"), concurrentKnowledge);
    });
  });
});
