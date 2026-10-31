import { isAbsolute, resolve } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { PROJECT_CONTEXT_BASELINE_DOMAIN } from "../runtime/project-context-material.js";
import { PROPOSED_KNOWLEDGE_TARGET_DOMAIN } from "../intelligence/knowledge-schema-transition-plan.js";

/**
 * A STRICT SHAPE AND TRANSITION CONTRACT for a FUTURE protected migration fence.
 *
 * Parsing an object does not authenticate Guardian origin, protect persistence,
 * prove a filesystem identity, grant Authority or unblock any Project Brain
 * consumer. Only a future independently protected provider may use this
 * vocabulary. No Guardian record is created or written by this module.
 */
export const SCHEMA_MIGRATION_FENCE_KIND = "livariant-guardian-schema-migration-fence" as const;
export const SCHEMA_MIGRATION_FENCE_VERSION = 1 as const;

export type SchemaMigrationFencePhase =
  | "armed"
  | "authority-consumed"
  | "promotion-started"
  | "target-material-verified"
  | "recovery-required"
  | "completed"
  | "disarmed-before-consumption";

export interface SchemaMigrationFenceRecord {
  schemaVersion: typeof SCHEMA_MIGRATION_FENCE_VERSION;
  kind: typeof SCHEMA_MIGRATION_FENCE_KIND;
  stableProjectIdentity: string;
  transactionId: string;
  authorizationOperationId: string;
  protectedSourceRecordId: string;
  declaredPhysicalProjectRoot: string;
  declaredPhysicalProjectBrainRoot: string;
  sourceSchemaVersion: 2;
  targetSchemaVersion: 3;
  sourceBaselineDomain: typeof PROJECT_CONTEXT_BASELINE_DOMAIN;
  sourceBaselineSha256: string;
  sourceProtectedIntegrityMaterialSha256: string;
  proposedTargetDomain: typeof PROPOSED_KNOWLEDGE_TARGET_DOMAIN;
  proposedTargetSha256: string;
  migrationIntentSha256: string;
  phase: SchemaMigrationFencePhase;
  sequence: number;
}

const FIELDS = [
  "schemaVersion", "kind", "stableProjectIdentity", "transactionId",
  "authorizationOperationId", "protectedSourceRecordId",
  "declaredPhysicalProjectRoot", "declaredPhysicalProjectBrainRoot",
  "sourceSchemaVersion", "targetSchemaVersion",
  "sourceBaselineDomain", "sourceBaselineSha256",
  "sourceProtectedIntegrityMaterialSha256",
  "proposedTargetDomain", "proposedTargetSha256", "migrationIntentSha256",
  "phase", "sequence",
] as const;

const PHASES: ReadonlySet<string> = new Set<SchemaMigrationFencePhase>([
  "armed", "authority-consumed", "promotion-started",
  "target-material-verified", "recovery-required",
  "completed", "disarmed-before-consumption",
]);

const ALLOWED_NEXT: Readonly<Record<SchemaMigrationFencePhase, readonly SchemaMigrationFencePhase[]>> = {
  armed: ["authority-consumed", "recovery-required", "disarmed-before-consumption"],
  "authority-consumed": ["promotion-started", "recovery-required"],
  "promotion-started": ["target-material-verified", "recovery-required"],
  "target-material-verified": ["completed", "recovery-required"],
  "recovery-required": [],
  completed: [],
  "disarmed-before-consumption": [],
};

function reject(reason: string): never {
  throw new Error("Protected migration-fence contract rejected: " + reason);
}

function normalizedAbsolute(value: unknown, label: string): string {
  if (typeof value !== "string" || !value || value.includes("\u0000")
    || !isAbsolute(value) || resolve(value) !== value) {
    reject(label + " is not a normalized absolute path");
  }
  // This is lexical validation only. Native handles and Guardian must prove
  // physical identity, including Windows junctions, aliases and races.
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function uuid(value: unknown, name: string): string {
  if (!isStableProjectIdentity(value) || value !== value.toLowerCase()) {
    reject(name + " is not a canonical project/operation identity");
  }
  return value;
}

function digest(value: unknown, name: string): void {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) {
    reject(name + " must be an exact SHA-256 hex digest");
  }
}

