import { createHash } from "node:crypto";
import { ProjectBrainStore } from "../project-brain/store.js";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { buildProjectContextSnapshot } from "../runtime/context-snapshot.js";
import { buildProjectContextBaseline, readProjectContextManagedInputs, type ProjectContextBaseline } from "../runtime/project-context-material.js";
import { readProjectBrainSemanticRegions } from "../runtime/project-brain-semantics.js";

/**
 * A READ-ONLY, baseline-bound projection of the accepted Project Brain.
 *
 * No record in this derived view can grant Authority or create new Project Truth.
 * Legacy markdown does not encode domain, scope, verification or creation date:
 * do not invent those values from prose or from apparent semantics.
 */
export type KnowledgeRecordType = "project-identity" | "goal" | "decision" | "fact" | "open-question";
export type KnowledgeLifecycle = "active" | "superseded" | "unresolved";

export interface ProjectKnowledgeRecord {
  recordId: string;
  recordType: KnowledgeRecordType;
  domain: "unclassified";
  scope: "unspecified";
  lifecycle: KnowledgeLifecycle;
  verification: "not-assessed";
  statement: string;
  source: {
    kind: "canonical-project-brain";
    document: "project.md" | "goals.md" | "decisions.md" | "knowledge.md";
    sourceRecordId?: string;
    structuredIdentity: boolean;
  };
  revisionDigest: string;
  supersededBy?: string;
  grantsAuthority: false;
}

export interface KnowledgeLink {
  type: "supersedes";
  fromRecordId: string;
  toRecordId: string;
  grantsAuthority: false;
}

interface ProjectionBase {
  schemaVersion: 1;
  stableProjectIdentity: string | null;
  baseline: ProjectContextBaseline | null;
  boundaries: {
    source: "accepted-project-brain";
    derived: true;
    grantsAuthority: false;
    mutationSupported: false;
    classificationVerified: false;
  };
  changesMade: 0;
}

export interface ReadyKnowledgeProjection extends ProjectionBase {
  state: "ready";
  stableProjectIdentity: string;
  baseline: ProjectContextBaseline;
  records: ProjectKnowledgeRecord[];
  relationships: KnowledgeLink[];
}

export interface BlockedKnowledgeProjection extends ProjectionBase {
  state: "blocked";
  reason: string;
  records: [];
  relationships: [];
}

export type KnowledgeProjection = ReadyKnowledgeProjection | BlockedKnowledgeProjection;

export interface KnowledgeProjectionOptions {
  // Testing/revalidation seam. It cannot authorize writes or bypass any checks.
  beforeRevalidate?: () => Promise<void> | void;
}

const BOUNDARIES = {
  source: "accepted-project-brain",
  derived: true,
  grantsAuthority: false,
  mutationSupported: false,
  classificationVerified: false,
} as const;

const MAX_PROJECTION_RECORDS = 5000;
const MAX_STATEMENT_BYTES = 8192;

function digest(...fields: string[]): string {
  const hash = createHash("sha256");
  for (const field of fields) {
    const bytes = Buffer.from(field, "utf8");
    const size = Buffer.allocUnsafe(4);
    size.writeUInt32BE(bytes.length, 0);
    hash.update(size).update(bytes);
  }
  return hash.digest("hex");
}

function blocked(reason: string): BlockedKnowledgeProjection {
  return {
    schemaVersion: 1, state: "blocked", stableProjectIdentity: null, baseline: null,
    boundaries: BOUNDARIES, records: [], relationships: [], reason, changesMade: 0,
  };
}

function assertStatement(value: string): void {
  if (value.trim().length === 0 || Buffer.byteLength(value, "utf8") > MAX_STATEMENT_BYTES) {
    throw new Error("Project Brain knowledge statement is empty or exceeds the projection limit.");
  }
}

interface CandidateRecord {
  recordType: KnowledgeRecordType;
  lifecycle: KnowledgeLifecycle;
  statement: string;
  document: ProjectKnowledgeRecord["source"]["document"];
  sourceRecordId?: string;
  structuredIdentity: boolean;
  supersededBy?: string;
}

