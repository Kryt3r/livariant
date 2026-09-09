import type { FirstRunOnboardingState } from "./first-run-onboarding.js";
import type { RepositoryIdentity } from "./source-registry.js";

export interface ProjectSourceReviewDecisionConfiguration {
  evidenceId: string;
  materialDigest: string;
  decision: "accept-as-candidate" | "reject" | "defer";
}

export interface ProjectSourceReviewConfigurationProjection {
  schemaVersion: 1;
  projectId: string;
  primary: {
    identity: RepositoryIdentity;
    localPath: string;
  };
  additional: Array<{
    identity: RepositoryIdentity;
    description: string;
    localPath?: string;
  }>;
  selectedReviewPaths: string[];
  decisions: ProjectSourceReviewDecisionConfiguration[];
  boundaries: {
    onboardingStateIsProjectTruth: false;
    projectionGrantsAuthority: false;
    projectionCreatesObservedEvidence: false;
    infersPrimaryLocalBinding: false;
    changesProjectOwnedFiles: false;
    performsSemanticApply: false;
  };
}

function required(value: string | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${field} is required before Project Source & Review can be configured.`);
  return normalized;
}

function normalizedPath(value: string, field: string): string {
  const normalized = value.trim().replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`${field} must be a bounded repository-relative path.`);
  }
  return normalized;
}

export function projectSourceReviewConfigurationFromFirstRun(
  state: FirstRunOnboardingState,
  options: {
    selectedReviewPaths?: readonly string[];
    decisions?: readonly ProjectSourceReviewDecisionConfiguration[];
  } = {},
): ProjectSourceReviewConfigurationProjection {
  if (state.schemaVersion !== 1) throw new Error("Unsupported first-run onboarding schemaVersion.");
  const projectId = required(state.project.projectId, "projectId");
  const registry = state.project.sourceRegistry;
  if (!registry) throw new Error("Project Source & Review configuration requires an onboarding source registry.");
  if (registry.projectId.trim() !== projectId) throw new Error("Onboarding projectId and source-registry projectId do not match.");
  if (!registry.primary.local?.localPath?.trim()) {
    throw new Error("The primary repository requires an explicit local binding; project localRoot is not inferred as repository binding.");
  }

  const selectedReviewPaths = [...(options.selectedReviewPaths ?? [])].map((path, index) => normalizedPath(path, `selectedReviewPaths[${index}]`));
  const duplicatePathKeys = new Set<string>();
  for (const path of selectedReviewPaths) {
    const key = path.toLowerCase();
    if (duplicatePathKeys.has(key)) throw new Error(`Duplicate selected review path: ${path}`);
    duplicatePathKeys.add(key);
  }

  const decisions = [...(options.decisions ?? [])].map((decision, index) => {
    const evidenceId = required(decision.evidenceId, `decisions[${index}].evidenceId`);
    const materialDigest = required(decision.materialDigest, `decisions[${index}].materialDigest`);
    if (!selectedReviewPaths.length) throw new Error("Review decisions require selected review paths.");
    return { evidenceId, materialDigest, decision: decision.decision };
  });

  return {
    schemaVersion: 1,
    projectId,
    primary: {
      identity: registry.primary.identity,
      localPath: registry.primary.local.localPath.trim(),
    },
    additional: registry.additional.map((repository) => ({
      identity: repository.identity,
      description: repository.description,
      ...(repository.local?.localPath?.trim() ? { localPath: repository.local.localPath.trim() } : {}),
    })),
    selectedReviewPaths,
    decisions,
    boundaries: {
      onboardingStateIsProjectTruth: false,
      projectionGrantsAuthority: false,
      projectionCreatesObservedEvidence: false,
      infersPrimaryLocalBinding: false,
      changesProjectOwnedFiles: false,
      performsSemanticApply: false,
    },
  };
}
