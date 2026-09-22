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
) => invoke<ProjectKnowledgeApplyResult>("apply_project_knowledge_proposal", {
  areaId,
  proposal,
  confirmedProposalDigest: proposal.materialDigest.digest,
});


export type ProjectKnowledgeProtectionStatus = {
  schemaVersion: 1;
  state: "ready" | "protected-source-required" | "guardian-bootstrap-required" | "unsafe" | "unsupported-platform";
  protectedSource: { state: "ready" | "missing" | "unsafe" | "unsupported-platform"; reason: string };
  guardian: { state: string; ready: boolean; reason: string };
  lifecycleAuthorizationReady: boolean;
};

export const loadProjectKnowledgeProtectionStatus = () =>
  invoke<ProjectKnowledgeProtectionStatus>("project_knowledge_protection_status");

export const launchProjectKnowledgeProtectionSetup = () =>
  invoke<{ state: "launched"; detail: string }>("launch_project_knowledge_protection_setup");
