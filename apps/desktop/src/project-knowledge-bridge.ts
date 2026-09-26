import { invoke } from "@tauri-apps/api/core";

export type ProjectKnowledgeAreaId = "purpose" | "direction" | "rules";

export type ProjectKnowledgeAreaSnapshot = {
  id: ProjectKnowledgeAreaId;
  state: "open" | "confirmed";
  confirmedValue: string;
  activeDecisionId: string | null;
  history: Array<{ decisionId: string; value: string; status: "superseded" }>;
};

export type ProjectKnowledgeSnapshot = {
  schemaVersion: 1;
  state: "ready";
  stableProjectIdentity: string;
  areas: ProjectKnowledgeAreaSnapshot[];
};

export type ProjectKnowledgePreparedProposal = {
  schemaVersion: 1;
  state: "proposal-ready";
  areaId: ProjectKnowledgeAreaId;
  displayValue: string;
  proposal: {
    actionableProposalId: string;
    materialDigest: { digest: string };
    baseline: { digest: string };
    mutationScope: {
      domain: "project-decision";
      changeKind: "add" | "supersede";
      proposedStatement: string;
      targetDecisionId?: string;
    };
  };
};

export const loadProjectKnowledge = () =>
  invoke<ProjectKnowledgeSnapshot>("project_knowledge_snapshot");

export const prepareProjectKnowledgeProposal = (areaId: ProjectKnowledgeAreaId, value: string) =>
  invoke<ProjectKnowledgePreparedProposal>("prepare_project_knowledge_proposal", { areaId, value });


export type ProjectKnowledgeApplyResult = {
  schemaVersion: 1;
  state: "completed";
  areaId: ProjectKnowledgeAreaId;
  appliedProposalId: string;
  snapshot: ProjectKnowledgeSnapshot;
};

export const applyProjectKnowledgeProposal = (
  areaId: ProjectKnowledgeAreaId,
  proposal: ProjectKnowledgePreparedProposal["proposal"],
  language: "de" | "en" = "en",
) => invoke<ProjectKnowledgeApplyResult>("apply_project_knowledge_proposal", {
  areaId,
  proposal,
  confirmedProposalDigest: proposal.materialDigest.digest,
  language,
});


export type ProjectKnowledgeProtectionStatus = {
  schemaVersion: 1;
  state: "ready" | "protected-source-required" | "guardian-bootstrap-required" | "project-brain-initialization-required" | "integrity-acceptance-required" | "integrity-recovery-required" | "unsafe" | "unsupported-platform";
  canonicalReadReady: boolean;
  guardian: {
    state: "ready" | "protected-source-required" | "guardian-bootstrap-required" | "unsafe" | "unsupported-platform";
    protectedSource: { state: "ready" | "missing" | "unsafe" | "unsupported-platform"; reason: string };
    guardian: { state: string; ready: boolean; reason: string };
    lifecycleAuthorizationReady: boolean;
  };
  integrity: { state: string; digest: string | null; reason: string | null };
  initialization: {
    action: string;
    projectState: string;
    materialSha256: string | null;
    authorized: boolean;
    filesToCreate: string[];
    reason: string | null;
  } | null;
  unexpectedChangeReview?: {
    areas: Array<{
      id: ProjectKnowledgeAreaId;
      before: string;
      after: string;
      changed: boolean;
    }>;
  };
};

export const loadProjectKnowledgeProtectionStatus = () =>
  invoke<ProjectKnowledgeProtectionStatus>("project_knowledge_protection_status");

export const launchProjectKnowledgeStageASetup = () =>
  invoke<{ state: "completed"; detail: string }>("launch_project_knowledge_stage_a_setup");

export const launchProjectKnowledgeProtectionSetup = () =>
  invoke<{ state: "completed"; detail: string }>("launch_project_knowledge_protection_setup");


export const acceptProjectKnowledgeIntegrity = (confirmedDigest: string, language: "de" | "en" = "en") =>
  invoke<ProjectKnowledgeProtectionStatus>("accept_project_knowledge_integrity", { confirmedDigest, language });

export async function ensureProjectKnowledgeTrusted(language: "de" | "en" = "en"): Promise<ProjectKnowledgeProtectionStatus> {
  let status = await loadProjectKnowledgeProtectionStatus();
  if (status.state === "protected-source-required") {
    await launchProjectKnowledgeStageASetup();
    status = await loadProjectKnowledgeProtectionStatus();
  }
  if (status.state === "guardian-bootstrap-required") {
    await launchProjectKnowledgeProtectionSetup();
    status = await loadProjectKnowledgeProtectionStatus();
  }
  if (status.state === "integrity-acceptance-required") {
    if (!status.integrity.digest) throw new Error("Project Brain protection requires an exact current digest.");
    status = await acceptProjectKnowledgeIntegrity(status.integrity.digest, language);
  }
  if (status.state !== "ready") {
    throw new Error(status.integrity.reason || status.guardian.protectedSource.reason || status.guardian.guardian.reason || "Project knowledge protection is not ready.");
  }
  return status;
}
