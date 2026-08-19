import { createHash } from "node:crypto";
import {
  validateVerificationEvidenceRecord,
  type VerificationEvidenceRecord,
} from "./verification-evidence.js";

export const VERIFICATION_TRACE_SCHEMA_VERSION = 1 as const;

export type VerificationTraceTargetKind = "requirement" | "acceptance-criterion";
export type VerificationTraceAssessmentState = "supported" | "contradicted" | "unproven";

export interface VerificationTraceImplementationClaim {
  claimId: string;
  statement: string;
}

export interface VerificationTraceTarget {
  kind: VerificationTraceTargetKind;
  id: string;
  title: string;
  implementationClaims: VerificationTraceImplementationClaim[];
}

export interface VerificationTraceInput {
  schemaVersion: 1;
  targets: VerificationTraceTarget[];
  evidence: VerificationEvidenceRecord[];
}

export interface VerificationTraceItemAssessment {
  target: Pick<VerificationTraceTarget, "kind" | "id" | "title">;
  assessment: VerificationTraceAssessmentState;
  implementationClaimIds: string[];
  evidenceIds: string[];
  sourceReferences: string[];
  reason: string;
  grantsAuthority: false;
}

export interface VerificationTraceAssessment {
  schemaVersion: 1;
  assessmentId: string;
  coverage: "all-supported" | "attention-required";
  counts: {
    supported: number;
    contradicted: number;
    unproven: number;
  };
  items: VerificationTraceItemAssessment[];
  grantsAuthority: false;
}

const STABLE_ID = /^[A-Za-z0-9._:-]+$/;
const TRACE_ASSESSMENT_ID = /^verification-trace-v1:[a-f0-9]{64}$/;

