import { realpath } from "node:fs/promises";
import { discoverProject } from "../project/discovery.js";
import type { ReleaseIdentity } from "../distribution/release-integrity.js";
import { findMatchingActiveGuardianAuthority } from "./authority-client.js";
import { consumeGuardianAuthority, issueGuardianAuthority } from "./authority-transitions.js";
import { buildReleaseAuthorizationGuardianRequest } from "./release-authorization-authority.js";

async function releaseAuthorizationRequest(identity: ReleaseIdentity, projectPath: string) {
  const project = discoverProject(projectPath);
  return buildReleaseAuthorizationGuardianRequest({
    releaseAuthorizationSchemaVersion: 1,
    packageName: "livariant",
    version: identity.version,
    channel: identity.channel,
    sourceId: identity.sourceId,
    artifactId: identity.artifactId,
    artifactSha256: identity.artifactSha256,
    physicalProjectRoot: await realpath(project.root),
  });
}

function assertExactActiveReleaseAuthorization(record: Awaited<ReturnType<typeof findMatchingActiveGuardianAuthority>>, materialSha256: string) {
  if (!record
    || record.consumer !== "release-authorization"
    || record.mode !== "one-shot"
    || record.state !== "active"
    || record.materialSha256 !== materialSha256) {
    throw new Error("Protected Guardian Release Authorization does not match the exact active candidate material.");
  }
  return record;
}

export async function issueReleaseAuthorizationGuardianAuthority(
  identity: ReleaseIdentity,
  projectPath: string = process.cwd(),
) {
  const material = await releaseAuthorizationRequest(identity, projectPath);
  const record = await issueGuardianAuthority({ request: material.request, projectPath });
  assertExactActiveReleaseAuthorization(record, material.materialSha256);
  return { material, record };
}

/**
 * Ensure C-04 has one exact active protected one-shot before consumption.
 *
 * Generic Guardian issuance remains strict and refuses duplicate active Authority.
 * This C-04-specific helper only reuses an already protected, unexpired, exact
 * active one-shot when a prior issuance completed but lifecycle consumption was
 * interrupted. It never manufactures or promotes same-user evidence.
 */
export async function ensureReleaseAuthorizationGuardianAuthority(
  identity: ReleaseIdentity,
  projectPath: string = process.cwd(),
) {
  const material = await releaseAuthorizationRequest(identity, projectPath);
  const existing = await findMatchingActiveGuardianAuthority({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: material.materialSha256,
    projectPath,
  });
  if (existing) {
    return { material, record: assertExactActiveReleaseAuthorization(existing, material.materialSha256), reused: true };
  }

  const issued = await issueGuardianAuthority({ request: material.request, projectPath });
  return { material, record: assertExactActiveReleaseAuthorization(issued, material.materialSha256), reused: false };
}

export async function consumeReleaseAuthorizationGuardianAuthority(
  identity: ReleaseIdentity,
  projectPath: string = process.cwd(),
) {
  const material = await releaseAuthorizationRequest(identity, projectPath);
  const record = await findMatchingActiveGuardianAuthority({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: material.materialSha256,
    projectPath,
  });
  if (!record) {
    throw new Error(
      "Matching active protected Guardian Release Authorization is missing; "
      + "historical same-user release authorization cannot authorize installation.",
    );
  }

  const consumed = await consumeGuardianAuthority({
    record,
    expectedMaterialSha256: material.materialSha256,
    projectPath,
  });
  if (consumed.consumer !== "release-authorization"
    || consumed.mode !== "one-shot"
    || consumed.state !== "consumed"
    || consumed.materialSha256 !== material.materialSha256) {
    throw new Error("Protected Guardian consumed Release Authorization does not match the exact candidate material.");
  }
  return { material, record: consumed };
}
