import type { DoctorFinding } from "./doctor.js";
import type { ProjectContextBaseline, ProjectContextItem } from "./context-snapshot.js";

export type ProviderContextProvider = "claude-code" | "codex";

export interface ProviderContextTask {
  value: string;
  authorityClass: "session-ephemeral";
}

export interface ProviderContextProjection {
  derived: true;
  providerContext: true;
  automaticInjection: false;
  returnedCopiesTrusted: false;
  mutationAuthorization: false;
  applySupported: false;
  authorizationEligible: false;
}

export interface ProviderContextEvidence {
  projectIdentity: ProjectContextItem[];
  confirmedGoals: ProjectContextItem[];
  activeDecisions: ProjectContextItem[];
  knownFacts: ProjectContextItem[];
  unresolvedUnknowns: ProjectContextItem[];
}

export interface ProviderContextBase {
  schemaVersion: 1;
  packetVersion: 1;
  generatedAt: string;
  frameworkVersion: string;
  provider: ProviderContextProvider;
  projectLocator: string;
  stableProjectIdentity: null;
  projection: ProviderContextProjection;
  mutationAuthorization: false;
  applySupported: false;
  authorizationEligible: false;
  changesMade: 0;
}

export interface ReadyProviderContextPacket extends ProviderContextBase {
  state: "ready";
  packetId: string;
  baseline: ProjectContextBaseline;
  safetyState: "clear";
  evidence: ProviderContextEvidence;
  task: ProviderContextTask;
  findings: [];
}

export interface BlockedProviderContextPacket extends ProviderContextBase {
  state: "blocked";
  packetId: null;
  baseline: ProjectContextBaseline | null;
  safetyState: "blocked";
  evidence: null;
  task: null;
  findings: DoctorFinding[];
}

export type ProviderContextPacket = ReadyProviderContextPacket | BlockedProviderContextPacket;
