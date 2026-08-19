import { createHash } from "node:crypto";

export const STABLE_RELATIONSHIP_SCHEMA_VERSION = 1 as const;

export type RelationshipEntityKind = "decision" | "evidence";

export type StableRelationshipType = "supersedes" | "derived-from";

export interface RelationshipEntityReference {
  kind: RelationshipEntityKind;
  id: string;
}

export interface StableRelationship {
  schemaVersion: 1;
  relationshipId: string;
  type: StableRelationshipType;
  from: RelationshipEntityReference;
  to: RelationshipEntityReference;
  grantsAuthority: false;
}

const ENTITY_KINDS = new Set<RelationshipEntityKind>(["decision", "evidence"]);
const RELATIONSHIP_TYPES = new Set<StableRelationshipType>(["supersedes", "derived-from"]);
const STABLE_ID = /^[A-Za-z0-9._:-]+$/;
const RELATIONSHIP_ID = /^relationship-v1:[a-f0-9]{64}$/;

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

export function validateRelationshipEntityReference(input: unknown): RelationshipEntityReference {
  const record = asRecord(input, "relationship entity reference");
  requireExactKeys(record, ["kind", "id"], "relationship entity reference");

  if (typeof record.kind !== "string" || !ENTITY_KINDS.has(record.kind as RelationshipEntityKind)) {
    throw new Error("Unsupported relationship entity kind.");
  }
  if (typeof record.id !== "string" || !STABLE_ID.test(record.id)) {
    throw new Error("Relationship entity id must be a nonblank stable identifier.");
  }

  return {
    kind: record.kind as RelationshipEntityKind,
    id: record.id,
  };
}

export function stableRelationshipIdentity(input: Pick<StableRelationship, "schemaVersion" | "type" | "from" | "to">): string {
  const material = [
    String(input.schemaVersion),
    input.type,
    input.from.kind,
    input.from.id,
    input.to.kind,
    input.to.id,
  ].join("\n");
  const digest = createHash("sha256").update(Buffer.from(material, "utf8")).digest("hex");
  return `relationship-v1:${digest}`;
}

export function validateStableRelationship(input: unknown): StableRelationship {
  const record = asRecord(input, "stable relationship");
  requireExactKeys(
    record,
    ["schemaVersion", "relationshipId", "type", "from", "to", "grantsAuthority"],
    "stable relationship",
  );

  if (record.schemaVersion !== STABLE_RELATIONSHIP_SCHEMA_VERSION) {
    throw new Error("Unsupported stable relationship schemaVersion.");
  }
  if (typeof record.type !== "string" || !RELATIONSHIP_TYPES.has(record.type as StableRelationshipType)) {
    throw new Error("Unsupported stable relationship type.");
  }
  if (record.grantsAuthority !== false) {
    throw new Error("Stable relationships must never grant Authority.");
  }
  if (typeof record.relationshipId !== "string" || !RELATIONSHIP_ID.test(record.relationshipId)) {
    throw new Error("Stable relationshipId must use the relationship-v1 digest format.");
  }

  const from = validateRelationshipEntityReference(record.from);
  const to = validateRelationshipEntityReference(record.to);
  const type = record.type as StableRelationshipType;

  if (from.kind === to.kind && from.id === to.id) {
    throw new Error("Stable relationships cannot point an entity to itself.");
  }

  if (type === "supersedes" && (from.kind !== "decision" || to.kind !== "decision")) {
    throw new Error("supersedes must point from the replacement decision to the superseded decision.");
  }
  if (type === "derived-from" && (from.kind !== "evidence" || to.kind !== "evidence")) {
    throw new Error("derived-from must point from derived evidence to source evidence.");
  }

  const relationship: StableRelationship = {
    schemaVersion: STABLE_RELATIONSHIP_SCHEMA_VERSION,
    relationshipId: record.relationshipId,
    type,
    from,
    to,
    grantsAuthority: false,
  };

  if (relationship.relationshipId !== stableRelationshipIdentity(relationship)) {
    throw new Error("Stable relationshipId does not match the relationship endpoints and type.");
  }

  return relationship;
}

export function createStableRelationship(input: Omit<StableRelationship, "relationshipId">): StableRelationship {
  const relationship: StableRelationship = {
    ...input,
    relationshipId: stableRelationshipIdentity(input),
  };
  return validateStableRelationship(relationship);
}
