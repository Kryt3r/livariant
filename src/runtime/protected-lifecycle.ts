import { lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { assertReleaseAuthorized } from "../distribution/release-authorization.js";
import { installTrustedRuntime } from "../distribution/runtime-installation.js";
import { verifyReleaseArtifact, type ReleaseIdentity } from "../distribution/release-integrity.js";
import { issueReleaseAuthorizationGuardianAuthority } from "../guardian/release-authorization-authority-transition.js";
import {
  applyMigrationUpdate as applyMigrationUpdateCore,
  type ApplyMigrationOptions,
  type MigrationPlan,
} from "./index-core.js";
import {
  applyNormalUpdate as applyNormalUpdateCore,
  type ApplyUpdateOptions,
  type UpdatePlan,
} from "../lifecycle/update.js";

function normalUpdateIdentity(plan: UpdatePlan): ReleaseIdentity {
  return {
    version: plan.targetVersion,
    channel: plan.channel,
    sourceId: plan.sourceId,
    artifactId: plan.artifactId,
    artifactSha256: plan.artifactSha256,
  };
}

function migrationIdentity(plan: MigrationPlan): ReleaseIdentity {
  return {
    version: plan.targetVersion,
    channel: plan.channel,
    sourceId: plan.sourceId,
    artifactId: plan.artifactId,
    artifactSha256: plan.artifactSha256,
  };
}

async function targetRuntimeExists(projectPath: string, identity: ReleaseIdentity): Promise<boolean> {
  const finalRoot = resolve(projectPath, ".framework-runtime", "releases", identity.version);
  try {
    await lstat(finalRoot);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function prepareProtectedRuntime(
  projectPath: string,
  identity: ReleaseIdentity,
  options: Pick<ApplyUpdateOptions, "artifact" | "trustedSourceIds">,
): Promise<void> {
  if (!await targetRuntimeExists(projectPath, identity)) {
    // User presence must approve the bytes Livariant actually verified, not an
    // unverified requester-supplied identity. The exact one-shot is consumed
    // before installTrustedRuntime reaches the low-level materialization step.
    await verifyReleaseArtifact(identity, options.artifact, options.trustedSourceIds);
    await issueReleaseAuthorizationGuardianAuthority(identity, projectPath);
    await assertReleaseAuthorized(projectPath, identity);
  }
  await installTrustedRuntime(projectPath, identity, options.artifact, options.trustedSourceIds);
}

/**
 * Public/product normal-update boundary. A fresh target Runtime receives exact
 * one-shot Guardian Release Authorization for already verified artifact bytes,
 * which is consumed before package materialization. The installed Runtime is
 * then bound to persistent protected Runtime trust and executed only for
 * protected attestation before lifecycle pin/pointer mutation may commit.
 */
export async function applyProtectedNormalUpdate(
  projectPath: string,
  plan: UpdatePlan,
  options: ApplyUpdateOptions,
): Promise<void> {
  if (!options.authorized) {
    await applyNormalUpdateCore(projectPath, plan, options);
    return;
  }
  await prepareProtectedRuntime(projectPath, normalUpdateIdentity(plan), options);
  await applyNormalUpdateCore(projectPath, plan, options);
}

/**
 * Public/product migration boundary. A fresh target Runtime first receives and
 * consumes exact one-shot Release Authorization for verified artifact bytes;
 * Runtime execution Authority is then established before migration
 * checkpoint/mutation begins. The Core lifecycle reuses the already verified
 * exact tree as inert evidence.
 */
export async function applyProtectedMigrationUpdate(
  projectPath: string,
  plan: MigrationPlan,
  options: ApplyMigrationOptions,
): Promise<void> {
  if (!options.authorized) {
    await applyMigrationUpdateCore(projectPath, plan, options);
    return;
  }
  await prepareProtectedRuntime(projectPath, migrationIdentity(plan), options);
  await applyMigrationUpdateCore(projectPath, plan, options);
}