function asRecord(input: unknown, label: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${label} must be an object.`);
  }
  return input as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, allowed: string[], label: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedSet.has(key)) throw new Error(`${label} contains unsupported field '${key}'.`);
  }
  for (const key of allowed) {
    if (!(key in record)) throw new Error(`${label} is missing required field '${key}'.`);
  }
}

function stableId(value: unknown, label: string): string {
  if (typeof value !== "string" || !STABLE_ID.test(value)) {
    throw new Error(`${label} must be a nonblank stable identifier.`);
  }
  return value;
}

function nonblankText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 2048) {
    throw new Error(`${label} must be a nonblank string of at most 2048 characters.`);
  }
  return value;
}

function validateImplementationClaim(input: unknown): VerificationTraceImplementationClaim {
  const record = asRecord(input, "implementation claim");
  requireExactKeys(record, ["claimId", "statement"], "implementation claim");
  return {
    claimId: stableId(record.claimId, "implementation claimId"),
    statement: nonblankText(record.statement, "implementation claim statement"),
  };
}

function validateTraceTarget(input: unknown): VerificationTraceTarget {
  const record = asRecord(input, "verification trace target");
  requireExactKeys(record, ["kind", "id", "title", "implementationClaims"], "verification trace target");

  if (record.kind !== "requirement" && record.kind !== "acceptance-criterion") {
    throw new Error("Unsupported verification trace target kind.");
  }
  if (!Array.isArray(record.implementationClaims)) {
    throw new Error("verification trace implementationClaims must be an array.");
  }

  const claims = record.implementationClaims.map(validateImplementationClaim);
  const seenClaims = new Set<string>();
  for (const claim of claims) {
    if (seenClaims.has(claim.claimId)) throw new Error(`Duplicate implementation claim id '${claim.claimId}'.`);
    seenClaims.add(claim.claimId);
  }

  return {
    kind: record.kind,
    id: stableId(record.id, "verification trace target id"),
    title: nonblankText(record.title, "verification trace target title"),
    implementationClaims: claims,
  };
}

export function validateVerificationTraceInput(input: unknown): VerificationTraceInput {
  const record = asRecord(input, "verification trace input");
  requireExactKeys(record, ["schemaVersion", "targets", "evidence"], "verification trace input");

  if (record.schemaVersion !== VERIFICATION_TRACE_SCHEMA_VERSION) {
    throw new Error("Unsupported verification trace schemaVersion.");
  }
  if (!Array.isArray(record.targets) || record.targets.length === 0) {
    throw new Error("verification trace targets must be a nonempty array.");
  }
  if (!Array.isArray(record.evidence)) {
    throw new Error("verification trace evidence must be an array.");
  }

  const targets = record.targets.map(validateTraceTarget);
  const evidence = record.evidence.map(validateVerificationEvidenceRecord);

  const targetKeys = new Set<string>();
  const claimIds = new Set<string>();
  for (const target of targets) {
    const key = `${target.kind}:${target.id}`;
    if (targetKeys.has(key)) throw new Error(`Duplicate verification trace target '${key}'.`);
    targetKeys.add(key);
    for (const claim of target.implementationClaims) {
      if (claimIds.has(claim.claimId)) throw new Error(`Duplicate implementation claim id '${claim.claimId}'.`);
      claimIds.add(claim.claimId);
    }
  }

  for (const item of evidence) {
    const referencesClaim = item.target.kind === "implementation-claim" && claimIds.has(item.target.id);
    const referencesAcceptanceCriterion = item.target.kind === "acceptance-criterion"
      && targetKeys.has(`acceptance-criterion:${item.target.id}`);
    if (!referencesClaim && !referencesAcceptanceCriterion) {
      throw new Error(`Verification evidence '${item.evidenceId}' does not reference a target or implementation claim in this trace.`);
    }
  }

  return {
    schemaVersion: VERIFICATION_TRACE_SCHEMA_VERSION,
    targets,
    evidence,
  };
}

function relevantEvidence(target: VerificationTraceTarget, evidence: VerificationEvidenceRecord[]): VerificationEvidenceRecord[] {
  const claimIds = new Set(target.implementationClaims.map((claim) => claim.claimId));
  return evidence.filter((item) => {
    if (item.target.kind === "implementation-claim") return claimIds.has(item.target.id);
    return target.kind === "acceptance-criterion" && item.target.id === target.id;
  });
}

function assessTarget(target: VerificationTraceTarget, evidence: VerificationEvidenceRecord[]): VerificationTraceItemAssessment {
  const relevant = relevantEvidence(target, evidence);
  const contradictory = relevant.filter((item) => item.outcome === "contradicts");
  const supporting = relevant.filter((item) => item.outcome === "supports");

  let assessment: VerificationTraceAssessmentState;
  let reason: string;

  if (contradictory.length > 0) {
    assessment = "contradicted";
    reason = "Relevant verification evidence contradicts the target or one of its implementation claims.";
  } else if (supporting.length > 0) {
    assessment = "supported";
    reason = "Relevant verification evidence supports the target or one of its implementation claims; this is evidence coverage, not accepted completion.";
  } else if (target.implementationClaims.length > 0) {
    assessment = "unproven";
    reason = "Implementation is claimed, but no relevant supporting verification evidence is present.";
  } else {
    assessment = "unproven";
    reason = "No implementation claim and no relevant supporting verification evidence are present.";
  }

  return {
    target: { kind: target.kind, id: target.id, title: target.title },
    assessment,
    implementationClaimIds: target.implementationClaims.map((claim) => claim.claimId).sort(),
    evidenceIds: relevant.map((item) => item.evidenceId).sort(),
    sourceReferences: [...new Set(relevant.map((item) => item.sourceReference))].sort(),
    reason,
    grantsAuthority: false,
  };
}

function assessmentIdentity(items: VerificationTraceItemAssessment[]): string {
  const material = items
    .map((item) => ({
      target: item.target,
      assessment: item.assessment,
      implementationClaimIds: item.implementationClaimIds,
      evidenceIds: item.evidenceIds,
      sourceReferences: item.sourceReferences,
    }))
    .sort((a, b) => `${a.target.kind}:${a.target.id}`.localeCompare(`${b.target.kind}:${b.target.id}`));
  const digest = createHash("sha256").update(Buffer.from(JSON.stringify(material), "utf8")).digest("hex");
  return `verification-trace-v1:${digest}`;
}

export function assessVerificationTrace(input: unknown): VerificationTraceAssessment {
  const trace = validateVerificationTraceInput(input);
  const items = trace.targets.map((target) => assessTarget(target, trace.evidence));
  const counts = {
    supported: items.filter((item) => item.assessment === "supported").length,
    contradicted: items.filter((item) => item.assessment === "contradicted").length,
    unproven: items.filter((item) => item.assessment === "unproven").length,
  };

  return {
    schemaVersion: VERIFICATION_TRACE_SCHEMA_VERSION,
    assessmentId: assessmentIdentity(items),
    coverage: counts.contradicted === 0 && counts.unproven === 0 ? "all-supported" : "attention-required",
    counts,
    items,
    grantsAuthority: false,
  };
}

export function validateVerificationTraceAssessment(input: unknown): VerificationTraceAssessment {
  const record = asRecord(input, "verification trace assessment");
  requireExactKeys(
    record,
    ["schemaVersion", "assessmentId", "coverage", "counts", "items", "grantsAuthority"],
    "verification trace assessment",
  );
  if (record.schemaVersion !== VERIFICATION_TRACE_SCHEMA_VERSION) throw new Error("Unsupported verification trace schemaVersion.");
  if (typeof record.assessmentId !== "string" || !TRACE_ASSESSMENT_ID.test(record.assessmentId)) {
    throw new Error("verification trace assessmentId must use the verification-trace-v1 digest format.");
  }
  if (record.coverage !== "all-supported" && record.coverage !== "attention-required") {
    throw new Error("Unsupported verification trace coverage state.");
  }
  if (record.grantsAuthority !== false) throw new Error("Verification trace assessment must never grant Authority.");
  if (!Array.isArray(record.items)) throw new Error("verification trace assessment items must be an array.");
  const countsRecord = asRecord(record.counts, "verification trace counts");
  requireExactKeys(countsRecord, ["supported", "contradicted", "unproven"], "verification trace counts");
  for (const value of Object.values(countsRecord)) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("verification trace counts must be nonnegative safe integers.");
  }
  return record as unknown as VerificationTraceAssessment;
}
