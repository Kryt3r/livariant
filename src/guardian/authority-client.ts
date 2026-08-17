import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertGuardianAuthorityMatches,
  guardianAuthorityMaterialDigest,
  parseGuardianAuthorityRecord,
  type GuardianAuthorityConsumer,
  type GuardianAuthorityMaterialField,
  type GuardianAuthorityMode,
  type GuardianAuthorityRecord,
} from "./authority-record.js";
import { parseProtectedGuardianRequest } from "./protected-helper.js";
import { assertProductionGuardianRootReady, guardianLayoutPaths } from "./trust-root.js";

export const GUARDIAN_AUTHORITY_REQUEST_KIND = "livariant-guardian-authority-request" as const;

export interface GuardianAuthorityRequest {
  schemaVersion: 1;
  kind: typeof GUARDIAN_AUTHORITY_REQUEST_KIND;
  consumer: GuardianAuthorityConsumer;
  mode: GuardianAuthorityMode;
  materialFields: GuardianAuthorityMaterialField[];
}

export interface GuardianAuthoritySupport {
  schemaVersion: 1;
  state: "ready";
  root: string;
  helper: string;
  records: string;
  guardianVersion: 1;
  authorityIssuanceSupported: true;
  authorityConsumptionSupported: true;
}

function errno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

async function assertRegularFile(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`${label} must be a regular file and must not be a symbolic link.`);
}

async function assertRealDirectory(path: string, label: string): Promise<boolean> {
  try {
    const stats = await lstat(path);
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory and must not be a symbolic link or junction.`);
    return true;
  } catch (error) {
    if (errno(error, "ENOENT")) return false;
    throw error;
  }
}

function parseHelperVersion(value: unknown): Omit<GuardianAuthoritySupport, "schemaVersion" | "state" | "root" | "helper" | "records"> {
  if (typeof value !== "object" || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("Protected Guardian helper returned an invalid version response.");
  }
  const record = value as Record<string, unknown>;
  const expected = ["schemaVersion", "kind", "guardianVersion", "authorityIssuanceSupported", "authorityConsumptionSupported"] as const;
  if (Object.keys(record).length !== expected.length || expected.some((key) => !(key in record))) {
    throw new Error("Protected Guardian helper version response is incomplete or contains unsupported fields.");
  }
  if (record.schemaVersion !== 1
    || record.kind !== "livariant-guardian-helper"
    || record.guardianVersion !== 1
    || record.authorityIssuanceSupported !== true
    || record.authorityConsumptionSupported !== true) {
    throw new Error("Protected Guardian helper does not support the required WP-027 Authority transitions.");
  }
  return {
    guardianVersion: 1,
    authorityIssuanceSupported: true,
    authorityConsumptionSupported: true,
  };
}

export function buildGuardianAuthorityRequest(input: {
  consumer: GuardianAuthorityConsumer;
  mode: GuardianAuthorityMode;
  materialFields: readonly GuardianAuthorityMaterialField[];
}): { request: GuardianAuthorityRequest; materialSha256: string } {
  const parsed = parseProtectedGuardianRequest({
    schemaVersion: 1,
    kind: GUARDIAN_AUTHORITY_REQUEST_KIND,
    consumer: input.consumer,
    mode: input.mode,
    materialFields: input.materialFields.map((field) => ({ label: field.label, value: field.value })),
  });
  const materialSha256 = guardianAuthorityMaterialDigest(parsed.consumer, parsed.materialFields);
  return {
    request: parsed as GuardianAuthorityRequest,
    materialSha256,
  };
}

export async function assertGuardianAuthoritySupport(projectPath: string = process.cwd()): Promise<GuardianAuthoritySupport> {
  const inspection = await assertProductionGuardianRootReady(projectPath);
  if (!inspection.root) throw new Error("Protected Guardian root readiness did not return a physical root.");
  const { helper, records } = guardianLayoutPaths(inspection.root);
  const result = spawnSync(process.execPath, [helper, "version"], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`Protected Guardian helper version verification failed: ${detail.trim()}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout) as unknown;
  } catch {
    throw new Error("Protected Guardian helper returned malformed version JSON.");
  }
  const version = parseHelperVersion(parsed);
  return {
    schemaVersion: 1,
    state: "ready",
    root: inspection.root,
    helper,
    records,
    ...version,
  };
}

async function readConsumerRecords(
  support: GuardianAuthoritySupport,
  consumer: GuardianAuthorityConsumer,
): Promise<GuardianAuthorityRecord[]> {
  const directory = resolve(support.records, consumer);
  if (!await assertRealDirectory(directory, "Guardian consumer record directory")) return [];
  const records: GuardianAuthorityRecord[] = [];
  for (const name of await readdir(directory)) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json$/iu.test(name)) {
      throw new Error("Guardian consumer record directory contains an unsupported or ambiguous entry.");
    }
    const path = resolve(directory, name);
    await assertRegularFile(path, "Guardian Authority record");
    let value: unknown;
    try {
      value = JSON.parse(await readFile(path, "utf8")) as unknown;
    } catch {
      throw new Error("Guardian Authority record contains malformed JSON.");
    }
    const record = parseGuardianAuthorityRecord(value);
    if (record.consumer !== consumer) throw new Error("Guardian Authority record is stored under the wrong consumer namespace.");
    if (`${record.recordId.toLowerCase()}.json` !== name.toLowerCase()) throw new Error("Guardian Authority record filename does not match its protected record identity.");
    records.push(record);
  }
  return records;
}

export async function findMatchingActiveGuardianAuthority(input: {
  consumer: GuardianAuthorityConsumer;
  mode: GuardianAuthorityMode;
  materialSha256: string;
  projectPath?: string;
  now?: Date;
}): Promise<GuardianAuthorityRecord | null> {
  const support = await assertGuardianAuthoritySupport(input.projectPath ?? process.cwd());
  const now = input.now ?? new Date();
  const records = await readConsumerRecords(support, input.consumer);
  const matching = records.filter((record) => {
    if (record.mode !== input.mode || record.materialSha256 !== input.materialSha256 || record.state !== "active") return false;
    if (record.expiresAt !== undefined && Date.parse(record.expiresAt) <= now.getTime()) return false;
    return true;
  });
  if (matching.length === 0) return null;
  if (matching.length > 1) throw new Error("Multiple active Guardian Authority records match the same exact material; refusing ambiguous Authority.");
  assertGuardianAuthorityMatches(matching[0], {
    consumer: input.consumer,
    mode: input.mode,
    materialSha256: input.materialSha256,
  }, now);
  return matching[0];
}

export async function readGuardianAuthorityById(input: {
  consumer: GuardianAuthorityConsumer;
  recordId: string;
  projectPath?: string;
}): Promise<GuardianAuthorityRecord> {
  const support = await assertGuardianAuthoritySupport(input.projectPath ?? process.cwd());
  const records = await readConsumerRecords(support, input.consumer);
  const matching = records.filter((record) => record.recordId.toLowerCase() === input.recordId.toLowerCase());
  if (matching.length !== 1) throw new Error(matching.length === 0
    ? "Requested Guardian Authority record is missing."
    : "Requested Guardian Authority record is ambiguous.");
  return matching[0];
}
