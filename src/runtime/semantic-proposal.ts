import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import type { DecisionRecord } from "../project-brain/decisions.js";
import { runDoctor, type DoctorFinding } from "./doctor.js";
import {
  buildProjectContextBaseline,
  frameHashField,
  projectContextManagedInputsEqual,
  readProjectContextManagedInputs,
  type ProjectContextBaseline,
} from "./project-context-material.js";
import { readProjectBrainSemanticRegions } from "./project-brain-semantics.js";

export const SEMANTIC_PROPOSAL_SCHEMA_VERSION = 1;
export const SEMANTIC_PROPOSAL_CANDIDATE_FILE_MAX_BYTES = 64 * 1024;
export const SEMANTIC_PROPOSAL_STATEMENT_MAX_BYTES = 4 * 1024;
export const SEMANTIC_PROPOSAL_RATIONALE_MAX_BYTES = 8 * 1024;
const SEMANTIC_PROPOSAL_DIGEST_DOMAIN = "livariant:semantic-proposal:v1";

export type SemanticProposalOriginClaim =
  | "explicit-user"
  | "provider-observation"
  | "project-evidence"
  | "livariant-inference";

interface CandidateBase {
  schemaVersion: 1;
  proposedStatement: string;
  rationale: string;
  originClaim: SemanticProposalOriginClaim;
  originVerified: false;
}

export interface AddDecisionProposalCandidate extends CandidateBase {
  domain: "project-decision";
  changeKind: "add";
}

export interface SupersedeDecisionProposalCandidate extends CandidateBase {
  domain: "project-decision";
  changeKind: "supersede";
  targetDecisionId: string;
}

export interface AddGoalProposalCandidate extends CandidateBase {
  domain: "project-goal";
  changeKind: "add";
}

export interface AddKnowledgeProposalCandidate extends CandidateBase {
  domain: "project-knowledge";
  changeKind: "add";
}

export type SemanticProposalCandidate =
  | AddDecisionProposalCandidate
  | SupersedeDecisionProposalCandidate
  | AddGoalProposalCandidate
  | AddKnowledgeProposalCandidate;

export interface SemanticProposalFinding {
  category: "consistent" | "canonical-conflict" | "insufficient-evidence" | "scope-conflict";
  code: string;
  effect: "informational" | "review-required" | "blocking";
  message: string;
}

export interface SemanticProposalEvidenceDecision {
  id: string;
  status: "active" | "superseded";
  text: string;
  supersededBy?: string;
  legacy: boolean;
  authorityClass: "canonical-project";
}

export interface SemanticProposalEvidenceScalar {
  value: string;
  authorityClass: "canonical-project" | "unresolved-project" | "noncanonical-project";
}

export interface SemanticProposalActionability {
  reviewOnly: true;
  mutationAuthorization: false;
  applySupported: false;
  authorizationEligible: false;
}

export interface SemanticProposalEvidence {
  activeDecisions?: SemanticProposalEvidenceDecision[];
  targetDecision?: SemanticProposalEvidenceDecision;
  confirmedGoals?: SemanticProposalEvidenceScalar[];
  nonCanonicalMatches?: SemanticProposalEvidenceScalar[];
  knownFacts?: SemanticProposalEvidenceScalar[];
  unresolvedUnknownMatches?: SemanticProposalEvidenceScalar[];
}

export interface SemanticProposal {
  schemaVersion: 1;
  proposalVersion: 1;
  proposalId: string;
  materialDigest: {
    algorithm: "sha256";
    domain: typeof SEMANTIC_PROPOSAL_DIGEST_DOMAIN;
    digest: string;
  };
  generatedAt: string;
  projectLocator: string;
  stableProjectIdentity: null;
  baseline: ProjectContextBaseline;
  candidate: SemanticProposalCandidate;
  evidence: SemanticProposalEvidence;
  findings: SemanticProposalFinding[];
  intendedScope: {
    domain: "project-decision" | "project-goal" | "project-knowledge";
    changeKind: "add" | "supersede";
    targetDecisionId?: string;
    filesystemWritePlanIncluded: false;
  };
  intentionallyUnchanged: readonly string[];
  actionability: SemanticProposalActionability;
  changesMade: 0;
}

