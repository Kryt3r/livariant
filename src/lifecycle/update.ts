import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ProjectBrainStore } from "../project-brain/store.js";
import {
  isSha256,
  type LocalReleaseArtifact,
  type ReleaseArtifactDescriptor,
  type ReleaseChannel,
  type ReleaseIdentity,
} from "../distribution/release-integrity.js";
import {
  activateInstalledRuntime,
  installVerifiedRuntime,
  readActiveRuntimePointer,
  restoreActiveRuntimePointer,
} from "../distribution/runtime-installation.js";
import { assertLifecycleQuiescent } from "./guard.js";

export interface ReleaseDescriptor {
  version: string;
  channel: ReleaseChannel;
  projectBrainSchema: number;
  compatibility: {
    from: string[];
  };
  sourceId: string;
  artifact: ReleaseArtifactDescriptor;
}

export interface UpdateCheck {
  installedVersion: string;
  installedSchema: number;
  channel: ReleaseChannel;
  availableVersion?: string;
  availableRelease?: ReleaseIdentity;
  compatibility: "compatible" | "none";
  migrationRequired: boolean;
}

export interface UpdatePlan extends ReleaseIdentity {
  sourceVersion: string;
  targetVersion: string;
  compatibility: "compatible";
  migrationRequired: false;
  projectImpact: "none";
  checkpointRequired: false;
  authorizationRequired: true;
  effects: ["framework-release-state"];
}

export interface ApplyUpdateOptions {
  authorized: boolean;
  artifact: LocalReleaseArtifact;
  trustedSourceIds: ReadonlySet<string>;
  beforePinCommit?: () => void | Promise<void>;
}

interface ParsedSemver {
  core: [number, number, number];
  prerelease: string[] | null;
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parseSemver(value: string): ParsedSemver | null {
  const match = SEMVER.exec(value);
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split(".") : null,
  };
}

export function isValidSemver(value: string): boolean {
  return parseSemver(value) !== null;
}

function compareIdentifiers(left: string, right: string): number {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) return Math.sign(Number(left) - Number(right));
  if (leftNumeric) return -1;
  if (rightNumeric) return 1;
  return left.localeCompare(right);
}

export function compareSemver(left: string, right: string): number {
  const l = parseSemver(left);
  const r = parseSemver(right);
  if (!l || !r) throw new Error(`Invalid Semantic Version comparison: '${left}' vs '${right}'.`);

  for (let index = 0; index < 3; index += 1) {
    const delta = l.core[index] - r.core[index];
    if (delta !== 0) return Math.sign(delta);
  }

  if (l.prerelease === null && r.prerelease === null) return 0;
  if (l.prerelease === null) return 1;
  if (r.prerelease === null) return -1;

  const length = Math.max(l.prerelease.length, r.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    if (l.prerelease[index] === undefined) return -1;
    if (r.prerelease[index] === undefined) return 1;
    const delta = compareIdentifiers(l.prerelease[index], r.prerelease[index]);
    if (delta !== 0) return delta;
  }
  return 0;
}

function validReleaseDescriptor(release: ReleaseDescriptor): boolean {
  return isValidSemver(release.version)
    && (release.channel === "stable" || release.channel === "preview" || release.channel === "development")
    && Number.isInteger(release.projectBrainSchema)
    && release.projectBrainSchema > 0
    && release.compatibility.from.length > 0
    && release.compatibility.from.every(isValidSemver)
    && release.sourceId.trim().length > 0
    && release.artifact.id.trim().length > 0
    && isSha256(release.artifact.sha256);
}

export function releaseIdentity(release: ReleaseDescriptor): ReleaseIdentity {
  if (!validReleaseDescriptor(release)) throw new Error(`Release descriptor is invalid: ${release.version}`);
  return {
    version: release.version,
    channel: release.channel,
    sourceId: release.sourceId,
    artifactId: release.artifact.id,
    artifactSha256: release.artifact.sha256.toLowerCase(),
  };
}

async function projectOwnedBrainSnapshot(projectPath: string): Promise<Map<string, Buffer>> {
  const result = new Map<string, Buffer>();
  for (const file of ["project.md", "goals.md", "decisions.md", "knowledge.md"] as const) {
    result.set(file, await readFile(resolve(projectPath, ".project-brain", file)));
  }
  return result;
}

async function assertSnapshotUnchanged(projectPath: string, before: Map<string, Buffer>): Promise<void> {
  for (const [file, bytes] of before) {
    const after = await readFile(resolve(projectPath, ".project-brain", file));
    if (!after.equals(bytes)) throw new Error(`Normal update validation failed: project-owned Project Brain file changed: ${file}`);
  }
}

