import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { frameHashField, type ProjectContextBaseline } from "./project-context-material.js";
import {
  buildSemanticProposal,
  parseSemanticProposalCandidate,
  type SemanticProposalCandidate,
  type SemanticProposalEvidence,
  type SemanticProposalFinding,
} from "./semantic-proposal.js";
import type { DoctorFinding } from "./doctor.js";

export const ACTIONABLE_PROPOSAL_SCHEMA_VERSION = 1;
export const ACTIONABLE_PROPOSAL_FILE_MAX_BYTES = 128 * 1024;
const ACTIONABLE_PROPOSAL_DIGEST_DOMAIN = "livariant:actionable-proposal:v1";

export interface ActionableProposalActionability {
  authorizationEligible: true;
  mutationAuthorization: false;
  applySupported: false;
  authorizationRequired: true;
}

export interface ActionableProposalScope {
  domain: "project-decision" | "project-goal" | "project-knowledge";
  changeKind: "add" | "supersede";
  proposedStatement: string;
  targetDecisionId?: string;
}

export interface ActionableProposal {
  schemaVersion: 1;
  actionableProposalVersion: 1;
  actionableProposalId: string;
  materialDigest: {
    algorithm: "sha256";
    domain: typeof ACTIONABLE_PROPOSAL_DIGEST_DOMAIN;
    digest: string;
  };
  generatedAt: string;
  projectLocator: string;
  stableProjectIdentity: string;
  baseline: ProjectContextBaseline;
  candidate: SemanticProposalCandidate;
  evidence: SemanticProposalEvidence;
  findings: SemanticProposalFinding[];
  mutationScope: ActionableProposalScope;
  intentionallyUnchanged: readonly string[];
  actionability: ActionableProposalActionability;
  changesMade: 0;
}

export interface ReadyActionableProposalResult {
  state: "actionable-proposal";
  proposal: ActionableProposal;
  changesMade: 0;
}

export interface BlockedActionableProposalResult {
  state: "blocked";
  proposal: null;
  findings: Array<SemanticProposalFinding | DoctorFinding | { code: string; effect: "blocking"; message: string }>;
  authorizationEligible: false;
  mutationAuthorization: false;
  applySupported: false;
  changesMade: 0;
}

export type ActionableProposalResult = ReadyActionableProposalResult | BlockedActionableProposalResult;

export interface ActionableProposalBuildOptions {
  beforeRevalidate?: () => void | Promise<void>;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function strictKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const allow = new Set(allowed);
  for (const key of Object.keys(value)) if (!allow.has(key)) throw new Error("Actionable proposal contains an unsupported field.");
  for (const key of allowed) if (!(key in value)) throw new Error(`Actionable proposal is missing required field: ${key}.`);
}

function hashMaterial(hash: ReturnType<typeof createHash>, label: string, value: unknown): void {
  if (value === null) {
    frameHashField(hash, `${label}:type`, Buffer.from("null"));
    return;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    frameHashField(hash, `${label}:type`, Buffer.from(typeof value));
    frameHashField(hash, `${label}:value`, Buffer.from(String(value), "utf8"));
    return;
  }
  if (Array.isArray(value)) {
    frameHashField(hash, `${label}:type`, Buffer.from("array"));
    frameHashField(hash, `${label}:length`, Buffer.from(String(value.length)));
    value.forEach((item, index) => hashMaterial(hash, `${label}:${index}`, item));
    return;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    frameHashField(hash, `${label}:type`, Buffer.from("object"));
    frameHashField(hash, `${label}:length`, Buffer.from(String(entries.length)));
    for (const [key, item] of entries) {
      frameHashField(hash, `${label}:key`, Buffer.from(key, "utf8"));
      hashMaterial(hash, `${label}:${key}`, item);
    }
    return;
  }
  throw new Error("Unsupported actionable proposal material field type.");
}

function actionableDigest(material: object): string {
  const hash = createHash("sha256");
  frameHashField(hash, "domain", Buffer.from(ACTIONABLE_PROPOSAL_DIGEST_DOMAIN, "utf8"));
  hashMaterial(hash, "actionable-proposal", material);
  return hash.digest("hex");
}