export interface BlockedSemanticProposalResult {
  state: "blocked";
  projectLocator: string;
  stableProjectIdentity: null;
  baseline: ProjectContextBaseline | null;
  proposal: null;
  findings: Array<SemanticProposalFinding | DoctorFinding>;
  reviewOnly: true;
  mutationAuthorization: false;
  applySupported: false;
  authorizationEligible: false;
  changesMade: 0;
}

export interface ReadySemanticProposalResult {
  state: "proposal";
  proposal: SemanticProposal;
  changesMade: 0;
}

export type SemanticProposalResult = ReadySemanticProposalResult | BlockedSemanticProposalResult;

export interface SemanticProposalBuildOptions {
  beforeRevalidate?: () => void | Promise<void>;
}

const ORIGIN_CLAIMS = new Set<SemanticProposalOriginClaim>([
  "explicit-user",
  "provider-observation",
  "project-evidence",
  "livariant-inference",
]);

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function boundedText(value: unknown, label: string, maxBytes: number): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  if (Buffer.byteLength(normalized, "utf8") > maxBytes) throw new Error(`${label} exceeds the supported size limit.`);
  return normalized;
}

function boundedScalarText(value: unknown, label: string, maxBytes: number): string {
  const normalized = boundedText(value, label, maxBytes);
  if (/\r|\n/.test(normalized)) throw new Error(`${label} must be a single-line scalar value.`);
  return normalized;
}

function strictKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const allow = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allow.has(key)) throw new Error("Candidate schema contains an unsupported field.");
  }
  for (const key of allowed) {
    if (!(key in value)) throw new Error(`Candidate schema is missing required field: ${key}.`);
  }
}

function originClaim(value: unknown): SemanticProposalOriginClaim {
  if (typeof value !== "string" || !ORIGIN_CLAIMS.has(value as SemanticProposalOriginClaim)) {
    throw new Error("Candidate origin claim is unsupported.");
  }
  return value as SemanticProposalOriginClaim;
}

export function parseSemanticProposalCandidate(value: unknown): SemanticProposalCandidate {
  if (!plainObject(value)) throw new Error("Candidate JSON must contain one object.");
  if (value.schemaVersion !== SEMANTIC_PROPOSAL_SCHEMA_VERSION) throw new Error("Candidate schema version is unsupported.");

  if (value.domain === "project-decision") {
    if (value.changeKind !== "add" && value.changeKind !== "supersede") throw new Error("Candidate change kind is unsupported.");
    const allowed = value.changeKind === "supersede"
      ? ["schemaVersion", "domain", "changeKind", "proposedStatement", "rationale", "origin", "targetDecisionId"] as const
      : ["schemaVersion", "domain", "changeKind", "proposedStatement", "rationale", "origin"] as const;
    strictKeys(value, allowed);

    const proposedStatement = boundedText(value.proposedStatement, "Proposed statement", SEMANTIC_PROPOSAL_STATEMENT_MAX_BYTES);
    const rationale = boundedText(value.rationale, "Rationale", SEMANTIC_PROPOSAL_RATIONALE_MAX_BYTES);
    const origin = originClaim(value.origin);

    if (value.changeKind === "supersede") {
      const targetDecisionId = boundedText(value.targetDecisionId, "Target decision id", 256);
      return {
        schemaVersion: 1,
        domain: "project-decision",
        changeKind: "supersede",
        proposedStatement,
        rationale,
        originClaim: origin,
        originVerified: false,
        targetDecisionId,
      };
    }

    return {
      schemaVersion: 1,
      domain: "project-decision",
      changeKind: "add",
      proposedStatement,
      rationale,
      originClaim: origin,
      originVerified: false,
    };
  }

  if (value.domain !== "project-goal" && value.domain !== "project-knowledge") {
    throw new Error("Candidate domain is unsupported.");
  }
  if (value.changeKind !== "add") throw new Error("Candidate change kind is unsupported.");
  strictKeys(value, ["schemaVersion", "domain", "changeKind", "proposedStatement", "rationale", "origin"]);

  const proposedStatement = boundedScalarText(value.proposedStatement, "Proposed statement", SEMANTIC_PROPOSAL_STATEMENT_MAX_BYTES);
  const rationale = boundedText(value.rationale, "Rationale", SEMANTIC_PROPOSAL_RATIONALE_MAX_BYTES);
  const origin = originClaim(value.origin);

  return {
    schemaVersion: 1,
    domain: value.domain,
    changeKind: "add",
    proposedStatement,
    rationale,
    originClaim: origin,
    originVerified: false,
  };
}

