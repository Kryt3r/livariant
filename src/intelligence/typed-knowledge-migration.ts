import { createHash } from "node:crypto";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { runProtectedDoctor } from "../runtime/protected-doctor.js";
import {
  buildProjectKnowledgeProjection,
  type KnowledgeLifecycle,
  type KnowledgeRecordType,
  type ProjectKnowledgeRecord,
  type ReadyKnowledgeProjection,
} from "./knowledge-projection.js";

/**
 * Schema contract for a FUTURE in-place, Guardian-authorized Project Brain upgrade.
 * This module ONLY constructs a versioned preview; it never stores canonical truth,
 * upgrades metadata.json, or grants mutation/verification authority.
 */
export const TYPED_KNOWLEDGE_SCHEMA_VERSION = 1 as const;
const PREVIEW_DOMAIN = "livariant:typed-project-knowledge-migration-preview:v1";
const MAX_RECORDS = 5000;
const TYPES: ReadonlySet<string> = new Set([
  "project-identity", "goal", "decision", "fact", "observation",
  "unclassified-knowledge", "open-question",
]);

export type TypedKnowledgeDomain =
  | "unclassified" | "product" | "architecture" | "security" | "operations" | "provider";
export type TypedKnowledgeScope =
  | { kind: "unspecified" }
  | { kind: "project"; stableProjectIdentity: string }
  | { kind: "component"; componentId: string };

export interface TypedKnowledgeRevision {
  sourceRevisionDigest: string;
  // Legacy source does not prove a revision number or an authorization ID.
  revisionNumber: null;
  acceptedAuthorizationId: null;
}

export interface TypedKnowledgeRecord {
  recordId: string;
  recordType: KnowledgeRecordType;
  domain: "unclassified";
  scope: { kind: "unspecified" };
  lifecycle: KnowledgeLifecycle;
  verification: "not-assessed";
  statement: string;
  provenance: ProjectKnowledgeRecord["source"];
  revision: TypedKnowledgeRevision;
  supersededBySourceId?: string;
  grantsAuthority: false;
}

export interface TypedKnowledgeRelationship {
  kind: "supersedes";
  fromRecordId: string;
  toRecordId: string;
  grantsAuthority: false;
}

export interface TypedKnowledgeMigrationPreview {
  state: "preview-ready";
  schemaVersion: typeof TYPED_KNOWLEDGE_SCHEMA_VERSION;
  projectId: string;
  source: {
    kind: "protected-project-brain";
    schemaVersion: number;
    baselineDigest: string;
    baselineDomain: string;
  };
  target: {
    kind: "in-place-project-brain-upgrade";
    // Deliberately not a second truth store or a writable migration artifact.
    migrationCommitted: false;
    canonicalMutationAvailable: false;
  };
  records: TypedKnowledgeRecord[];
  relationships: TypedKnowledgeRelationship[];
  previewDigest: string;
  recovery: {
    sourceBaselineMustBeRevalidated: true;
    authorizedRollbackCheckpointRequiredBeforeCommit: true;
    rollbackPerformed: false;
    sourceBytesChanged: false;
  };
  boundaries: {
    derived: true;
    verifiedClassification: false;
    grantsAuthority: false;
    authorizesMigration: false;
    requiresProposalAuthorizationSemanticApplyVerification: true;
  };
  changesMade: 0;
}

export interface BlockedTypedKnowledgeMigrationPreview {
  state: "blocked";
  reason: string;
  records: [];
  relationships: [];
  grantsAuthority: false;
  changesMade: 0;
}

export type TypedKnowledgeMigrationResult =
  | TypedKnowledgeMigrationPreview
  | BlockedTypedKnowledgeMigrationPreview;

function blocked(reason: string): BlockedTypedKnowledgeMigrationPreview {
  return { state: "blocked", reason, records: [], relationships: [], grantsAuthority: false, changesMade: 0 };
}

function assertValidProjection(projection: ReadyKnowledgeProjection): void {
  if (projection.state !== "ready" || projection.schemaVersion !== 1
    || !isStableProjectIdentity(projection.stableProjectIdentity)
    || projection.baseline.schemaVersion !== 2
    || projection.baseline.algorithm !== "sha256"
    || !/^[a-f0-9]{64}$/.test(projection.baseline.digest)
    || projection.boundaries.grantsAuthority !== false
    || projection.boundaries.mutationSupported !== false
    || projection.boundaries.classificationVerified !== false
    || projection.records.length > MAX_RECORDS) {
    throw new Error("Typed knowledge migration requires a supported, non-authorizing schema-2 Project Brain projection.");
  }
  const ids = new Set<string>();
  for (const record of projection.records) {
    if (typeof record.recordId !== "string" || !record.recordId.startsWith("pkr-v1:")
      || ids.has(record.recordId) || !TYPES.has(record.recordType)
      || record.grantsAuthority !== false
      || record.domain !== "unclassified" || record.scope !== "unspecified"
      || record.verification !== "not-assessed"
      || typeof record.statement !== "string" || record.statement.trim().length === 0
      || Buffer.byteLength(record.statement, "utf8") > 8192
      || record.source.kind !== "canonical-project-brain"
      || typeof record.revisionDigest !== "string"
      || !/^sha256:[a-f0-9]{64}$/.test(record.revisionDigest)) {
      throw new Error("Typed knowledge migration found ambiguous, unsupported, or authority-bearing source material.");
    }
    ids.add(record.recordId);
  }
  const linked = new Set<string>();
  for (const relationship of projection.relationships) {
    const key = relationship.fromRecordId + ":" + relationship.toRecordId;
    if (relationship.type !== "supersedes" || relationship.grantsAuthority !== false
      || !ids.has(relationship.fromRecordId) || !ids.has(relationship.toRecordId)
      || relationship.fromRecordId === relationship.toRecordId || linked.has(key)) {
      throw new Error("Typed knowledge migration found an invalid or ambiguous canonical relationship.");
    }
    linked.add(key);
  }
}