function materialOf(proposal: Omit<ActionableProposal, "actionableProposalId" | "materialDigest" | "generatedAt">): object {
  return proposal;
}

export async function buildActionableProposal(
  candidate: SemanticProposalCandidate,
  projectPath: string = process.cwd(),
  options: ActionableProposalBuildOptions = {},
): Promise<ActionableProposalResult> {
  const reviewed = await buildSemanticProposal(candidate, projectPath, { beforeRevalidate: options.beforeRevalidate });
  if (reviewed.state !== "proposal") {
    return {
      state: "blocked",
      proposal: null,
      findings: reviewed.findings,
      authorizationEligible: false,
      mutationAuthorization: false,
      applySupported: false,
      changesMade: 0,
    };
  }

  const source = reviewed.proposal;
  if (source.stableProjectIdentity === null) {
    return {
      state: "blocked",
      proposal: null,
      findings: [{
        code: "actionable-project-identity-required",
        effect: "blocking",
        message: "Actionable proposals require a valid schema-2 stable logical project identity. Migrate the Project Brain before preparing mutation authority.",
      }],
      authorizationEligible: false,
      mutationAuthorization: false,
      applySupported: false,
      changesMade: 0,
    };
  }

  if (source.findings.some((finding) => finding.effect === "blocking")) {
    return {
      state: "blocked",
      proposal: null,
      findings: source.findings,
      authorizationEligible: false,
      mutationAuthorization: false,
      applySupported: false,
      changesMade: 0,
    };
  }

  const scope: ActionableProposalScope = {
    domain: source.intendedScope.domain,
    changeKind: source.intendedScope.changeKind,
    proposedStatement: candidate.proposedStatement,
    targetDecisionId: source.intendedScope.targetDecisionId,
  };
  const actionability: ActionableProposalActionability = {
    authorizationEligible: true,
    mutationAuthorization: false,
    applySupported: false,
    authorizationRequired: true,
  };
  const material = {
    schemaVersion: ACTIONABLE_PROPOSAL_SCHEMA_VERSION as 1,
    actionableProposalVersion: 1 as const,
    projectLocator: source.projectLocator,
    stableProjectIdentity: source.stableProjectIdentity,
    baseline: source.baseline,
    candidate: source.candidate,
    evidence: source.evidence,
    findings: source.findings,
    mutationScope: scope,
    intentionallyUnchanged: source.intentionallyUnchanged,
    actionability,
    changesMade: 0 as const,
  };
  const digest = actionableDigest(materialOf(material));
  const proposal: ActionableProposal = {
    ...material,
    actionableProposalId: `actionable-proposal-v1:${digest}`,
    materialDigest: {
      algorithm: "sha256",
      domain: ACTIONABLE_PROPOSAL_DIGEST_DOMAIN,
      digest,
    },
    generatedAt: new Date().toISOString(),
  };
  return { state: "actionable-proposal", proposal, changesMade: 0 };
}

function parseBaseline(value: unknown): ProjectContextBaseline {
  if (!plainObject(value)) throw new Error("Actionable proposal baseline is invalid.");
  if (value.algorithm !== "sha256" || typeof value.digest !== "string" || typeof value.schemaVersion !== "number") {
    throw new Error("Actionable proposal baseline is invalid.");
  }
  return value as unknown as ProjectContextBaseline;
}

function parseScope(value: unknown): ActionableProposalScope {
  if (!plainObject(value)) throw new Error("Actionable proposal mutation scope is invalid.");
  const allowed = value.changeKind === "supersede"
    ? ["domain", "changeKind", "proposedStatement", "targetDecisionId"] as const
    : ["domain", "changeKind", "proposedStatement"] as const;
  strictKeys(value, allowed);
  if (value.domain !== "project-decision" && value.domain !== "project-goal" && value.domain !== "project-knowledge") {
    throw new Error("Actionable proposal mutation scope domain is invalid.");
  }
  if (value.changeKind !== "add" && value.changeKind !== "supersede") throw new Error("Actionable proposal mutation scope change kind is invalid.");
  if (typeof value.proposedStatement !== "string" || !value.proposedStatement.trim()) throw new Error("Actionable proposal mutation scope statement is invalid.");
  if (value.changeKind === "supersede" && (typeof value.targetDecisionId !== "string" || !value.targetDecisionId)) {
    throw new Error("Actionable proposal supersession target is invalid.");
  }
  return {
    domain: value.domain,
    changeKind: value.changeKind,
    proposedStatement: value.proposedStatement,
    targetDecisionId: typeof value.targetDecisionId === "string" ? value.targetDecisionId : undefined,
  };
}

