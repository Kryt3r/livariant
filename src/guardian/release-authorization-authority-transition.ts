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

export async function issueReleaseAuthorizationGuardianAuthority(
  identity: ReleaseIdentity,
  projectPath: string = process.cwd(),
) {
  const material = await releaseAuthorizationRequest(identity, projectPath);
  const record = await issueGuardianAuthority({ request: material.request, projectPath });
  if (record.consumer !== "release-authorization"
    || record.mode !== "one-shot"
    || record.state !== "active"
    || record.materialSha256 !== material.materialSha256) {
    throw new Error("Protected Guardian issued Release Authorization does not match the exact candidate material.");
  }
  return { material, record };
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
