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
};

export const loadProjectKnowledgeProtectionStatus = () =>
  invoke<ProjectKnowledgeProtectionStatus>("project_knowledge_protection_status");

export const launchProjectKnowledgeStageASetup = () =>
  invoke<{ state: "launched"; detail: string }>("launch_project_knowledge_stage_a_setup");

export const launchProjectKnowledgeProtectionSetup = () =>
  invoke<{ state: "launched"; detail: string }>("launch_project_knowledge_protection_setup");


export const acceptProjectKnowledgeIntegrity = (confirmedDigest: string) =>
  invoke<ProjectKnowledgeProtectionStatus>("accept_project_knowledge_integrity", { confirmedDigest });


export const authorizeProjectKnowledgeInitialization = (confirmedMaterialSha256: string, uiLanguage: "de" | "en") =>
  invoke<ProjectKnowledgeProtectionStatus>("authorize_project_knowledge_initialization", { confirmedMaterialSha256, uiLanguage });

export const applyProjectKnowledgeInitialization = (confirmedMaterialSha256: string) =>
  invoke<ProjectKnowledgeProtectionStatus>("apply_project_knowledge_initialization", { confirmedMaterialSha256 });
