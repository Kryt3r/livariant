import { createHash } from "node:crypto";

export const VERIFICATION_EVIDENCE_SCHEMA_VERSION = 1 as const;

export type VerificationTargetKind = "acceptance-criterion" | "implementation-claim";

export type VerificationEvidenceClass = "E0" | "E1" | "E2" | "E3" | "E4";

export type VerificationOutcome = "supports" | "contradicts" | "inconclusive";

export interface VerificationTargetReference {
  kind: VerificationTargetKind;
  id: string;
}

export interface VerificationEvidenceRecord {
  schemaVersion: 1;
  evidenceId: string;
  target: VerificationTargetReference;
  evidenceClass: VerificationEvidenceClass;
  outcome: VerificationOutcome;
  sourceReference: string;
  grantsAuthority: false;
}

const TARGET_KINDS = new Set<VerificationTargetKind>(["acceptance-criterion", "implementation-claim"]);
const EVIDENCE_CLASSES = new Set<VerificationEvidenceClass>(["E0", "E1", "E2", "E3", "E4"]);
const OUTCOMES = new Set<VerificationOutcome>(["supports", "contradicts", "inconclusive"]);
const STABLE_TARGET_ID = /^[A-Za-z0-9._:-]+$/;
const EVIDENCE_ID = /^verification-v1:[a-f0-9]{64}$/;
const SOURCE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/#@+\-=]*$/;

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

export function validateVerificationTargetReference(input: unknown): VerificationTargetReference {
  const record = asRecord(input, "verification target reference");
  requireExactKeys(record, ["kind", "id"], "verification target reference");

  if (typeof record.kind !== "string" || !TARGET_KINDS.has(record.kind as VerificationTargetKind)) {
    throw new Error("Unsupported verification target kind.");
  }
  if (typeof record.id !== "string" || !STABLE_TARGET_ID.test(record.id)) {
    throw new Error("Verification target id must be a nonblank stable identifier.");
  }

  return {
    kind: record.kind as VerificationTargetKind,
    id: record.id,
  };
}

export function verificationEvidenceIdentity(
  input: Pick<VerificationEvidenceRecord, "schemaVersion" | "target" | "evidenceClass" | "outcome" | "sourceReference">,
): string {
  const material = [
    String(input.schemaVersion),
    input.target.kind,
    input.target.id,
    input.evidenceClass,
    input.outcome,
    input.sourceReference,
  ].join("\n");
  const digest = createHash("sha256").update(Buffer.from(material, "utf8")).digest("hex");
  return `verification-v1:${digest}`;
}

export function validateVerificationEvidenceRecord(input: unknown): VerificationEvidenceRecord {
  const record = asRecord(input, "verification evidence record");
  requireExactKeys(
    record,
    ["schemaVersion", "evidenceId", "target", "evidenceClass", "outcome", "sourceReference", "grantsAuthority"],
    "verification evidence record",
  );

  if (record.schemaVersion !== VERIFICATION_EVIDENCE_SCHEMA_VERSION) {
    throw new Error("Unsupported verification evidence schemaVersion.");
  }
  if (typeof record.evidenceClass !== "string" || !EVIDENCE_CLASSES.has(record.evidenceClass as VerificationEvidenceClass)) {
    throw new Error("Unsupported verification evidence class.");
  }
  if (typeof record.outcome !== "string" || !OUTCOMES.has(record.outcome as VerificationOutcome)) {
    throw new Error("Unsupported verification outcome.");
  }
  if (record.grantsAuthority !== false) {
    throw new Error("Verification evidence must never grant Authority.");
  }
  if (typeof record.sourceReference !== "string" || !SOURCE_REFERENCE.test(record.sourceReference) || record.sourceReference.length > 512) {
    throw new Error("Verification sourceReference must be a stable nonblank reference without whitespace.");
  }
  if (typeof record.evidenceId !== "string" || !EVIDENCE_ID.test(record.evidenceId)) {
    throw new Error("Verification evidenceId must use the verification-v1 digest format.");
  }

  const target = validateVerificationTargetReference(record.target);
  const evidenceClass = record.evidenceClass as VerificationEvidenceClass;
  const outcome = record.outcome as VerificationOutcome;

  const evidence: VerificationEvidenceRecord = {
    schemaVersion: VERIFICATION_EVIDENCE_SCHEMA_VERSION,
    evidenceId: record.evidenceId,
    target,
    evidenceClass,
    outcome,
    sourceReference: record.sourceReference,
    grantsAuthority: false,
  };

  if (evidence.evidenceId !== verificationEvidenceIdentity(evidence)) {
    throw new Error("Verification evidenceId does not match the target, class, outcome, and source reference.");
  }

  return evidence;
}

export function createVerificationEvidenceRecord(
  input: Omit<VerificationEvidenceRecord, "evidenceId">,
): VerificationEvidenceRecord {
  const evidence: VerificationEvidenceRecord = {
    ...input,
    evidenceId: verificationEvidenceIdentity(input),
  };
  return validateVerificationEvidenceRecord(evidence);
}
