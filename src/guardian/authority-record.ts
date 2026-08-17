import { createHash, randomUUID } from "node:crypto";

export const GUARDIAN_AUTHORITY_SCHEMA_VERSION = 1 as const;
export const GUARDIAN_AUTHORITY_KIND = "livariant-guardian-authority" as const;
export const GUARDIAN_AUTHORITY_MATERIAL_DOMAIN = "livariant:guardian-authority-material:v1" as const;

export type GuardianAuthorityConsumer =
  | "semantic-mutation"
  | "project-brain-integrity"
  | "runtime-trust"
  | "release-authorization";

export type GuardianAuthorityMode = "one-shot" | "persistent";
export type GuardianAuthorityState = "active" | "consumed";

export interface GuardianAuthorityMaterialField {
  label: string;
  value: string;
}

export interface GuardianAuthorityRecord {
  schemaVersion: typeof GUARDIAN_AUTHORITY_SCHEMA_VERSION;
  kind: typeof GUARDIAN_AUTHORITY_KIND;
  guardianVersion: 1;
  recordId: string;
  consumer: GuardianAuthorityConsumer;
  mode: GuardianAuthorityMode;
  state: GuardianAuthorityState;
  materialSha256: string;
  issuedAt: string;
  expiresAt?: string;
  consumedAt?: string;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function strictKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[]): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error("Guardian Authority record contains an unsupported field.");
  }
  for (const key of required) {
    if (!(key in value)) throw new Error(`Guardian Authority record is missing required field: ${key}.`);
  }
}

function validSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validRecordId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function validConsumer(value: unknown): value is GuardianAuthorityConsumer {
  return value === "semantic-mutation"
    || value === "project-brain-integrity"
    || value === "runtime-trust"
    || value === "release-authorization";
}

function validMode(value: unknown): value is GuardianAuthorityMode {
  return value === "one-shot" || value === "persistent";
}

function validState(value: unknown): value is GuardianAuthorityState {
  return value === "active" || value === "consumed";
}

function frame(hash: ReturnType<typeof createHash>, label: string, value: string): void {
  const labelBytes = Buffer.from(label, "utf8");
  const valueBytes = Buffer.from(value, "utf8");
  const lengths = Buffer.allocUnsafe(8);
  lengths.writeUInt32BE(labelBytes.length, 0);
  lengths.writeUInt32BE(valueBytes.length, 4);
  hash.update(lengths);
  hash.update(labelBytes);
  hash.update(valueBytes);
}

export function guardianAuthorityMaterialDigest(
  consumer: GuardianAuthorityConsumer,
  fields: readonly GuardianAuthorityMaterialField[],
): string {
  if (fields.length === 0) throw new Error("Guardian Authority material must contain at least one field.");
  const seen = new Set<string>();
  const hash = createHash("sha256");
  frame(hash, "domain", GUARDIAN_AUTHORITY_MATERIAL_DOMAIN);
  frame(hash, "consumer", consumer);
  for (const field of fields) {
    if (!field.label || /[\r\n\u0000]/u.test(field.label)) throw new Error("Guardian Authority material field label is invalid.");
    if (seen.has(field.label)) throw new Error(`Guardian Authority material field is duplicated: ${field.label}.`);
    seen.add(field.label);
    frame(hash, field.label, field.value);
  }
  return hash.digest("hex");
}

export function buildGuardianAuthorityRecord(input: {
  consumer: GuardianAuthorityConsumer;
  mode: GuardianAuthorityMode;
  materialSha256: string;
  issuedAt?: string;
  expiresAt?: string;
  recordId?: string;
}): GuardianAuthorityRecord {
  if (!validSha256(input.materialSha256)) throw new Error("Guardian Authority material digest is invalid.");
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  if (!validTimestamp(issuedAt)) throw new Error("Guardian Authority issued timestamp is invalid.");
  if (input.mode === "persistent" && input.expiresAt !== undefined) {
    throw new Error("Persistent Guardian Authority must not use one-shot expiry semantics.");
  }
  if (input.expiresAt !== undefined) {
    if (!validTimestamp(input.expiresAt)) throw new Error("Guardian Authority expiry timestamp is invalid.");
    if (Date.parse(input.expiresAt) <= Date.parse(issuedAt)) throw new Error("Guardian Authority expiry must be later than issuance.");
  }
  return {
    schemaVersion: GUARDIAN_AUTHORITY_SCHEMA_VERSION,
    kind: GUARDIAN_AUTHORITY_KIND,
    guardianVersion: 1,
    recordId: input.recordId ?? randomUUID(),
    consumer: input.consumer,
    mode: input.mode,
    state: "active",
    materialSha256: input.materialSha256,
    issuedAt,
    ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
  };
}

