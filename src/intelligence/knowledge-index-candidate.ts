import { createHash } from "node:crypto";
import { RESERVED_KNOWLEDGE_INDEX_FILE } from "../project-brain/store.js";
import type {
  KnowledgeLifecycle,
  KnowledgeRecordType,
  ProjectKnowledgeRecord,
  ReadyKnowledgeProjection,
} from "./knowledge-projection.js";
import { planTypedKnowledgeMigration } from "./typed-knowledge-migration.js";

/**
 * Proposed metadata-only managed index for a FUTURE protected Project Brain v3.
 * Statements remain solely in project.md/goals.md/decisions.md/knowledge.md;
 * this file can never independently create a decision, rule, fact or authority.
 *
 * This module has NO filesystem access or canonical write/authorization method.
 */
export const KNOWLEDGE_INDEX_FORMAT_VERSION = 1 as const;
export const PROPOSED_PROJECT_BRAIN_SCHEMA_VERSION = 3 as const;
export const KNOWLEDGE_INDEX_KIND = "livariant-project-brain-knowledge-index" as const;
const INDEX_DIGEST_DOMAIN = "livariant:proposed-knowledge-index:v1";
const MAX_INDEX_BYTES = 8 * 1024 * 1024;

export interface KnowledgeIndexRecord {
  recordId: string;
  recordType: KnowledgeRecordType;
  domain: "unclassified";
  scope: { kind: "unspecified" };
  lifecycle: KnowledgeLifecycle;
  verification: "not-assessed";
  provenance: ProjectKnowledgeRecord["source"];
  sourceRevisionDigest: string;
  supersededBySourceId?: string;
}

export interface KnowledgeIndexMaterial {
  kind: typeof KNOWLEDGE_INDEX_KIND;
  indexSchemaVersion: typeof KNOWLEDGE_INDEX_FORMAT_VERSION;
  proposedProjectBrainSchemaVersion: typeof PROPOSED_PROJECT_BRAIN_SCHEMA_VERSION;
  stableProjectIdentity: string;
  source: {
    projectBrainSchemaVersion: 2;
    baselineDomain: string;
    baselineDigest: string;
    migrationPreviewDigest: string;
  };
  // Deliberately NO statement/text field; the canonical markdown remains source truth.
  records: KnowledgeIndexRecord[];
  relationships: Array<{
    kind: "supersedes";
    fromRecordId: string;
    toRecordId: string;
  }>;
}

export interface KnowledgeIndexCandidate {
  state: "candidate-only";
  proposedRelativePath: ".project-brain/knowledge-registry.json";
  material: KnowledgeIndexMaterial;
  canonicalJson: string;
  candidateDigest: string;
  boundaries: {
    currentSchemaUnchanged: true;
    derivedFromCanonicalMarkdown: true;
    containsIndependentTruth: false;
    authorizedForMigration: false;
    grantsAuthority: false;
    changesMade: 0;
  };
}

/**
 * Dry-run material for exactly one future in-place managed index.
 * Only an independently authorized schema-3 migration can later write it.
 */
export function planKnowledgeIndexCandidate(projection: ReadyKnowledgeProjection): KnowledgeIndexCandidate {
  const preview = planTypedKnowledgeMigration(projection);
  const records: KnowledgeIndexRecord[] = preview.records.map((item): KnowledgeIndexRecord => ({
    recordId: item.recordId,
    recordType: item.recordType,
    domain: "unclassified",
    scope: { kind: "unspecified" },
    lifecycle: item.lifecycle,
    verification: "not-assessed",
    provenance: { ...item.provenance },
    sourceRevisionDigest: item.revision.sourceRevisionDigest,
    ...(item.supersededBySourceId ? { supersededBySourceId: item.supersededBySourceId } : {}),
  }));
  const relationships: KnowledgeIndexMaterial["relationships"] = preview.relationships.map(item => ({
    kind: "supersedes",
    fromRecordId: item.fromRecordId,
    toRecordId: item.toRecordId,
  }));
  const material: KnowledgeIndexMaterial = {
    kind: KNOWLEDGE_INDEX_KIND,
    indexSchemaVersion: KNOWLEDGE_INDEX_FORMAT_VERSION,
    proposedProjectBrainSchemaVersion: PROPOSED_PROJECT_BRAIN_SCHEMA_VERSION,
    stableProjectIdentity: preview.projectId,
    source: {
      projectBrainSchemaVersion: 2,
      baselineDomain: preview.source.baselineDomain,
      baselineDigest: preview.source.baselineDigest,
      migrationPreviewDigest: preview.previewDigest,
    },
    records,
    relationships,
  };
  const canonicalJson = JSON.stringify(material) + "\n";
  if (Buffer.byteLength(canonicalJson, "utf8") > MAX_INDEX_BYTES) {
    throw new Error("Proposed Knowledge Index exceeds the bounded canonical file size.");
  }
  return {
    state: "candidate-only",
    proposedRelativePath: ".project-brain/" + RESERVED_KNOWLEDGE_INDEX_FILE as ".project-brain/knowledge-registry.json",
    material,
    canonicalJson,
    candidateDigest: "sha256:" + createHash("sha256")
      .update(INDEX_DIGEST_DOMAIN + "\n" + canonicalJson, "utf8").digest("hex"),
    boundaries: {
      currentSchemaUnchanged: true,
      derivedFromCanonicalMarkdown: true,
      containsIndependentTruth: false,
      authorizedForMigration: false,
      grantsAuthority: false,
      changesMade: 0,
    },
  };
}

/**
 * Comparison only: canonicality of supplied candidate bytes is NOT Guardian
 * verification, and passing this check MUST NOT be used as write permission.
 */
export function assertKnowledgeIndexCandidateMatchesCurrent(
  candidate: KnowledgeIndexCandidate,
  currentProjection: ReadyKnowledgeProjection,
): void {
  const expected = planKnowledgeIndexCandidate(currentProjection);
  if (JSON.stringify(candidate) !== JSON.stringify(expected)) {
    throw new Error("Knowledge Index candidate is stale, malformed, cross-project or differs from exact accepted source projection.");
  }
}

/**
 * Strict canonical byte equivalence for a proposed index, not a protected
 * schema-3 parser/loader. A schema-2 Project Brain with this file is blocked.
 */
export function assertProposedKnowledgeIndexBytes(
  bytes: Buffer | string,
  currentProjection: ReadyKnowledgeProjection,
): void {
  const raw = typeof bytes === "string" ? bytes : bytes.toString("utf8");
  if (Buffer.byteLength(raw, "utf8") > MAX_INDEX_BYTES
    || raw !== planKnowledgeIndexCandidate(currentProjection).canonicalJson) {
    throw new Error("Proposed Knowledge Index bytes differ from current canonical Project Brain material.");
  }
}
