import { readFile, realpath } from "node:fs/promises";
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
  type RecoveryPlan,
  type ReleaseDescriptor,
  type UpdatePlan,
} from "../runtime/index.js";
import { recordAcceptedProjectBrainState } from "../project-brain/integrity.js";
import type { LocalReleaseArtifact } from "../distribution/release-integrity.js";
import {
  buildLifecycleGuardianAuthorityRequest,
  lifecycleMaterialSha256,
  type LifecycleGuardianAuthorityMaterial,
} from "../guardian/lifecycle-authority.js";
import {
  consumeLifecycleGuardianAuthority,
  issueLifecycleGuardianAuthority,
} from "../guardian/lifecycle-authority-transition.js";

function guardDirectLegacyInitEntrypoint(): void {
  const entrypoint = process.argv[1] ?? "";
  const invokedLegacyMainDirectly = /(?:^|[\\/])legacy-main\.(?:js|ts)$/u.test(entrypoint);
  if (invokedLegacyMainDirectly && process.argv[2] === "init") {
    throw new Error("Direct legacy init entrypoint is retired; use canonical 'livariant init' with plan -> --authorize -> --apply.");
  }
}

guardDirectLegacyInitEntrypoint();

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

function lifecycleMode(args: string[]): "plan" | "authorize" | "apply" {
  const authorize = args.includes("--authorize");
  const apply = args.includes("--apply");
  if (authorize && apply) throw new Error("Lifecycle --authorize and --apply are separate phases and may not be supplied together.");
  return authorize ? "authorize" : apply ? "apply" : "plan";
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
  console.log("Independent lifecycle authorization required: yes");
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

function printProtectedIntegrityAcceptanceRequired(): void {
  console.log("Protected integrity: required for the changed Project Brain state.");
  console.log("Review with 'livariant integrity inspect', then run 'livariant integrity accept-current' before canonical Project Brain reads resume.");
}

async function updateLifecycleMaterial(plan: UpdatePlan | MigrationPlan): Promise<LifecycleGuardianAuthorityMaterial> {
  return buildLifecycleGuardianAuthorityRequest({
    operation: plan.migrationRequired ? "migration-update" : "normal-update",
    physicalProjectRoot: await realpath(process.cwd()),
    materialFields: [
      { label: "source-version", value: plan.sourceVersion },
      { label: "target-version", value: plan.targetVersion },
      { label: "channel", value: plan.channel },
      { label: "release-source-id", value: plan.sourceId },
      { label: "artifact-id", value: plan.artifactId },
      { label: "artifact-sha256", value: plan.artifactSha256.toLowerCase() },
      { label: "plan-sha256", value: lifecycleMaterialSha256(plan) },
      ...(plan.migrationRequired ? [
        { label: "source-schema", value: String(plan.sourceSchema) },
        { label: "target-schema", value: String(plan.targetSchema) },
        { label: "migration-id", value: plan.migration.id },
      ] : []),
    ],
  });
}

async function recoveryLifecycleMaterial(plan: RecoveryPlan): Promise<LifecycleGuardianAuthorityMaterial> {
  const stableRecoveryMaterial = {
    interruptedOperationId: plan.interruptedOperationId,
    strategy: plan.strategy,
    checkpointPath: resolve(plan.checkpointPath),
    expectedSourceVersion: plan.expectedSourceVersion,
    expectedSourceSchema: plan.expectedSourceSchema,
  };
  return buildLifecycleGuardianAuthorityRequest({
    operation: "recovery",
    physicalProjectRoot: await realpath(process.cwd()),
    materialFields: [
      { label: "interrupted-operation-id", value: plan.interruptedOperationId.toLowerCase() },
      { label: "recovery-strategy", value: plan.strategy },
      { label: "checkpoint-path", value: resolve(plan.checkpointPath) },
      { label: "expected-source-version", value: plan.expectedSourceVersion },
      { label: "expected-source-schema", value: String(plan.expectedSourceSchema) },
      { label: "plan-sha256", value: lifecycleMaterialSha256(stableRecoveryMaterial) },
    ],
  });
}

async function authorizeLifecycle(material: LifecycleGuardianAuthorityMaterial): Promise<void> {
  const issued = await issueLifecycleGuardianAuthority(material);
  console.log("");
  console.log("Protected Guardian lifecycle Authority issued.");
  console.log(`Guardian record: ${issued.record.recordId}`);
  console.log(`Exact material SHA-256: ${material.materialSha256}`);
  console.log("Lifecycle changes made: 0");
  console.log("Rerun the same lifecycle plan with --apply before this one-shot Authority expires.");
}

async function consumeLifecycle(material: LifecycleGuardianAuthorityMaterial): Promise<void> {
  await consumeLifecycleGuardianAuthority(material);
}

export async function handleUpdate(args: string[]): Promise<void> {
  const mode = lifecycleMode(args);
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
  const lifecycleMaterial = await updateLifecycleMaterial(plan);

  if (mode === "plan") {
    console.log("");
    console.log("No changes applied. Run the same command with --authorize to request exact protected Guardian lifecycle Authority, then rerun with --apply.");
    return;
  }

  if (mode === "authorize") {
    await authorizeLifecycle(lifecycleMaterial);
    return;
  }

  const artifactPath = requiredOption(args, "--artifact");
  const trustedSources = optionValues(args, "--trusted-source");
  if (trustedSources.length === 0) throw new Error("--apply requires at least one explicit --trusted-source <source-id>.");
  const trustedSourceIds = new Set(trustedSources);
  const artifact = artifactForPlan(plan, artifactPath);

  await consumeLifecycle(lifecycleMaterial);

  if (plan.migrationRequired) {
    await applyMigrationUpdate(process.cwd(), plan, { authorized: true, artifact, trustedSourceIds });
    await recordAcceptedProjectBrainState(process.cwd(), "lifecycle");
  } else {
    await applyNormalUpdate(process.cwd(), plan, { authorized: true, artifact, trustedSourceIds });
  }

  console.log("");
  console.log(`Livariant update completed: ${plan.sourceVersion} -> ${plan.targetVersion}`);
  if (plan.migrationRequired) printProtectedIntegrityAcceptanceRequired();
  console.log("Run 'livariant status' in a new invocation to confirm the activated Runtime.");
}

export async function handleRecover(args: string[]): Promise<void> {
  const mode = lifecycleMode(args);
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
    if (mode === "apply") process.exitCode = 3;
    return;
  }

  const plan = await planRecovery(process.cwd());
  console.log("");
  console.log(`Recommended strategy: ${plan.strategy}`);
  console.log(`Expected source version: ${plan.expectedSourceVersion}`);
  console.log(`Expected source schema: ${plan.expectedSourceSchema}`);
  console.log("Independent lifecycle authorization required: yes");
  const lifecycleMaterial = await recoveryLifecycleMaterial(plan);

  if (mode === "plan") {
    console.log("");
    console.log("No changes applied. Rerun with 'livariant recover --authorize' to request exact protected Guardian lifecycle Authority, then rerun with --apply.");
    return;
  }

  if (mode === "authorize") {
    await authorizeLifecycle(lifecycleMaterial);
    return;
  }

  await consumeLifecycle(lifecycleMaterial);
  await applyRecovery(process.cwd(), plan, { authorized: true });
  console.log("");
  console.log(`Recovery completed. Restored Livariant ${plan.expectedSourceVersion} / Project Brain schema ${plan.expectedSourceSchema}.`);
  console.log("Protected integrity: inspect the restored Project Brain before canonical reads; if it is not protected, run 'livariant integrity accept-current' after review.");
}
