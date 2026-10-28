import { createHash } from "node:crypto";
import { isAbsolute, resolve } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import {
  frameHashField,
  type ProjectContextManagedInputName,
} from "../runtime/project-context-material.js";
import type { ReadyKnowledgeProjection } from "./knowledge-projection.js";
import {
  assertKnowledgeSchemaTransitionPlanCurrent,
  type KnowledgeSchemaTransitionPlan,
} from "./knowledge-schema-transition-plan.js";

/**
 * NON-ISSUABLE review material for a FUTURE migration-specific Guardian
 * consumer. This is NOT a GuardianAuthorityRequest or a user approval.
 *
 * The future protected transaction must independently prove the physical
 * roots, protected source receipt, user consent, read fence and durability.
 */
export const KNOWLEDGE_MIGRATION_INTENT_DOMAIN =
  "livariant:project-brain-schema-migration-intent:v1" as const;

export interface KnowledgeMigrationIntentCandidate {
  state: "untrusted-approval-material-only";
  domain: typeof KNOWLEDGE_MIGRATION_INTENT_DOMAIN;
  materialSha256: string;
  stableProjectIdentity: string;
  transactionId: string;
  authorizationOperationId: string;
  protectedSourceRecordId: string;
  sourceSchemaVersion: 2;
  targetSchemaVersion: 3;
  sourceBaselineSha256: string;
  targetMaterialSha256: string;
  boundaries: {
    physicalPathsIndependentlyVerified: false;
    sourceGuardianRecordIndependentlyVerified: false;
    explicitUserApprovalReceived: false;
    protectedMigrationFenceArmed: false;
    guardianRequestIssuable: false;
    oneShotAuthorityUsable: false;
    canonicalWritesAllowed: false;
    targetAccepted: false;
    changesMade: 0;
  };
}

function exactUuid(value: string, label: string): string {
  if (!isStableProjectIdentity(value) || value !== value.toLowerCase()) {
    throw new Error("Schema migration intent blocked: invalid " + label);
  }
  return value;
}

function candidatePath(path: string, label: string): string {
  if (!path || !isAbsolute(path) || resolve(path) !== path || path.includes("\u0000")) {
    throw new Error("Schema migration intent blocked: " + label + " must be a normalized absolute path.");
  }
  // A path string is NEVER physical filesystem attestation. The caller must
  // still verify identity and reject links/reparse points with native handles.
  return process.platform === "win32" ? path.toLowerCase() : path;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildKnowledgeMigrationIntentCandidate(input: {
  plan: KnowledgeSchemaTransitionPlan;
  sourceProjection: ReadyKnowledgeProjection;
  originalInputs: ReadonlyMap<ProjectContextManagedInputName, Buffer>;
  transactionId: string;
  authorizationOperationId: string;
  /** Untrusted string: independent Guardian receipt proof is NOT performed. */
  protectedSourceRecordId: string;
  /** Untrusted string: native handle identity checks are NOT performed. */
  declaredPhysicalProjectRoot: string;
  declaredPhysicalBrainRoot: string;
}): KnowledgeMigrationIntentCandidate {
  assertKnowledgeSchemaTransitionPlanCurrent(input.plan, input.sourceProjection, input.originalInputs);
  const projectId = exactUuid(input.plan.stableProjectIdentity, "stable project identity");
  const transactionId = exactUuid(input.transactionId, "transaction id");
  const authorizationId = exactUuid(input.authorizationOperationId, "authorization operation id");
  const receiptId = exactUuid(input.protectedSourceRecordId, "protected source receipt id");
  if (transactionId === authorizationId || receiptId === transactionId || receiptId === authorizationId) {
    throw new Error("Schema migration intent blocked: operation and receipt identities must be distinct.");
  }
  const root = candidatePath(input.declaredPhysicalProjectRoot, "project root");
  const brain = candidatePath(input.declaredPhysicalBrainRoot, "Project Brain root");
  if (brain !== resolve(root, ".project-brain").toLowerCase()
    && brain !== resolve(root, ".project-brain")) {
    throw new Error("Schema migration intent blocked: declared Brain root does not match project root.");
  }
  const plan = input.plan;
  if (plan.source.schemaVersion !== 2 || plan.proposedTarget.schemaVersion !== 3
    || plan.proposedTarget.writesPerformed !== false
    || plan.proposedTarget.targetAccepted !== false
    || plan.boundaries.createsAuthority !== false) {
    throw new Error("Schema migration intent blocked: plan is not an inert 2 to 3 transition.");
  }
  const hash = createHash("sha256");
  const add = (label: string, value: string) =>
    frameHashField(hash, label, Buffer.from(value, "utf8"));
  add("domain", KNOWLEDGE_MIGRATION_INTENT_DOMAIN);
  add("source-schema-version", "2");
  add("target-schema-version", "3");
  add("project-id", projectId);
  add("declared-physical-project-root", root);
  add("declared-physical-brain-root", brain);
  add("transaction-id", transactionId);
  add("authorization-operation-id", authorizationId);
  add("protected-source-guardian-record-id", receiptId);
  add("source-baseline-domain", plan.source.baselineDomain);
  add("source-baseline-sha256", plan.source.baselineDigest);
  add("target-material-domain", plan.proposedTarget.targetDigestDomain);
  add("target-material-sha256", plan.proposedTarget.targetDigest);
  add("target-metadata-file-sha256", sha256(plan.proposedTarget.metadataBytes));
  add("target-registry-file-sha256", sha256(plan.proposedTarget.knowledgeIndexBytes));
  add("index-candidate-digest", plan.proposedTarget.indexCandidateDigest);
  for (const file of ["project.md", "goals.md", "decisions.md", "knowledge.md"] as const) {
    add("immutable-source:" + file, plan.source.immutableSourceDigests[file]);
  }
  return {
    state: "untrusted-approval-material-only",
    domain: KNOWLEDGE_MIGRATION_INTENT_DOMAIN,
    materialSha256: hash.digest("hex"),
    stableProjectIdentity: projectId,
    transactionId,
    authorizationOperationId: authorizationId,
    protectedSourceRecordId: receiptId,
    sourceSchemaVersion: 2,
    targetSchemaVersion: 3,
    sourceBaselineSha256: plan.source.baselineDigest,
    targetMaterialSha256: plan.proposedTarget.targetDigest,
    boundaries: {
      physicalPathsIndependentlyVerified: false,
      sourceGuardianRecordIndependentlyVerified: false,
      explicitUserApprovalReceived: false,
      protectedMigrationFenceArmed: false,
      guardianRequestIssuable: false,
      oneShotAuthorityUsable: false,
      canonicalWritesAllowed: false,
      targetAccepted: false,
      changesMade: 0,
    },
  };
}
