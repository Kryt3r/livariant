import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { parseDecisionsMarkdown, type DecisionRecord } from "../project-brain/decisions.js";
import { runDoctor, type DoctorFinding } from "./doctor.js";
import {
  buildProjectContextBaseline,
  frameHashField,
  projectContextManagedInputsEqual,
  readProjectContextManagedInputs,
  type ProjectContextBaseline,
} from "./project-context-material.js";

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
  domain: "project-decision";
  proposedStatement: string;
  rationale: string;
  originClaim: SemanticProposalOriginClaim;
  originVerified: false;
}

export interface AddDecisionProposalCandidate extends CandidateBase {
  changeKind: "add";
}

export interface SupersedeDecisionProposalCandidate extends CandidateBase {
  changeKind: "supersede";
  targetDecisionId: string;
}

export type SemanticProposalCandidate = AddDecisionProposalCandidate | SupersedeDecisionProposalCandidate;

export interface SemanticProposalFinding {
  category: "consistent" | "canonical-conflict" | "insufficient-evidence";
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

export interface SemanticProposalActionability {
  reviewOnly: true;
  mutationAuthorization: false;
  applySupported: false;
  authorizationEligible: false;
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
  evidence: {
    activeDecisions: SemanticProposalEvidenceDecision[];
    targetDecision?: SemanticProposalEvidenceDecision;
  };
  findings: SemanticProposalFinding[];
  intendedScope: {
    domain: "project-decision";
    changeKind: "add" | "supersede";
    targetDecisionId?: string;
    filesystemWritePlanIncluded: false;
  };
  intentionallyUnchanged: readonly [
    "historical-decision-records-except-supersession-link",
    "goals",
    "knowledge",
    "project-identity",
    "provider-native-state",
    "dependent-current-surfaces",
    "release-history",
  ];
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

function strictKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const allow = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allow.has(key)) throw new Error("Candidate schema contains an unsupported field.");
  }
  for (const key of allowed) {
    if (!(key in value)) throw new Error(`Candidate schema is missing required field: ${key}.`);
  }
}

export function parseSemanticProposalCandidate(value: unknown): SemanticProposalCandidate {
  if (!plainObject(value)) throw new Error("Candidate JSON must contain one object.");
  if (value.schemaVersion !== SEMANTIC_PROPOSAL_SCHEMA_VERSION) throw new Error("Candidate schema version is unsupported.");
  if (value.domain !== "project-decision") throw new Error("Candidate domain is unsupported.");
  if (value.changeKind !== "add" && value.changeKind !== "supersede") throw new Error("Candidate change kind is unsupported.");

  const allowed = value.changeKind === "supersede"
    ? ["schemaVersion", "domain", "changeKind", "proposedStatement", "rationale", "origin", "targetDecisionId"] as const
    : ["schemaVersion", "domain", "changeKind", "proposedStatement", "rationale", "origin"] as const;
  strictKeys(value, allowed);

  const proposedStatement = boundedText(value.proposedStatement, "Proposed statement", SEMANTIC_PROPOSAL_STATEMENT_MAX_BYTES);
  const rationale = boundedText(value.rationale, "Rationale", SEMANTIC_PROPOSAL_RATIONALE_MAX_BYTES);
  if (typeof value.origin !== "string" || !ORIGIN_CLAIMS.has(value.origin as SemanticProposalOriginClaim)) {
    throw new Error("Candidate origin claim is unsupported.");
  }
  const originClaim = value.origin as SemanticProposalOriginClaim;

  if (value.changeKind === "supersede") {
    const targetDecisionId = boundedText(value.targetDecisionId, "Target decision id", 256);
    return {
      schemaVersion: 1,
      domain: "project-decision",
      changeKind: "supersede",
      proposedStatement,
      rationale,
      originClaim,
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
    originClaim,
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

const INTENTIONALLY_UNCHANGED = [
  "historical-decision-records-except-supersession-link",
  "goals",
  "knowledge",
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
  let records: DecisionRecord[];
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
    const parsed = parseDecisionsMarkdown(captured.get("decisions.md")!.toString("utf8"));
    if (parsed.issues.length > 0) {
      return blocked(project.root, [{
        category: "insufficient-evidence",
        code: "proposal-decision-history-ambiguous",
        effect: "blocking",
        message: "Decision history is ambiguous and cannot support a review proposal.",
      }], baseline);
    }
    records = parsed.records;
  } catch {
    return blocked(project.root, [{
      category: "insufficient-evidence",
      code: "proposal-capture-failed",
      effect: "blocking",
      message: "Project decision evidence could not be captured safely.",
    }]);
  }

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
      return blocked(project.root, [{
        category: "insufficient-evidence",
        code: "supersede-target-not-active",
        effect: "blocking",
        message: "Decision supersession requires exactly one structured active target decision on the bound baseline.",
      }], baseline);
    }
    target = matches[0];
    findings = [{
      category: "canonical-conflict",
      code: "explicit-supersession-target",
      effect: "review-required",
      message: "The candidate explicitly proposes superseding the named active canonical decision while preserving its historical record.",
    }];
  }

  const evidence = {
    activeDecisions: active.map(evidenceDecision),
    targetDecision: target ? evidenceDecision(target) : undefined,
  };
  const intendedScope = {
    domain: "project-decision" as const,
    changeKind: candidate.changeKind,
    targetDecisionId: candidate.changeKind === "supersede" ? candidate.targetDecisionId : undefined,
    filesystemWritePlanIncluded: false as const,
  };

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
    evidence,
    findings,
    intendedScope,
    intentionallyUnchanged: INTENTIONALLY_UNCHANGED,
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