/**
 * Deterministic, pure migration candidate. Do not trust an externally supplied
 * projection: use prepareProtectedTypedKnowledgeMigrationPreview for live data.
 */
export function planTypedKnowledgeMigration(projection: ReadyKnowledgeProjection): TypedKnowledgeMigrationPreview {
  assertValidProjection(projection);
  const records: TypedKnowledgeRecord[] = projection.records.map((record): TypedKnowledgeRecord => ({
    recordId: record.recordId,
    recordType: record.recordType,
    domain: "unclassified",
    scope: { kind: "unspecified" },
    lifecycle: record.lifecycle,
    verification: "not-assessed",
    statement: record.statement,
    provenance: { ...record.source },
    revision: {
      sourceRevisionDigest: record.revisionDigest,
      revisionNumber: null,
      acceptedAuthorizationId: null,
    },
    ...(record.supersededBy ? { supersededBySourceId: record.supersededBy } : {}),
    grantsAuthority: false,
  })).sort((a, b) => a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0);

  const relationships: TypedKnowledgeRelationship[] = projection.relationships.map((link): TypedKnowledgeRelationship => ({
    kind: "supersedes",
    fromRecordId: link.fromRecordId,
    toRecordId: link.toRecordId,
    grantsAuthority: false,
  })).sort((a, b) =>
    (a.fromRecordId < b.fromRecordId ? -1 : a.fromRecordId > b.fromRecordId ? 1 : 0)
    || (a.toRecordId < b.toRecordId ? -1 : a.toRecordId > b.toRecordId ? 1 : 0));

  const source = {
    kind: "protected-project-brain" as const,
    schemaVersion: projection.baseline.schemaVersion,
    baselineDigest: projection.baseline.digest,
    baselineDomain: projection.baseline.domain,
  };
  const previewDigest = createHash("sha256")
    .update(PREVIEW_DOMAIN + "\n" + JSON.stringify({
      projectId: projection.stableProjectIdentity, source, records, relationships,
    }), "utf8").digest("hex");

  return {
    state: "preview-ready",
    schemaVersion: TYPED_KNOWLEDGE_SCHEMA_VERSION,
    projectId: projection.stableProjectIdentity,
    source,
    target: {
      kind: "in-place-project-brain-upgrade",
      migrationCommitted: false,
      canonicalMutationAvailable: false,
    },
    records,
    relationships,
    previewDigest,
    recovery: {
      sourceBaselineMustBeRevalidated: true,
      authorizedRollbackCheckpointRequiredBeforeCommit: true,
      rollbackPerformed: false,
      sourceBytesChanged: false,
    },
    boundaries: {
      derived: true,
      verifiedClassification: false,
      grantsAuthority: false,
      authorizesMigration: false,
      requiresProposalAuthorizationSemanticApplyVerification: true,
    },
    changesMade: 0,
  };
}

/**
 * Pure replay/staleness guard for preview consumers. This does NOT verify
 * Guardian Authority or allow a migration to be committed.
 */
export function assertTypedKnowledgeMigrationPreviewStillCurrent(
  preview: TypedKnowledgeMigrationPreview,
  currentProjection: ReadyKnowledgeProjection,
): void {
  const fresh = planTypedKnowledgeMigration(currentProjection);
  if (JSON.stringify(preview) !== JSON.stringify(fresh)) {
    throw new Error("Typed knowledge migration preview differs from the exact current Project Brain baseline or record material.");
  }
}

export interface TypedKnowledgeMigrationPreviewOptions {
  // Adversarial revalidation seam, not an authorization or migration hook.
  beforeRevalidate?: () => Promise<void> | void;
}

/**
 * Protected canonical read -> typed plan -> protected recheck. No filesystem
 * writes, migrations, authorization creation, or external model calls.
 */
export async function prepareProtectedTypedKnowledgeMigrationPreview(
  projectPath: string,
  options: TypedKnowledgeMigrationPreviewOptions = {},
): Promise<TypedKnowledgeMigrationResult> {
  try {
    const beforeDoctor = await runProtectedDoctor(projectPath);
    if (beforeDoctor.state !== "healthy") return blocked("Protected Project Brain is unavailable.");
    const projection = await buildProjectKnowledgeProjection(projectPath);
    if (projection.state !== "ready") return blocked("Canonical source cannot be projected: " + projection.reason);
    const plan = planTypedKnowledgeMigration(projection);
    await options.beforeRevalidate?.();
    const afterDoctor = await runProtectedDoctor(projectPath);
    if (afterDoctor.state !== "healthy") return blocked("Protected Project Brain lost integrity during migration preview.");
    const latest = await buildProjectKnowledgeProjection(projectPath);
    if (latest.state !== "ready" || latest.stableProjectIdentity !== plan.projectId
      || latest.baseline.digest !== plan.source.baselineDigest
      || latest.baseline.domain !== plan.source.baselineDomain) {
      return blocked("Project Brain identity or accepted baseline changed during migration preview.");
    }
    return plan;
  } catch (error) {
    return blocked("Typed knowledge migration preview failed closed: " + (error instanceof Error ? error.message : "unknown error"));
  }
}
