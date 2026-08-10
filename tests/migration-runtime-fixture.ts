import type { LocalReleaseArtifact } from "../src/distribution/release-integrity.js";
import type { ReleaseDescriptor } from "../src/lifecycle/update.js";
import { createRuntimePackageFixture } from "./runtime-package-fixture.js";
import {
  MIGRATION_TARGET_VERSION,
  TEST_SOURCE_CHANNEL,
  TEST_SOURCE_VERSION,
} from "./release-test-baseline.js";

export { MIGRATION_TARGET_VERSION } from "./release-test-baseline.js";
export const MIGRATION_SOURCE_ID = "official-local-test-source";
export const MIGRATION_ARTIFACT_ID = "runtime-node-cli-migration";
export const MIGRATION_TRUSTED_SOURCE_IDS = new Set([MIGRATION_SOURCE_ID]);

const fixture = await createRuntimePackageFixture(MIGRATION_TARGET_VERSION);

export const migrationRelease: ReleaseDescriptor = {
  version: MIGRATION_TARGET_VERSION,
  channel: TEST_SOURCE_CHANNEL,
  projectBrainSchema: 2,
  compatibility: { from: [TEST_SOURCE_VERSION] },
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
