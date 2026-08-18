import { resolve } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import type { ActionableProposal } from "../runtime/actionable-proposal.js";
import {
  buildGuardianAuthorityRequest,
  type GuardianAuthorityRequest,
} from "./authority-client.js";

export interface SemanticGuardianAuthorityRequest {
  authorizationId: string;
  physicalProjectRoot: string;
  materialSha256: string;
  request: GuardianAuthorityRequest;
}

function normalizedPhysicalProjectRoot(value: string): string {
  if (!value) throw new Error("Semantic Guardian Authority requires the physical project root.");
  return process.platform === "win32" ? resolve(value).toLowerCase() : resolve(value);
}

export function buildSemanticGuardianAuthorityRequest(input: {
  authorizationId: string;
  physicalProjectRoot: string;
  proposal: ActionableProposal;
}): SemanticGuardianAuthorityRequest {
  if (!isStableProjectIdentity(input.authorizationId)) throw new Error("Semantic Guardian Authority operation id is invalid.");
  if (!isStableProjectIdentity(input.proposal.stableProjectIdentity)) throw new Error("Semantic Guardian Authority project identity is invalid.");
  const physicalProjectRoot = normalizedPhysicalProjectRoot(input.physicalProjectRoot);
  const { request, materialSha256 } = buildGuardianAuthorityRequest({
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialFields: [
      { label: "stable-project-identity", value: input.proposal.stableProjectIdentity },
      { label: "physical-project-root", value: physicalProjectRoot },
      { label: "authorization-operation-id", value: input.authorizationId.toLowerCase() },
      { label: "actionable-proposal-id", value: input.proposal.actionableProposalId },
      { label: "actionable-proposal-material-sha256", value: input.proposal.materialDigest.digest },
      { label: "baseline-schema-version", value: String(input.proposal.baseline.schemaVersion) },
      { label: "baseline-domain", value: input.proposal.baseline.domain },
      { label: "baseline-algorithm", value: input.proposal.baseline.algorithm },
      { label: "baseline-sha256", value: input.proposal.baseline.digest },
      { label: "scope-domain", value: input.proposal.mutationScope.domain },
      { label: "scope-change-kind", value: input.proposal.mutationScope.changeKind },
      { label: "scope-proposed-statement", value: input.proposal.mutationScope.proposedStatement },
      { label: "scope-target-decision-id", value: input.proposal.mutationScope.targetDecisionId ?? "" },
    ],
  });
  return {
    authorizationId: input.authorizationId.toLowerCase(),
    physicalProjectRoot,
    materialSha256,
    request,
  };
}
