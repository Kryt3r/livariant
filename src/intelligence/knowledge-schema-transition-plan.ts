import { createHash } from "node:crypto";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import {
  PROJECT_CONTEXT_MANAGED_INPUTS,
  buildProjectContextBaseline,
  frameHashField,
  type ProjectContextManagedInputName,
} from "../runtime/project-context-material.js";
import type { ReadyKnowledgeProjection } from "./knowledge-projection.js";
import { planKnowledgeIndexCandidate } from "./knowledge-index-candidate.js";

/**
 * A pure, offline SOURCE -> PROPOSED TARGET transition specification.
 * This is not the canonical v3 format, a migration writer, a protected integrity
 * receipt or an authorization token. Existing v2 reads/writes remain unchanged.
 */
export const KNOWLEDGE_TRANSITION_PLAN_VERSION = 1 as const;
export const PROPOSED_KNOWLEDGE_TARGET_DOMAIN = "livariant:proposed-project-brain-v3-target:v1";
const SOURCE_SCHEMA_VERSION = 2;
const TARGET_SCHEMA_VERSION = 3;
const MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_METADATA_BYTES = 128 * 1024;

const UNCHANGED_STATEMENTS = ["project.md", "goals.md", "decisions.md", "knowledge.md"] as const;

export interface KnowledgeSchemaTransitionPlan {
  state: "plan-only";
  schemaVersion: typeof KNOWLEDGE_TRANSITION_PLAN_VERSION;
  stableProjectIdentity: string;
  source: {
    schemaVersion: 2;
    baselineDigest: string;
    baselineDomain: string;
    immutableSourceDigests: Record<(typeof UNCHANGED_STATEMENTS)[number], string>;
  };
  proposedTarget: {
    schemaVersion: 3;
    targetDigestDomain: typeof PROPOSED_KNOWLEDGE_TARGET_DOMAIN;
    targetDigest: string;
    // Bytes are strictly proposed output, NEVER written by this module.
    metadataBytes: string;
    knowledgeIndexBytes: string;
    indexCandidateDigest: string;
    writesPerformed: false;
    protectsTargetIntegrity: false;
    targetAccepted: false;
  };
  recovery: {
    sourceBytesRemainUnchanged: true;
    authorizationAndGuardianProofRequired: true;
    crossFileTransactionNotImplemented: true;
    rollbackNotPerformed: true;
  };
  boundaries: {
    createsAuthority: false;
    performsMigration: false;
    changesMade: 0;
  };
}