export async function readSemanticProposalCandidateFile(path: string): Promise<SemanticProposalCandidate> {
  let metadata;
  try {
    metadata = await lstat(path);
  } catch {
    throw new Error("Candidate file cannot be read.");
  }
  if (!metadata.isFile()) throw new Error("Candidate input must be a regular file.");
  if (metadata.size > SEMANTIC_PROPOSAL_CANDIDATE_FILE_MAX_BYTES) throw new Error("Candidate file exceeds the supported size limit.");

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error("Candidate file cannot be read.");
  }
  if (Buffer.byteLength(raw, "utf8") > SEMANTIC_PROPOSAL_CANDIDATE_FILE_MAX_BYTES) {
    throw new Error("Candidate file exceeds the supported size limit.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Candidate file is not valid JSON.");
  }
  return parseSemanticProposalCandidate(parsed);
}

function evidenceDecision(record: DecisionRecord): SemanticProposalEvidenceDecision {
  return {
    id: record.id,
    status: record.status,
    text: record.text,
    supersededBy: record.supersededBy,
    legacy: record.legacy,
    authorityClass: "canonical-project",
  };
}

function blocked(
  projectLocator: string,
  findings: Array<SemanticProposalFinding | DoctorFinding>,
  baseline: ProjectContextBaseline | null = null,
): BlockedSemanticProposalResult {
  return {
    state: "blocked",
    projectLocator,
    stableProjectIdentity: null,
    baseline,
    proposal: null,
    findings,
    reviewOnly: true,
    mutationAuthorization: false,
    applySupported: false,
    authorizationEligible: false,
    changesMade: 0,
  };
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
  throw new Error("Unsupported material proposal field type.");
}

function proposalDigest(material: object): string {
  const hash = createHash("sha256");
  frameHashField(hash, "domain", Buffer.from(SEMANTIC_PROPOSAL_DIGEST_DOMAIN, "utf8"));
  hashMaterial(hash, "proposal", material);
  return hash.digest("hex");
}

const DECISION_INTENTIONALLY_UNCHANGED = [
  "historical-decision-records-except-supersession-link",
  "goals",
  "knowledge",
  "project-identity",
  "provider-native-state",
  "dependent-current-surfaces",
  "release-history",
] as const;

const GOAL_INTENTIONALLY_UNCHANGED = [
  "decisions",
  "knowledge",
  "project-identity",
  "provider-native-state",
  "dependent-current-surfaces",
  "release-history",
] as const;

const KNOWLEDGE_INTENTIONALLY_UNCHANGED = [
  "goals",
  "decisions",
  "known-unknowns",
  "project-identity",
  "provider-native-state",
  "dependent-current-surfaces",
  "release-history",
] as const;

const ACTIONABILITY: SemanticProposalActionability = {
  reviewOnly: true,
  mutationAuthorization: false,
  applySupported: false,
  authorizationEligible: false,
};

function decisionAnalysis(candidate: AddDecisionProposalCandidate | SupersedeDecisionProposalCandidate, records: DecisionRecord[]) {
  const active = records.filter((record) => record.status === "active");
  let target: DecisionRecord | undefined;
  let findings: SemanticProposalFinding[];

  if (candidate.changeKind === "add") {
    const duplicate = active.find((record) => record.text === candidate.proposedStatement);
    findings = duplicate
      ? [{
          category: "consistent",
          code: "exact-active-duplicate",
          effect: "informational",
          message: "An exactly matching active decision already exists; this candidate does not establish a need for another durable decision record.",
        }]
      : [{
          category: "insufficient-evidence",
          code: "semantic-relation-not-evaluated",
          effect: "review-required",
          message: "This slice does not establish semantic conflict or consistency between a new decision statement and different active decisions.",
        }];
  } else {
    const matches = records.filter((record) => record.id === candidate.targetDecisionId);
    if (matches.length !== 1 || matches[0].status !== "active" || matches[0].legacy) {
      return { blockedFinding: {
        category: "insufficient-evidence" as const,
        code: "supersede-target-not-active",
        effect: "blocking" as const,
        message: "Decision supersession requires exactly one structured active target decision on the bound baseline.",
      } };
    }
    target = matches[0];
    findings = [{
      category: "canonical-conflict",
      code: "explicit-supersession-target",
      effect: "review-required",
      message: "The candidate explicitly proposes superseding the named active canonical decision while preserving its historical record.",
    }];
  }

  return {
    evidence: {
      activeDecisions: active.map(evidenceDecision),
      targetDecision: target ? evidenceDecision(target) : undefined,
    },
    findings,
    intendedScope: {
      domain: "project-decision" as const,
      changeKind: candidate.changeKind,
      targetDecisionId: candidate.changeKind === "supersede" ? candidate.targetDecisionId : undefined,
      filesystemWritePlanIncluded: false as const,
    },
    intentionallyUnchanged: DECISION_INTENTIONALLY_UNCHANGED,
  };
}