export async function checkForUpdate(projectPath: string, releases: ReleaseDescriptor[]): Promise<UpdateCheck> {
  const store = new ProjectBrainStore(projectPath);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error("Update discovery requires a valid Project Brain.");

  const metadata = await store.readMetadata();
  const installedVersion = metadata.framework.version;
  if (!isValidSemver(installedVersion)) throw new Error("Active Framework version is not a valid Semantic Version.");
  const channel = metadata.framework.channel as ReleaseChannel;
  if (channel !== "stable" && channel !== "preview" && channel !== "development") {
    throw new Error(`Active update channel is unsupported: ${metadata.framework.channel}`);
  }
  const installedSchema = metadata.projectBrain.schemaVersion;

  const candidate = releases
    .filter(validReleaseDescriptor)
    .filter((release) => release.channel === channel)
    .filter((release) => compareSemver(release.version, installedVersion) > 0)
    .filter((release) => release.compatibility.from.includes(installedVersion))
    .sort((a, b) => compareSemver(b.version, a.version))[0];

  if (!candidate) {
    return {
      installedVersion,
      installedSchema,
      channel,
      compatibility: "none",
      migrationRequired: false,
    };
  }

  return {
    installedVersion,
    installedSchema,
    channel,
    availableVersion: candidate.version,
    availableRelease: releaseIdentity(candidate),
    compatibility: "compatible",
    migrationRequired: candidate.projectBrainSchema !== installedSchema,
  };
}

export async function planNormalUpdate(projectPath: string, releases: ReleaseDescriptor[]): Promise<UpdatePlan | null> {
  await assertLifecycleQuiescent(projectPath, "Normal update planning");
  const check = await checkForUpdate(projectPath, releases);
  if (!check.availableVersion || !check.availableRelease) return null;
  if (check.migrationRequired) throw new Error("Normal update planning cannot apply a schema migration.");

  return {
    sourceVersion: check.installedVersion,
    targetVersion: check.availableVersion,
    ...check.availableRelease,
    channel: check.channel,
    compatibility: "compatible",
    migrationRequired: false,
    projectImpact: "none",
    checkpointRequired: false,
    authorizationRequired: true,
    effects: ["framework-release-state"],
  };
}

export async function applyNormalUpdate(
  projectPath: string,
  plan: UpdatePlan,
  options: ApplyUpdateOptions,
): Promise<void> {
  if (!options.authorized) throw new Error("Update application requires explicit authorization.");
  await assertLifecycleQuiescent(projectPath, "Normal update application");

  const store = new ProjectBrainStore(projectPath);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error("Update application requires a valid Project Brain.");

  const metadata = await store.readMetadata();
  if (metadata.framework.version !== plan.sourceVersion || metadata.framework.channel !== plan.channel) {
    throw new Error("Update plan is stale for the current active release state.");
  }
  if (compareSemver(plan.targetVersion, plan.sourceVersion) <= 0) {
    throw new Error("Normal update application refuses a non-upgrade target.");
  }

  const before = await projectOwnedBrainSnapshot(projectPath);
  const identity: ReleaseIdentity = {
    version: plan.targetVersion,
    channel: plan.channel,
    sourceId: plan.sourceId,
    artifactId: plan.artifactId,
    artifactSha256: plan.artifactSha256,
  };

  const installed = await installVerifiedRuntime(projectPath, identity, options.artifact, options.trustedSourceIds);
  await assertSnapshotUnchanged(projectPath, before);
  await assertLifecycleQuiescent(projectPath, "Normal update activation");

  const current = await store.readMetadata();
  if (current.framework.version !== plan.sourceVersion || current.framework.channel !== plan.channel) {
    throw new Error("Update plan became stale before activation.");
  }

  const previousRuntime = await readActiveRuntimePointer(projectPath);
  let pointerChanged = false;
  try {
    await activateInstalledRuntime(projectPath, installed);
    pointerChanged = true;

    await options.beforePinCommit?.();
    await assertSnapshotUnchanged(projectPath, before);
    await assertLifecycleQuiescent(projectPath, "Normal update pin commit");

    const beforeCommit = await store.readMetadata();
    if (beforeCommit.framework.version !== plan.sourceVersion || beforeCommit.framework.channel !== plan.channel) {
      throw new Error("Update plan became stale before Project Pin commit.");
    }

    // This atomic Project Brain lifecycle write is the normal-update commit point.
    // The prepared Runtime pointer has no execution authority until this pin matches it.
    // No fallible validation step may follow a successful pin commit.
    await store.updateFrameworkLifecycle(plan.targetVersion, plan.channel);
  } catch (error) {
    if (pointerChanged) await restoreActiveRuntimePointer(projectPath, previousRuntime);
    throw error;
  }
}