function projectRecords(entries: CandidateRecord[]): {
  records: ProjectKnowledgeRecord[];
  relationships: KnowledgeLink[];
} {
  if (entries.length > MAX_PROJECTION_RECORDS) throw new Error("Project Brain knowledge projection exceeds the supported record count.");
  const ids = new Set<string>();
  const seenLegacy = new Map<string, number>();
  const records: ProjectKnowledgeRecord[] = [];

  for (const item of entries) {
    assertStatement(item.statement);
    const identityMaterial = item.structuredIdentity
      ? item.sourceRecordId!
      : digest(item.recordType, item.document, item.statement);
    const uniqueness = item.recordType + "|" + item.document + "|" + identityMaterial;
    const ordinal = seenLegacy.get(uniqueness) ?? 0;
    if (!item.structuredIdentity) seenLegacy.set(uniqueness, ordinal + 1);
    const recordId = "pkr-v1:" + digest(
      item.recordType, item.document,
      item.structuredIdentity ? "structured" : "legacy",
      identityMaterial, item.structuredIdentity ? "" : String(ordinal),
    );
    if (ids.has(recordId)) throw new Error("Knowledge projection has a duplicate canonical identity.");
    ids.add(recordId);
    records.push({
      recordId,
      recordType: item.recordType,
      domain: "unclassified",
      scope: "unspecified",
      lifecycle: item.lifecycle,
      verification: "not-assessed",
      statement: item.statement,
      source: {
        kind: "canonical-project-brain",
        document: item.document,
        ...(item.sourceRecordId ? { sourceRecordId: item.sourceRecordId } : {}),
        structuredIdentity: item.structuredIdentity,
      },
      revisionDigest: "sha256:" + digest(
        item.statement, item.lifecycle, item.supersededBy ?? "", item.sourceRecordId ?? "",
      ),
      ...(item.supersededBy ? { supersededBy: item.supersededBy } : {}),
      grantsAuthority: false,
    });
  }

  const decisionBySource = new Map<string, ProjectKnowledgeRecord>();
  for (const item of records) {
    if (item.recordType === "decision" && item.source.structuredIdentity && item.source.sourceRecordId) {
      decisionBySource.set(item.source.sourceRecordId, item);
    }
  }
  const relationships: KnowledgeLink[] = [];
  for (const item of records) {
    if (!item.supersededBy) continue;
    const replacement = decisionBySource.get(item.supersededBy);
    if (!replacement || replacement.lifecycle !== "active") {
      throw new Error("Knowledge projection encountered an unresolved decision supersession.");
    }
    relationships.push({
      type: "supersedes",
      fromRecordId: replacement.recordId,
      toRecordId: item.recordId,
      grantsAuthority: false,
    });
  }
  return { records, relationships };
}

/**
 * Builds a snapshot-bound catalogue without importing or migrating old data.
 * The canonical Project Brain is read and health-checked, then revalidated
 * against the SAME baseline before the derived catalogue is returned.
 */
export async function buildProjectKnowledgeProjection(
  projectPath: string,
  options: KnowledgeProjectionOptions = {},
): Promise<KnowledgeProjection> {
  try {
    const before = await buildProjectContextSnapshot(projectPath);
    if (before.safetyState !== "clear") return blocked("Canonical Project Brain is not healthy and cannot be projected.");
    if (!isStableProjectIdentity(before.stableProjectIdentity)) {
      return blocked("Stable schema-2 Project Brain identity is required for a knowledge projection.");
    }

    const store = new ProjectBrainStore(before.projectLocator);
    const inspection = await store.inspect();
    if (inspection.health !== "valid") return blocked("Project Brain inspection changed during projection.");
    const inputs = await readProjectContextManagedInputs(inspection.path);
    const baseline = buildProjectContextBaseline(inputs, before.baseline.schemaVersion);
    if (baseline.digest !== before.baseline.digest || baseline.schemaVersion !== before.baseline.schemaVersion) {
      return blocked("Project Brain changed while knowledge was being projected.");
    }
    const regions = readProjectBrainSemanticRegions(inputs);
    if (regions.decisionIssues.length > 0) return blocked("Project Brain decision history is ambiguous.");

    const entries: CandidateRecord[] = [
      ...regions.projectIdentity.map(statement => ({
        recordType: "project-identity" as const, lifecycle: "active" as const,
        document: "project.md" as const, statement, structuredIdentity: false,
      })),
      ...regions.confirmedGoals.map(statement => ({
        recordType: "goal" as const, lifecycle: "active" as const,
        document: "goals.md" as const, statement, structuredIdentity: false,
      })),
      ...regions.decisionRecords.map(item => ({
        recordType: "decision" as const,
        lifecycle: item.status, document: "decisions.md" as const, statement: item.text,
        sourceRecordId: item.legacy ? undefined : item.id,
        structuredIdentity: !item.legacy,
        ...(item.supersededBy ? { supersededBy: item.supersededBy } : {}),
      })),
      ...regions.knownFacts.map(statement => ({
        recordType: "fact" as const, lifecycle: "active" as const,
        document: "knowledge.md" as const, statement, structuredIdentity: false,
      })),
      ...regions.unresolvedUnknowns.map(statement => ({
        recordType: "open-question" as const, lifecycle: "unresolved" as const,
        document: "knowledge.md" as const, statement, structuredIdentity: false,
      })),
    ];
    const { records, relationships } = projectRecords(entries);

    await options.beforeRevalidate?.();
    const after = await buildProjectContextSnapshot(projectPath);
    if (after.safetyState !== "clear" || after.stableProjectIdentity !== before.stableProjectIdentity
      || after.baseline.digest !== before.baseline.digest || after.baseline.schemaVersion !== before.baseline.schemaVersion) {
      return blocked("Project Brain became stale, changed identity or lost integrity during projection.");
    }
    return {
      schemaVersion: 1, state: "ready", stableProjectIdentity: before.stableProjectIdentity,
      baseline: before.baseline, boundaries: BOUNDARIES, records, relationships, changesMade: 0,
    };
  } catch (error) {
    return blocked("Knowledge projection failed closed: " + (error instanceof Error ? error.message : "unknown error"));
  }
}