export function parseSchemaMigrationFenceRecord(value: unknown): SchemaMigrationFenceRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    reject("record must be a plain object");
  }
  const entry = value as Record<string, unknown>;
  const expected = new Set<string>(FIELDS);
  if (Object.keys(entry).length !== FIELDS.length
    || Object.keys(entry).some(key => !expected.has(key))
    || FIELDS.some(key => !Object.hasOwn(entry, key))) {
    reject("record must contain exactly the supported fields");
  }
  if (entry.schemaVersion !== SCHEMA_MIGRATION_FENCE_VERSION
    || entry.kind !== SCHEMA_MIGRATION_FENCE_KIND
    || entry.sourceSchemaVersion !== 2 || entry.targetSchemaVersion !== 3) {
    reject("unsupported schema transition or record kind");
  }
  const project = uuid(entry.stableProjectIdentity, "project identity");
  const tx = uuid(entry.transactionId, "transaction id");
  const auth = uuid(entry.authorizationOperationId, "authorization operation id");
  const proof = uuid(entry.protectedSourceRecordId, "protected source record id");
  if (tx === auth || tx === proof || auth === proof) {
    reject("transaction, authorization and source record identifiers must differ");
  }
  const root = normalizedAbsolute(entry.declaredPhysicalProjectRoot, "project root");
  const brain = normalizedAbsolute(entry.declaredPhysicalProjectBrainRoot, "Project Brain root");
  const expectedBrain = normalizedAbsolute(resolve(root, ".project-brain"), "expected Project Brain root");
  if (root === brain || brain !== expectedBrain) reject("Project Brain root does not belong to declared project root");
  if (entry.sourceBaselineDomain !== PROJECT_CONTEXT_BASELINE_DOMAIN
    || entry.proposedTargetDomain !== PROPOSED_KNOWLEDGE_TARGET_DOMAIN) {
    reject("baseline or target domain is unsupported");
  }
  digest(entry.sourceBaselineSha256, "source baseline");
  digest(entry.sourceProtectedIntegrityMaterialSha256, "protected source integrity");
  digest(entry.proposedTargetSha256, "proposed target");
  digest(entry.migrationIntentSha256, "migration intent");
  if (typeof entry.phase !== "string" || !PHASES.has(entry.phase)) reject("phase is unsupported");
  if (typeof entry.sequence !== "number" || !Number.isSafeInteger(entry.sequence)
    || entry.sequence < 0) reject("sequence must be a nonnegative safe integer");
  if (entry.phase === "armed" && entry.sequence !== 0) {
    reject("a newly armed transaction must start at sequence zero");
  }
  if (entry.phase !== "armed" && entry.sequence === 0) {
    reject("a noninitial transaction phase needs a later sequence");
  }
  return entry as unknown as SchemaMigrationFenceRecord;
}

/**
 * Checks only a hypothetical transition SHAPE, never proof that the
 * corresponding protected Guardian records were durably committed.
 *
 * A consumed or ambiguous transaction MUST NOT be automatically disarmed.
 * Recovery-required is terminal until a separate approved recovery protocol
 * is implemented and independently authenticated.
 */
export function assertSchemaMigrationFenceTransition(
  priorInput: unknown,
  nextInput: unknown,
): void {
  const prior = parseSchemaMigrationFenceRecord(priorInput);
  const next = parseSchemaMigrationFenceRecord(nextInput);
  for (const name of FIELDS) {
    if (name === "phase" || name === "sequence") continue;
    if (prior[name] !== next[name]) reject("transaction identity or material changed: " + name);
  }
  if (!ALLOWED_NEXT[prior.phase].includes(next.phase)) {
    reject("unsafe or unsupported state transition: " + prior.phase + " -> " + next.phase);
  }
  if (next.sequence !== prior.sequence + 1) {
    reject("transaction sequence must increase by exactly one");
  }
}

/**
 * Presence of ANY parsed fence, including a claimed completed record, must
 * block OLD schema-2 and new schema-3 consumers until a separate protected
 * read-gate verifies independent Guardian origin AND terminal integrity.
 * A missing/unreadable fence observation also cannot grant read Authority.
 */
export function classifyUntrustedSchemaMigrationFenceObservation(
  candidate: unknown,
): {
  state: "blocked-until-independent-guardian-verification";
  observedPhase: SchemaMigrationFencePhase | null;
  mayReadSchema2: false;
  mayReadSchema3: false;
  mayConsumeAuthority: false;
  mayWriteCanonicalFiles: false;
  mayClearFence: false;
  changesMade: 0;
} {
  let observedPhase: SchemaMigrationFencePhase | null = null;
  try { observedPhase = parseSchemaMigrationFenceRecord(candidate).phase; } catch { /* fail closed */ }
  return {
    state: "blocked-until-independent-guardian-verification",
    observedPhase,
    mayReadSchema2: false,
    mayReadSchema3: false,
    mayConsumeAuthority: false,
    mayWriteCanonicalFiles: false,
    mayClearFence: false,
    changesMade: 0,
  };
}
