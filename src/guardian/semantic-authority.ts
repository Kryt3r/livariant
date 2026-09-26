import { resolve } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import type { ActionableProposal, ActionableProposalScope } from "../runtime/actionable-proposal.js";
import type { ProjectContextBaseline } from "../runtime/project-context-material.js";
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

export interface SemanticGuardianAuthorityBinding {
  authorizationId: string;
  physicalProjectRoot: string;
  stableProjectIdentity: string;
  actionableProposalId: string;
  proposalDigest: string;
  baseline: ProjectContextBaseline;
  expectedPostBaseline: ProjectContextBaseline;
  mutationScope: ActionableProposalScope;
}

export function buildSemanticGuardianAuthorityRequestFromBinding(
  input: SemanticGuardianAuthorityBinding,
): SemanticGuardianAuthorityRequest {
  if (!isStableProjectIdentity(input.authorizationId)) throw new Error("Semantic Guardian Authority operation id is invalid.");
  if (!isStableProjectIdentity(input.stableProjectIdentity)) throw new Error("Semantic Guardian Authority project identity is invalid.");
  const physicalProjectRoot = normalizedPhysicalProjectRoot(input.physicalProjectRoot);
  const { request, materialSha256 } = buildGuardianAuthorityRequest({
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialFields: [
      { label: "stable-project-identity", value: input.stableProjectIdentity },
      { label: "physical-project-root", value: physicalProjectRoot },
      { label: "authorization-operation-id", value: input.authorizationId.toLowerCase() },
      { label: "actionable-proposal-id", value: input.actionableProposalId },
      { label: "actionable-proposal-material-sha256", value: input.proposalDigest },
      { label: "baseline-schema-version", value: String(input.baseline.schemaVersion) },
      { label: "baseline-domain", value: input.baseline.domain },
      { label: "baseline-algorithm", value: input.baseline.algorithm },
      { label: "baseline-sha256", value: input.baseline.digest },
      { label: "expected-post-baseline-schema-version", value: String(input.expectedPostBaseline.schemaVersion) },
      { label: "expected-post-baseline-domain", value: input.expectedPostBaseline.domain },
      { label: "expected-post-baseline-algorithm", value: input.expectedPostBaseline.algorithm },
      { label: "expected-post-baseline-sha256", value: input.expectedPostBaseline.digest },
      { label: "scope-domain", value: input.mutationScope.domain },
      { label: "scope-change-kind", value: input.mutationScope.changeKind },
      { label: "scope-proposed-statement", value: input.mutationScope.proposedStatement },
      { label: "scope-target-decision-id", value: input.mutationScope.targetDecisionId ?? "" },
    ],
  });
  return {
    authorizationId: input.authorizationId.toLowerCase(),
    physicalProjectRoot,
    materialSha256,
    request,
  };
}

export function buildSemanticGuardianAuthorityRequest(input: {
  authorizationId: string;
  physicalProjectRoot: string;
  proposal: ActionableProposal;
  expectedPostBaseline?: ProjectContextBaseline;
}): SemanticGuardianAuthorityRequest {
  return buildSemanticGuardianAuthorityRequestFromBinding({
    authorizationId: input.authorizationId,
    physicalProjectRoot: input.physicalProjectRoot,
    stableProjectIdentity: input.proposal.stableProjectIdentity,
    actionableProposalId: input.proposal.actionableProposalId,
    proposalDigest: input.proposal.materialDigest.digest,
    baseline: input.proposal.baseline,
    expectedPostBaseline: input.expectedPostBaseline ?? input.proposal.baseline,
    mutationScope: input.proposal.mutationScope,
  });
}