function goalAnalysis(candidate: AddGoalProposalCandidate, confirmedGoals: string[], nonCanonicalGoalBullets: string[]) {
  const duplicate = confirmedGoals.includes(candidate.proposedStatement);
  const outsideMatches = nonCanonicalGoalBullets.filter((value) => value === candidate.proposedStatement);
  const findings: SemanticProposalFinding[] = duplicate
    ? [{
        category: "consistent",
        code: "exact-confirmed-goal-duplicate",
        effect: "informational",
        message: "An exactly matching confirmed goal already exists; this candidate does not establish a need for another goal entry.",
      }]
    : outsideMatches.length > 0
      ? [{
          category: "scope-conflict",
          code: "goal-match-outside-confirmed-region",
          effect: "review-required",
          message: "The same text exists outside the confirmed-goal region. This slice does not treat that occurrence as a confirmed goal or modify it.",
        }]
      : [{
          category: "insufficient-evidence",
          code: "goal-semantic-relation-not-evaluated",
          effect: "review-required",
          message: "This slice does not establish semantic conflict or consistency between a new goal and different confirmed goals.",
        }];

  return {
    evidence: {
      confirmedGoals: confirmedGoals.map((value) => ({ value, authorityClass: "canonical-project" as const })),
      nonCanonicalMatches: outsideMatches.map((value) => ({ value, authorityClass: "noncanonical-project" as const })),
    },
    findings,
    intendedScope: {
      domain: "project-goal" as const,
      changeKind: "add" as const,
      filesystemWritePlanIncluded: false as const,
    },
    intentionallyUnchanged: GOAL_INTENTIONALLY_UNCHANGED,
  };
}

function knowledgeAnalysis(candidate: AddKnowledgeProposalCandidate, knownFacts: string[], unresolvedUnknowns: string[]) {
  const duplicate = knownFacts.includes(candidate.proposedStatement);
  const unresolvedMatches = unresolvedUnknowns.filter((value) => value === candidate.proposedStatement);
  const findings: SemanticProposalFinding[] = duplicate
    ? [{
        category: "consistent",
        code: "exact-confirmed-knowledge-duplicate",
        effect: "informational",
        message: "An exactly matching confirmed project fact already exists; this candidate does not establish a need for another knowledge entry.",
      }]
    : unresolvedMatches.length > 0
      ? [{
          category: "scope-conflict",
          code: "knowledge-matches-unresolved-unknown",
          effect: "review-required",
          message: "The same text currently appears as an unresolved unknown. This add-only slice does not treat it as confirmed knowledge or resolve the older unknown.",
        }]
      : [{
          category: "insufficient-evidence",
          code: "knowledge-semantic-relation-not-evaluated",
          effect: "review-required",
          message: "This slice does not establish semantic conflict or consistency between a new project fact and different confirmed knowledge.",
        }];

  return {
    evidence: {
      knownFacts: knownFacts.map((value) => ({ value, authorityClass: "canonical-project" as const })),
      unresolvedUnknownMatches: unresolvedMatches.map((value) => ({ value, authorityClass: "unresolved-project" as const })),
    },
    findings,
    intendedScope: {
      domain: "project-knowledge" as const,
      changeKind: "add" as const,
      filesystemWritePlanIncluded: false as const,
    },
    intentionallyUnchanged: KNOWLEDGE_INTENTIONALLY_UNCHANGED,
  };
}

