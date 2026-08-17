import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertGuardianAuthorityMatches,
  guardianAuthorityMaterialDigest,
  parseGuardianAuthorityRecord,
  type GuardianAuthorityMaterialField,
  type GuardianAuthorityRecord,
} from "./authority-record.js";
import {
  assertGuardianAuthoritySupport,
  type GuardianAuthorityRequest,
} from "./authority-client.js";

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function parseTransitionEnvelope(
  value: unknown,
  expectedState: "issued" | "consumed",
): GuardianAuthorityRecord {
  if (!plainObject(value)) throw new Error("Protected Guardian helper returned an invalid transition response.");
  const keys = Object.keys(value);
  if (keys.length !== 3 || !keys.includes("schemaVersion") || !keys.includes("state") || !keys.includes("authority")) {
    throw new Error("Protected Guardian helper transition response is incomplete or contains unsupported fields.");
  }
  if (value.schemaVersion !== 1 || value.state !== expectedState) {
    throw new Error(`Protected Guardian helper did not report the expected ${expectedState} transition.`);
  }
  return parseGuardianAuthorityRecord(value.authority);
}

function parseHelperJson(stdout: string, expectedState: "issued" | "consumed"): GuardianAuthorityRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout) as unknown;
  } catch {
    throw new Error("Protected Guardian helper returned malformed transition JSON.");
  }
  return parseTransitionEnvelope(parsed, expectedState);
}

function helperFailure(prefix: string, result: ReturnType<typeof spawnSync>): never {
  const detail = result.error?.message || String(result.stderr || result.stdout || `exit ${String(result.status)}`).trim();
  throw new Error(`${prefix}: ${detail || "protected Guardian transition failed"}`);
}

export async function issueGuardianAuthority(input: {
  request: GuardianAuthorityRequest;
  projectPath?: string;
}): Promise<GuardianAuthorityRecord> {
  const support = await assertGuardianAuthoritySupport(input.projectPath ?? process.cwd());
  const materialSha256 = guardianAuthorityMaterialDigest(
    input.request.consumer,
    input.request.materialFields as readonly GuardianAuthorityMaterialField[],
  );
  const directory = await mkdtemp(resolve(tmpdir(), "livariant-guardian-request-"));
  const requestPath = resolve(directory, "authority-request.json");
  try {
    await writeFile(requestPath, `${JSON.stringify(input.request, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    const result = spawnSync(process.execPath, [support.helper, "issue-authority", "--request", requestPath], {
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      stdio: ["inherit", "pipe", "inherit"],
    });
    if (result.error || result.status !== 0) helperFailure("Protected Guardian Authority issuance failed", result);
    const record = parseHelperJson(String(result.stdout), "issued");
    assertGuardianAuthorityMatches(record, {
      consumer: input.request.consumer,
      mode: input.request.mode,
      materialSha256,
    });
    if (record.state !== "active") throw new Error("Protected Guardian issued Authority is not active.");
    return record;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function consumeGuardianAuthority(input: {
  record: GuardianAuthorityRecord;
  expectedMaterialSha256: string;
  projectPath?: string;
}): Promise<GuardianAuthorityRecord> {
  const support = await assertGuardianAuthoritySupport(input.projectPath ?? process.cwd());
  assertGuardianAuthorityMatches(input.record, {
    consumer: input.record.consumer,
    mode: "one-shot",
    materialSha256: input.expectedMaterialSha256,
  });
  const result = spawnSync(process.execPath, [
    support.helper,
    "consume-authority",
    "--consumer",
    input.record.consumer,
    "--record",
    input.record.recordId,
    "--material",
    input.expectedMaterialSha256,
  ], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) helperFailure("Protected Guardian Authority consumption failed", result);
  const consumed = parseHelperJson(String(result.stdout), "consumed");
  if (consumed.recordId !== input.record.recordId
    || consumed.consumer !== input.record.consumer
    || consumed.mode !== "one-shot"
    || consumed.materialSha256 !== input.expectedMaterialSha256
    || consumed.state !== "consumed") {
    throw new Error("Protected Guardian consumption response does not match the exact selected Authority.");
  }
  return consumed;
}
