import { installTrustedRuntime } from "../distribution/runtime-installation.js";
import type { ReleaseIdentity } from "../distribution/release-integrity.js";
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

/**
 * Public/product normal-update boundary. The target Runtime is fully verified,
 * bound to protected Guardian trust at its exact final location, and executed
 * only for protected attestation before any lifecycle pin/pointer mutation may
 * commit the update.
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
  await installTrustedRuntime(projectPath, normalUpdateIdentity(plan), options.artifact, options.trustedSourceIds);
  await applyNormalUpdateCore(projectPath, plan, options);
}

/**
 * Public/product migration boundary. Runtime execution Authority is established
 * before migration checkpoint/mutation begins. The Core lifecycle then reuses
 * the already verified exact tree as inert evidence; it cannot grant execution
 * Authority by itself.
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
  await installTrustedRuntime(projectPath, migrationIdentity(plan), options.artifact, options.trustedSourceIds);
  await applyMigrationUpdateCore(projectPath, plan, options);
}