export async function buildSemanticProposal(
  candidate: SemanticProposalCandidate,
  projectPath: string = process.cwd(),
  options: SemanticProposalBuildOptions = {},
): Promise<SemanticProposalResult> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") {
    const doctor = await runDoctor(project.root);
    return blocked(project.root, doctor.findings);
  }

  const doctorBefore = await runDoctor(project.root);
  if (doctorBefore.state !== "healthy") return blocked(project.root, doctorBefore.findings);

  let captured;
  let baseline: ProjectContextBaseline;
  let semantic;
  try {
    captured = await readProjectContextManagedInputs(inspection.path);
    const metadata = JSON.parse(captured.get("metadata.json")!.toString("utf8")) as { projectBrain?: { schemaVersion?: unknown } };
    const schemaVersion = metadata.projectBrain?.schemaVersion;
    if (typeof schemaVersion !== "number") {
      return blocked(project.root, [{
        category: "insufficient-evidence",
        code: "proposal-metadata-invalid",
        effect: "blocking",
        message: "Project Brain schema version is unavailable for proposal baseline construction.",
      }]);
    }
    baseline = buildProjectContextBaseline(captured, schemaVersion);
    semantic = readProjectBrainSemanticRegions(captured);
    if (candidate.domain === "project-decision" && semantic.decisionIssues.length > 0) {
      return blocked(project.root, [{
        category: "insufficient-evidence",
        code: "proposal-decision-history-ambiguous",
        effect: "blocking",
        message: "Decision history is ambiguous and cannot support a review proposal.",
      }], baseline);
    }
  } catch {
    return blocked(project.root, [{
      category: "insufficient-evidence",
      code: "proposal-capture-failed",
      effect: "blocking",
      message: "Project semantic evidence could not be captured safely.",
    }]);
  }

  let analysis;
  if (candidate.domain === "project-decision") {
    const decision = decisionAnalysis(candidate, semantic.decisionRecords);
    const blockedFinding = decision.blockedFinding as SemanticProposalFinding | undefined;
    if (blockedFinding) return blocked(project.root, [blockedFinding], baseline);
    analysis = decision;
  } else if (candidate.domain === "project-goal") {
    analysis = goalAnalysis(candidate, semantic.confirmedGoals, semantic.nonCanonicalGoalBullets);
  } else {
    analysis = knowledgeAnalysis(candidate, semantic.knownFacts, semantic.unresolvedUnknowns);
  }

  await options.beforeRevalidate?.();

  const inspectionAfter = await store.inspect();
  if (inspectionAfter.health !== "valid") {
    const doctor = await runDoctor(project.root);
    return blocked(project.root, doctor.findings, baseline);
  }
  let recaptured;
  try {
    recaptured = await readProjectContextManagedInputs(inspectionAfter.path);
  } catch {
    return blocked(project.root, [{
      category: "insufficient-evidence",
      code: "proposal-revalidation-failed",
      effect: "blocking",
      message: "Project Brain could not be revalidated after proposal analysis.",
    }], baseline);
  }
  if (!projectContextManagedInputsEqual(captured, recaptured)) {
    return blocked(project.root, [{
      category: "insufficient-evidence",
      code: "proposal-concurrent-change",
      effect: "blocking",
      message: "Project Brain changed while the semantic proposal was being built. Retry from a fresh baseline.",
    }], baseline);
  }

  const doctorAfter = await runDoctor(project.root);
  if (doctorAfter.state !== "healthy") return blocked(project.root, doctorAfter.findings, baseline);

  const material = {
    schemaVersion: SEMANTIC_PROPOSAL_SCHEMA_VERSION,
    proposalVersion: 1 as const,
    projectLocator: project.root,
    stableProjectIdentity: null,
    baseline,
    candidate,
    evidence: analysis.evidence,
    findings: analysis.findings,
    intendedScope: analysis.intendedScope,
    intentionallyUnchanged: analysis.intentionallyUnchanged,
    actionability: ACTIONABILITY,
    changesMade: 0 as const,
  };
  const digest = proposalDigest(material);
  const proposal: SemanticProposal = {
    ...material,
    schemaVersion: 1,
    proposalVersion: 1,
    proposalId: `semantic-proposal-v1:${digest}`,
    materialDigest: {
      algorithm: "sha256",
      domain: SEMANTIC_PROPOSAL_DIGEST_DOMAIN,
      digest,
    },
    generatedAt: new Date().toISOString(),
  };
  return { state: "proposal", proposal, changesMade: 0 };
}
