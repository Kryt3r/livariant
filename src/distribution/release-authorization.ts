import { findMatchingActiveGuardianAuthority } from "../guardian/authority-client.js";
import { buildReleaseAuthorizationGuardianRequest } from "../guardian/release-authorization-authority.js";
import type { ReleaseIdentity } from "./release-integrity.js";

export async function assertReleaseAuthorized(projectPath: string, identity: ReleaseIdentity): Promise<void> {
  const material = buildReleaseAuthorizationGuardianRequest({
    releaseAuthorizationSchemaVersion: 1,
    packageName: "livariant",
    version: identity.version,
    channel: identity.channel,
    sourceId: identity.sourceId,
    artifactId: identity.artifactId,
    artifactSha256: identity.artifactSha256,
  });

  const record = await findMatchingActiveGuardianAuthority({
    consumer: "release-authorization",
    mode: "persistent",
    materialSha256: material.materialSha256,
    projectPath,
  });

  if (!record) {
    throw new Error(
      "Runtime release is not authorized by protected Livariant Guardian. "
      + "Historical same-user release authorization cannot authorize installation; "
      + "provision exact protected release authorization through the independent Guardian process.",
    );
  }
}
