import { realpath } from "node:fs/promises";
import { discoverProject } from "../project/discovery.js";
import type { ActionableProposal } from "../runtime/actionable-proposal.js";
import {
  findMatchingActiveGuardianAuthority,
  findMatchingConsumedGuardianAuthority,
} from "./authority-client.js";
import { consumeGuardianAuthority, issueGuardianAuthority } from "./authority-transitions.js";
import { buildSemanticGuardianAuthorityRequest } from "./semantic-authority.js";

async function semanticRequest(
  authorizationId: string,
  proposal: ActionableProposal,
  projectPath: string,
) {
  const project = discoverProject(projectPath);
  return buildSemanticGuardianAuthorityRequest({
    authorizationId,
    physicalProjectRoot: await realpath(project.root),
    proposal,
  });
}

export async function issueSemanticGuardianAuthority(
  authorizationId: string,
  proposal: ActionableProposal,
  projectPath: string = process.cwd(),
) {
  const material = await semanticRequest(authorizationId, proposal, projectPath);
  const record = await issueGuardianAuthority({ request: material.request, projectPath });
  if (record.materialSha256 !== material.materialSha256 || record.consumer !== "semantic-mutation" || record.mode !== "one-shot") {
    throw new Error("Protected Guardian issued Semantic Authority does not match the exact authorization material.");
  }
  return { material, record };
}

export async function consumeSemanticGuardianAuthority(
  authorizationId: string,
  proposal: ActionableProposal,
  projectPath: string = process.cwd(),
) {
  const material = await semanticRequest(authorizationId, proposal, projectPath);
  const record = await findMatchingActiveGuardianAuthority({
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialSha256: material.materialSha256,
    projectPath,
  });
  if (!record) {
    throw new Error("Matching active protected Guardian Semantic Authority is missing; legacy same-user authorization evidence is not sufficient.");
  }
  const consumed = await consumeGuardianAuthority({
    record,
    expectedMaterialSha256: material.materialSha256,
    projectPath,
  });
  return { material, record: consumed };
}

export async function assertSemanticGuardianAuthorityWasConsumed(
  authorizationId: string,
  proposal: ActionableProposal,
  projectPath: string = process.cwd(),
) {
  const material = await semanticRequest(authorizationId, proposal, projectPath);
  const record = await findMatchingConsumedGuardianAuthority({
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialSha256: material.materialSha256,
    projectPath,
  });
  if (!record) {
    throw new Error("Protected Guardian does not contain an exact consumed Semantic Authority record for this authorization; local applying evidence is not sufficient for recovery.");
  }
  return { material, record };
}