function fail(message: string): never {
  throw new Error("Knowledge schema transition blocked: " + message);
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hashBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function targetDigest(stableProjectIdentity: string, files: ReadonlyMap<string, Buffer>): string {
  const hash = createHash("sha256");
  frameHashField(hash, "domain", Buffer.from(PROPOSED_KNOWLEDGE_TARGET_DOMAIN));
  frameHashField(hash, "schema-version", Buffer.from(String(TARGET_SCHEMA_VERSION)));
  frameHashField(hash, "stable-project-identity", Buffer.from(stableProjectIdentity));
  for (const name of [...PROJECT_CONTEXT_MANAGED_INPUTS, "knowledge-registry.json"]) {
    const bytes = files.get(name);
    if (!bytes) fail("proposed managed target is missing " + name);
    frameHashField(hash, "managed:" + name, bytes);
  }
  return hash.digest("hex");
}

/**
 * Requires an already healthy, canonical, exact-source projection. Recomputes
 * its v2 baseline from the supplied bytes; an untrusted/cross-project/map-mixed
 * input cannot silently become proposed v3 material.
 */
export function planKnowledgeSchemaTransition(
  projection: ReadyKnowledgeProjection,
  inputs: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
): KnowledgeSchemaTransitionPlan {
  const candidate = planKnowledgeIndexCandidate(projection);
  if (projection.baseline.schemaVersion !== SOURCE_SCHEMA_VERSION
    || !isStableProjectIdentity(projection.stableProjectIdentity)
    || inputs.size !== PROJECT_CONTEXT_MANAGED_INPUTS.length
    || [...inputs.keys()].some(name => !PROJECT_CONTEXT_MANAGED_INPUTS.includes(name))) {
    fail("only an exact schema-2, stable-project, five-file managed source is supported");
  }
  for (const name of PROJECT_CONTEXT_MANAGED_INPUTS) {
    const bytes = inputs.get(name);
    if (!Buffer.isBuffer(bytes) || bytes.byteLength === 0 || bytes.byteLength > MAX_SOURCE_FILE_BYTES) {
      fail("source file is missing, malformed or exceeds size limit: " + name);
    }
  }
  const current = buildProjectContextBaseline(inputs, SOURCE_SCHEMA_VERSION);
  if (current.algorithm !== projection.baseline.algorithm
    || current.domain !== projection.baseline.domain
    || current.digest !== projection.baseline.digest) {
    fail("source bytes differ from the projected accepted Project Brain baseline");
  }

  const sourceMetadataBytes = inputs.get("metadata.json")!;
  if (sourceMetadataBytes.byteLength > MAX_METADATA_BYTES) fail("source metadata exceeds size limit");
  let parsed: unknown;
  try {
    parsed = JSON.parse(sourceMetadataBytes.toString("utf8")) as unknown;
  } catch {
    fail("source metadata is malformed");
  }
  if (!plainObject(parsed) || !plainObject(parsed.framework)
    || typeof parsed.framework.version !== "string"
    || typeof parsed.framework.channel !== "string"
    || !plainObject(parsed.projectBrain)
    || parsed.projectBrain.schemaVersion !== SOURCE_SCHEMA_VERSION
    || parsed.projectBrain.projectId !== projection.stableProjectIdentity) {
    fail("source schema or project identity does not match projected canonical state");
  }

  const targetMetadata = {
    ...parsed,
    projectBrain: { ...parsed.projectBrain, schemaVersion: TARGET_SCHEMA_VERSION },
  };
  const metadataBytes = JSON.stringify(targetMetadata, null, 2) + "\n";
  if (Buffer.byteLength(metadataBytes, "utf8") > MAX_METADATA_BYTES) {
    fail("proposed target metadata exceeds size limit");
  }
  const knowledgeIndexBytes = candidate.canonicalJson;
  const targetFiles = new Map<string, Buffer>();
  for (const name of PROJECT_CONTEXT_MANAGED_INPUTS) {
    targetFiles.set(name, Buffer.from(inputs.get(name)!));
  }
  targetFiles.set("metadata.json", Buffer.from(metadataBytes, "utf8"));
  targetFiles.set("knowledge-registry.json", Buffer.from(knowledgeIndexBytes, "utf8"));

  const digests = {} as Record<(typeof UNCHANGED_STATEMENTS)[number], string>;
  for (const name of UNCHANGED_STATEMENTS) {
    const original = inputs.get(name)!;
    const proposed = targetFiles.get(name)!;
    if (!original.equals(proposed)) fail("canonical source statements would be rewritten: " + name);
    digests[name] = hashBytes(original);
  }
  return {
    state: "plan-only",
    schemaVersion: KNOWLEDGE_TRANSITION_PLAN_VERSION,
    stableProjectIdentity: projection.stableProjectIdentity,
    source: {
      schemaVersion: SOURCE_SCHEMA_VERSION,
      baselineDigest: current.digest,
      baselineDomain: current.domain,
      immutableSourceDigests: digests,
    },
    proposedTarget: {
      schemaVersion: TARGET_SCHEMA_VERSION,
      targetDigestDomain: PROPOSED_KNOWLEDGE_TARGET_DOMAIN,
      targetDigest: targetDigest(projection.stableProjectIdentity, targetFiles),
      metadataBytes,
      knowledgeIndexBytes,
      indexCandidateDigest: candidate.candidateDigest,
      writesPerformed: false,
      protectsTargetIntegrity: false,
      targetAccepted: false,
    },
    recovery: {
      sourceBytesRemainUnchanged: true,
      authorizationAndGuardianProofRequired: true,
      crossFileTransactionNotImplemented: true,
      rollbackNotPerformed: true,
    },
    boundaries: {
      createsAuthority: false,
      performsMigration: false,
      changesMade: 0,
    },
  };
}

/**
 * A byte-exact comparator only: passing means an in-memory plan is current.
 * It NEVER proves an authenticated proposal, user approval, Guardian Authority,
 * disk transaction completion, or Project Brain integrity acceptance.
 */
export function assertKnowledgeSchemaTransitionPlanCurrent(
  untrusted: KnowledgeSchemaTransitionPlan,
  projection: ReadyKnowledgeProjection,
  inputs: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
): void {
  const expected = planKnowledgeSchemaTransition(projection, inputs);
  if (JSON.stringify(untrusted) !== JSON.stringify(expected)) {
    fail("transition plan is stale, cross-project or tampered");
  }
}
