import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  applyMigrationUpdate,
  applyNormalUpdate,
  applyRecovery,
  checkForUpdate,
  inspectRecovery,
  planMigrationUpdate,
  planNormalUpdate,
  planRecovery,
  type MigrationPlan,
  type ReleaseDescriptor,
  type UpdatePlan,
} from "../runtime/index.js";
import type { LocalReleaseArtifact } from "../distribution/release-integrity.js";

function optionValues(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
    values.push(value);
    index += 1;
  }
  return values;
}

function optionValue(args: string[], name: string): string | undefined {
  const values = optionValues(args, name);
  if (values.length > 1) throw new Error(`${name} may be supplied only once.`);
  return values[0];
}

function requiredOption(args: string[], name: string): string {
  const value = optionValue(args, name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function loadReleaseManifest(path: string): Promise<ReleaseDescriptor[]> {
  const absolute = resolve(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(absolute, "utf8")) as unknown;
  } catch (error) {
    throw new Error(`Release manifest could not be read: ${error instanceof Error ? error.message : "unknown failure"}`);
  }
  if (!Array.isArray(parsed)) throw new Error("Release manifest must be a JSON array of release descriptors.");
  return parsed as ReleaseDescriptor[];
}

function candidateRelease(releases: ReleaseDescriptor[], check: Awaited<ReturnType<typeof checkForUpdate>>): ReleaseDescriptor {
  if (!check.availableRelease || !check.availableVersion) throw new Error("No compatible update is available.");
  const candidate = releases.find((release) =>
    release.version === check.availableRelease?.version &&
    release.channel === check.availableRelease.channel &&
    release.sourceId === check.availableRelease.sourceId &&
    release.artifact?.id === check.availableRelease.artifactId &&
    release.artifact?.sha256?.toLowerCase() === check.availableRelease.artifactSha256.toLowerCase(),
  );
  if (!candidate) throw new Error("Selected release identity could not be resolved back to the supplied manifest.");
  return candidate;
}

function printUpdatePlan(plan: UpdatePlan | MigrationPlan): void {
  console.log("Livariant update plan");
  console.log("");
  console.log(`Source version: ${plan.sourceVersion}`);
  console.log(`Target version: ${plan.targetVersion}`);
  console.log(`Channel: ${plan.channel}`);
  console.log(`Source ID: ${plan.sourceId}`);
  console.log(`Artifact ID: ${plan.artifactId}`);
  console.log(`Artifact SHA-256: ${plan.artifactSha256}`);
  console.log(`Migration required: ${plan.migrationRequired ? "yes" : "no"}`);
  console.log(`Project impact: ${plan.projectImpact}`);
  console.log(`Checkpoint required: ${plan.checkpointRequired ? "yes" : "no"}`);
  console.log("Authorization required: yes");
  if (plan.migrationRequired) {
    console.log(`Schema: ${plan.sourceSchema} -> ${plan.targetSchema}`);
    console.log(`Migration: ${plan.migration.id}`);
    console.log(`Replay safe: ${plan.migration.replaySafe ? "yes" : "no"}`);
  }
}

function artifactForPlan(plan: UpdatePlan | MigrationPlan, artifactPath: string): LocalReleaseArtifact {
  return {
    sourceId: plan.sourceId,
    releaseVersion: plan.targetVersion,
    artifactId: plan.artifactId,
    path: resolve(artifactPath),
  };
}

export async function handleUpdate(args: string[]): Promise<void> {
  const manifestPath = requiredOption(args, "--manifest");
  const releases = await loadReleaseManifest(manifestPath);
  const check = await checkForUpdate(process.cwd(), releases);
  if (!check.availableVersion || !check.availableRelease) {
    console.log("No compatible Livariant update is available from the supplied manifest.");
    return;
  }

  const release = candidateRelease(releases, check);
  const plan = check.migrationRequired
    ? await planMigrationUpdate(process.cwd(), release)
    : await planNormalUpdate(process.cwd(), releases);
  if (!plan) {
    console.log("No compatible Livariant update is available from the supplied manifest.");
    return;
  }
  printUpdatePlan(plan);

  if (!args.includes("--apply")) {
    console.log("");
    console.log("No changes applied. Review the plan, then rerun with --apply, --artifact <path>, and --trusted-source <source-id>.");
    return;
  }

  const artifactPath = requiredOption(args, "--artifact");
  const trustedSources = optionValues(args, "--trusted-source");
  if (trustedSources.length === 0) throw new Error("--apply requires at least one explicit --trusted-source <source-id>.");
  const trustedSourceIds = new Set(trustedSources);
  const artifact = artifactForPlan(plan, artifactPath);

  if (plan.migrationRequired) {
    await applyMigrationUpdate(process.cwd(), plan, { authorized: true, artifact, trustedSourceIds });
  } else {
    await applyNormalUpdate(process.cwd(), plan, { authorized: true, artifact, trustedSourceIds });
  }

  console.log("");
  console.log(`Livariant update completed: ${plan.sourceVersion} -> ${plan.targetVersion}`);
  console.log("Run 'livariant status' in a new invocation to confirm the activated Runtime.");
}

export async function handleRecover(args: string[]): Promise<void> {
  const inspection = await inspectRecovery(process.cwd());
  console.log("Livariant recovery assessment");
  console.log("");
  console.log(`State: ${inspection.state}`);
  console.log(`Checkpoint valid: ${inspection.checkpointValid ? "yes" : "no"}`);
  if (inspection.operationId) console.log(`Interrupted operation: ${inspection.operationId}`);
  if (inspection.migrationId) console.log(`Migration: ${inspection.migrationId}`);
  if (inspection.sourceVersion && inspection.targetVersion) console.log(`Release: ${inspection.sourceVersion} -> ${inspection.targetVersion}`);
  if (inspection.sourceSchema !== undefined && inspection.targetSchema !== undefined) console.log(`Schema: ${inspection.sourceSchema} -> ${inspection.targetSchema}`);
  if (inspection.reason) console.log(`Reason: ${inspection.reason}`);

  if (inspection.state === "none") {
    console.log("");
    console.log("No interrupted migration requires recovery.");
    return;
  }
  if (inspection.state !== "interrupted-migration" || !inspection.checkpointValid) {
    console.log("");
    console.log("Automatic recovery is unavailable. No changes were made; use 'livariant doctor' for diagnosis.");
    if (args.includes("--apply")) process.exitCode = 3;
    return;
  }

  const plan = await planRecovery(process.cwd());
  console.log("");
  console.log(`Recommended strategy: ${plan.strategy}`);
  console.log(`Expected source version: ${plan.expectedSourceVersion}`);
  console.log(`Expected source schema: ${plan.expectedSourceSchema}`);
  console.log("Authorization required: yes");

  if (!args.includes("--apply")) {
    console.log("");
    console.log("No changes applied. Rerun with 'livariant recover --apply' to authorize the validated rollback.");
    return;
  }

  await applyRecovery(process.cwd(), plan, { authorized: true });
  console.log("");
  console.log(`Recovery completed. Restored Livariant ${plan.expectedSourceVersion} / Project Brain schema ${plan.expectedSourceSchema}.`);
}
