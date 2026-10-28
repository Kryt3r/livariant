import { RESERVED_KNOWLEDGE_INDEX_FILE } from "../project-brain/store.js";
import {
  PROJECT_CONTEXT_MANAGED_INPUTS,
  type ProjectContextManagedInputName,
} from "../runtime/project-context-material.js";
import type { ReadyKnowledgeProjection } from "./knowledge-projection.js";
import {
  assertKnowledgeSchemaTransitionPlanCurrent,
  type KnowledgeSchemaTransitionPlan,
} from "./knowledge-schema-transition-plan.js";

/**
 * Byte-exact OFFLINE comparison of a hypothetical proposed v3 material set.
 * This is neither a v3 loader nor a protected Integrity / Guardian verifier.
 * No filesystem read, write, migration or authorization action is provided.
 */
export const PROPOSED_SCHEMA3_MANAGED_FILES = [
  ...PROJECT_CONTEXT_MANAGED_INPUTS,
  RESERVED_KNOWLEDGE_INDEX_FILE,
] as const;

export interface MatchingUntrustedKnowledgeTarget {
  state: "material-exact-untrusted";
  stableProjectIdentity: string;
  proposedTargetDigest: string;
  sourceBaselineDigest: string;
  /** MUST remain false even when all six proposed managed file bytes match. */
  grantsAuthority: false;
  guardianTargetVerified: false;
  filesystemOwnershipVerified: false;
  transactionRecoveryVerified: false;
  acceptsTargetSchema: false;
  writesPerformed: false;
  changesMade: 0;
}

export interface BlockedKnowledgeTarget {
  state: "blocked";
  reason: string;
  grantsAuthority: false;
  guardianTargetVerified: false;
  filesystemOwnershipVerified: false;
  transactionRecoveryVerified: false;
  acceptsTargetSchema: false;
  writesPerformed: false;
  changesMade: 0;
}

export type ProposedKnowledgeTargetAudit = MatchingUntrustedKnowledgeTarget | BlockedKnowledgeTarget;

const MAX_MANAGED_FILE_BYTES = 8 * 1024 * 1024;

function blocked(reason: string): BlockedKnowledgeTarget {
  return {
    state: "blocked",
    reason,
    grantsAuthority: false,
    guardianTargetVerified: false,
    filesystemOwnershipVerified: false,
    transactionRecoveryVerified: false,
    acceptsTargetSchema: false,
    writesPerformed: false,
    changesMade: 0,
  };
}

/**
 * Audit the entire target byte-set, including unchanged original markdown.
 * Invalid/stale plan, mixed schema, unexpected or missing managed input,
 * partial writes and tampering return BLOCKED. Exact bytes are still
 * UNTRUSTED until independent Guardian, file safety and recovery checks.
 */
export function auditProposedKnowledgeSchemaTarget(
  plan: KnowledgeSchemaTransitionPlan,
  currentProjection: ReadyKnowledgeProjection,
  originalInputs: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
  hypotheticalTarget: ReadonlyMap<string, Buffer>,
): ProposedKnowledgeTargetAudit {
  try {
    // Reconstruct the entire material plan from the original source, never
    // trust a caller-supplied digest or immutable-source claim on its own.
    assertKnowledgeSchemaTransitionPlanCurrent(plan, currentProjection, originalInputs);

    const exactNames = new Set<string>(PROPOSED_SCHEMA3_MANAGED_FILES);
    if (hypotheticalTarget.size !== exactNames.size) {
      return blocked("Proposed target has missing, extra, or aliased managed files.");
    }
    for (const [name, actual] of hypotheticalTarget) {
      if (!exactNames.has(name) || !Buffer.isBuffer(actual)
        || actual.length === 0 || actual.length > MAX_MANAGED_FILE_BYTES) {
        return blocked("Proposed target contains unexpected, missing, invalid or oversized managed material.");
      }
    }

    for (const name of PROJECT_CONTEXT_MANAGED_INPUTS) {
      const actual = hypotheticalTarget.get(name);
      const expected = name === "metadata.json"
        ? Buffer.from(plan.proposedTarget.metadataBytes, "utf8")
        : originalInputs.get(name);
      if (!Buffer.isBuffer(actual) || !Buffer.isBuffer(expected) || !actual.equals(expected)) {
        return blocked("Proposed target contains a mixed, stale or changed canonical managed file: " + name);
      }
    }

    const index = hypotheticalTarget.get(RESERVED_KNOWLEDGE_INDEX_FILE);
    if (!Buffer.isBuffer(index)
      || !index.equals(Buffer.from(plan.proposedTarget.knowledgeIndexBytes, "utf8"))) {
      return blocked("Proposed target Registry index does not match the exact source-bound material.");
    }

    // These two parses are consistency checks only, NOT schema-3 acceptance.
    const metadata = JSON.parse(hypotheticalTarget.get("metadata.json")!.toString("utf8")) as {
      projectBrain?: { schemaVersion?: number; projectId?: string };
    };
    const registry = JSON.parse(index.toString("utf8")) as {
      proposedProjectBrainSchemaVersion?: number;
      stableProjectIdentity?: string;
      source?: { baselineDigest?: string };
    };
    if (metadata.projectBrain?.schemaVersion !== 3
      || metadata.projectBrain.projectId !== plan.stableProjectIdentity
      || registry.proposedProjectBrainSchemaVersion !== 3
      || registry.stableProjectIdentity !== plan.stableProjectIdentity
      || registry.source?.baselineDigest !== plan.source.baselineDigest) {
      return blocked("Proposed target schemas, project identities or original baseline references differ.");
    }

    return {
      state: "material-exact-untrusted",
      stableProjectIdentity: plan.stableProjectIdentity,
      proposedTargetDigest: plan.proposedTarget.targetDigest,
      sourceBaselineDigest: plan.source.baselineDigest,
      grantsAuthority: false,
      guardianTargetVerified: false,
      filesystemOwnershipVerified: false,
      transactionRecoveryVerified: false,
      acceptsTargetSchema: false,
      writesPerformed: false,
      changesMade: 0,
    };
  } catch (error) {
    return blocked("Proposed target audit failed closed: " + (error instanceof Error ? error.message : "unknown error"));
  }
}
