import type { LocalReleaseArtifact } from "../src/distribution/release-integrity.js";
import type { ReleaseDescriptor } from "../src/lifecycle/update.js";
import { createRuntimePackageFixture } from "./runtime-package-fixture.js";

export const MIGRATION_TARGET_VERSION = "0.0.1-development.1";
export const MIGRATION_SOURCE_ID = "official-local-test-source";
export const MIGRATION_ARTIFACT_ID = "runtime-node-cli-migration";
export const MIGRATION_TRUSTED_SOURCE_IDS = new Set([MIGRATION_SOURCE_ID]);

const fixture = await createRuntimePackageFixture(MIGRATION_TARGET_VERSION);

export const migrationRelease: ReleaseDescriptor = {
  version: MIGRATION_TARGET_VERSION,
  channel: "development",
  projectBrainSchema: 2,
  compatibility: { from: ["0.0.0-development"] },
  sourceId: MIGRATION_SOURCE_ID,
  artifact: { id: MIGRATION_ARTIFACT_ID, sha256: fixture.sha256 },
};

export function migrationArtifact(overrides: Partial<LocalReleaseArtifact> = {}): LocalReleaseArtifact {
  return {
    sourceId: MIGRATION_SOURCE_ID,
    releaseVersion: MIGRATION_TARGET_VERSION,
    artifactId: MIGRATION_ARTIFACT_ID,
    path: fixture.path,
    ...overrides,
  };
}

export function migrationApplyOptions(overrides: Record<string, unknown> = {}) {
  return {
    authorized: true,
    artifact: migrationArtifact(),
    trustedSourceIds: MIGRATION_TRUSTED_SOURCE_IDS,
    ...overrides,
  };
}