export function parseGuardianAuthorityRecord(value: unknown): GuardianAuthorityRecord {
  if (!plainObject(value)) throw new Error("Guardian Authority record is invalid.");
  strictKeys(
    value,
    ["schemaVersion", "kind", "guardianVersion", "recordId", "consumer", "mode", "state", "materialSha256", "issuedAt"],
    ["expiresAt", "consumedAt"],
  );
  if (value.schemaVersion !== GUARDIAN_AUTHORITY_SCHEMA_VERSION || value.kind !== GUARDIAN_AUTHORITY_KIND || value.guardianVersion !== 1) {
    throw new Error("Guardian Authority record schema is unsupported.");
  }
  if (!validRecordId(value.recordId)) throw new Error("Guardian Authority record id is invalid.");
  if (!validConsumer(value.consumer)) throw new Error("Guardian Authority consumer is invalid.");
  if (!validMode(value.mode)) throw new Error("Guardian Authority mode is invalid.");
  if (!validState(value.state)) throw new Error("Guardian Authority state is invalid.");
  if (!validSha256(value.materialSha256)) throw new Error("Guardian Authority material digest is invalid.");
  if (!validTimestamp(value.issuedAt)) throw new Error("Guardian Authority issued timestamp is invalid.");
  if (value.expiresAt !== undefined && !validTimestamp(value.expiresAt)) throw new Error("Guardian Authority expiry timestamp is invalid.");
  if (value.consumedAt !== undefined && !validTimestamp(value.consumedAt)) throw new Error("Guardian Authority consumed timestamp is invalid.");
  if (value.mode === "persistent") {
    if (value.expiresAt !== undefined || value.state !== "active" || value.consumedAt !== undefined) {
      throw new Error("Persistent Guardian Authority record has one-shot state fields.");
    }
  } else {
    if (value.expiresAt !== undefined && Date.parse(value.expiresAt) <= Date.parse(value.issuedAt)) {
      throw new Error("Guardian Authority expiry must be later than issuance.");
    }
    if (value.state === "active" && value.consumedAt !== undefined) throw new Error("Active Guardian Authority must not have a consumed timestamp.");
    if (value.state === "consumed" && value.consumedAt === undefined) throw new Error("Consumed Guardian Authority requires a consumed timestamp.");
  }
  return value as unknown as GuardianAuthorityRecord;
}

export function assertGuardianAuthorityMatches(
  record: GuardianAuthorityRecord,
  expected: { consumer: GuardianAuthorityConsumer; mode: GuardianAuthorityMode; materialSha256: string },
  now: Date = new Date(),
): void {
  if (record.consumer !== expected.consumer) throw new Error("Guardian Authority record belongs to a different consumer.");
  if (record.mode !== expected.mode) throw new Error("Guardian Authority record mode does not match the required operation semantics.");
  if (record.materialSha256 !== expected.materialSha256) throw new Error("Guardian Authority record does not match the exact consequential material.");
  if (record.state !== "active") throw new Error("Guardian Authority record has already been consumed.");
  if (record.expiresAt !== undefined && Date.parse(record.expiresAt) <= now.getTime()) throw new Error("Guardian Authority record has expired.");
}

export function consumeGuardianAuthorityRecord(record: GuardianAuthorityRecord, consumedAt: string = new Date().toISOString()): GuardianAuthorityRecord {
  if (record.mode !== "one-shot") throw new Error("Persistent Guardian Authority is not consumed as a one-shot capability.");
  if (record.state !== "active") throw new Error("Guardian Authority record has already been consumed.");
  if (!validTimestamp(consumedAt)) throw new Error("Guardian Authority consumed timestamp is invalid.");
  if (Date.parse(consumedAt) < Date.parse(record.issuedAt)) throw new Error("Guardian Authority cannot be consumed before it was issued.");
  return { ...record, state: "consumed", consumedAt };
}