export function parseActionableProposal(value: unknown): ActionableProposal {
  if (!plainObject(value)) throw new Error("Actionable proposal JSON must contain one object.");
  strictKeys(value, [
    "schemaVersion",
    "actionableProposalVersion",
    "actionableProposalId",
    "materialDigest",
    "generatedAt",
    "projectLocator",
    "stableProjectIdentity",
    "baseline",
    "candidate",
    "evidence",
    "findings",
    "mutationScope",
    "intentionallyUnchanged",
    "actionability",
    "changesMade",
  ]);
  if (value.schemaVersion !== 1 || value.actionableProposalVersion !== 1) throw new Error("Actionable proposal schema version is unsupported.");
  if (typeof value.actionableProposalId !== "string" || !value.actionableProposalId.startsWith("actionable-proposal-v1:")) throw new Error("Actionable proposal id is invalid.");
  if (!plainObject(value.materialDigest) || value.materialDigest.algorithm !== "sha256" || value.materialDigest.domain !== ACTIONABLE_PROPOSAL_DIGEST_DOMAIN || typeof value.materialDigest.digest !== "string") {
    throw new Error("Actionable proposal digest is invalid.");
  }
  if (typeof value.generatedAt !== "string" || typeof value.projectLocator !== "string" || typeof value.stableProjectIdentity !== "string") {
    throw new Error("Actionable proposal identity fields are invalid.");
  }
  const candidate = parseSemanticProposalCandidate(value.candidate);
  const baseline = parseBaseline(value.baseline);
  const mutationScope = parseScope(value.mutationScope);
  if (!Array.isArray(value.findings) || !Array.isArray(value.intentionallyUnchanged) || !plainObject(value.actionability)) {
    throw new Error("Actionable proposal review fields are invalid.");
  }
  if (value.actionability.authorizationEligible !== true || value.actionability.mutationAuthorization !== false || value.actionability.applySupported !== false || value.actionability.authorizationRequired !== true || value.changesMade !== 0) {
    throw new Error("Actionable proposal actionability fields are invalid.");
  }

  const parsed = value as unknown as ActionableProposal;
  const material = {
    schemaVersion: 1 as const,
    actionableProposalVersion: 1 as const,
    projectLocator: parsed.projectLocator,
    stableProjectIdentity: parsed.stableProjectIdentity,
    baseline,
    candidate,
    evidence: parsed.evidence,
    findings: parsed.findings,
    mutationScope,
    intentionallyUnchanged: parsed.intentionallyUnchanged,
    actionability: parsed.actionability,
    changesMade: 0 as const,
  };
  const digest = actionableDigest(material);
  if (digest !== parsed.materialDigest.digest || parsed.actionableProposalId !== `actionable-proposal-v1:${digest}`) {
    throw new Error("Actionable proposal material digest does not match its content.");
  }
  return { ...parsed, candidate, baseline, mutationScope };
}

export async function readActionableProposalFile(path: string): Promise<ActionableProposal> {
  let metadata;
  try { metadata = await lstat(path); } catch { throw new Error("Actionable proposal file cannot be read."); }
  if (!metadata.isFile()) throw new Error("Actionable proposal input must be a regular file.");
  if (metadata.size > ACTIONABLE_PROPOSAL_FILE_MAX_BYTES) throw new Error("Actionable proposal file exceeds the supported size limit.");
  const raw = await readFile(path, "utf8");
  if (Buffer.byteLength(raw, "utf8") > ACTIONABLE_PROPOSAL_FILE_MAX_BYTES) throw new Error("Actionable proposal file exceeds the supported size limit.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Actionable proposal file is not valid JSON."); }
  return parseActionableProposal(parsed);
}