import { createHash } from "node:crypto";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { buildProjectContextSnapshot, type ProjectContextBaseline } from "./context-snapshot.js";
import { PROJECT_CONTEXT_BASELINE_DOMAIN } from "./project-context-material.js";
import { providerContextPacketId } from "./provider-context-hash.js";
import type { ProviderContextProvider } from "./provider-context-types.js";
import {
  maintainSemanticProjectState,
  type SemanticMaintenanceResult,
} from "./semantic-maintenance.js";
import {
  parseSemanticProposalCandidate,
  type SemanticProposalCandidate,
} from "./semantic-proposal.js";

export const PROVIDER_RETURN_SCHEMA_VERSION = 1;
export const PROVIDER_RETURN_PACKET_VERSION = 1;
export const PROVIDER_RETURN_FILE_MAX_BYTES = 64 * 1024;
export const PROVIDER_CONTEXT_COPY_FILE_MAX_BYTES = 512 * 1024;
const PROVIDER_RETURN_TASK_DIGEST_DOMAIN = "livariant:provider-return-task:v1";
const PACKET_ID_PATTERN = /^pcx_[0-9a-f]{64}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

interface SuppliedReadyProviderContext {
  schemaVersion: 1;
  packetVersion: 1;
  state: "ready";
  provider: ProviderContextProvider;
  packetId: string;
  stableProjectIdentity: string;
  baseline: ProjectContextBaseline;
  task: {
    value: string;
    authorityClass: "session-ephemeral";
  };
}

export interface ProviderReturnEvidence {
  schemaVersion: 1;
  packetVersion: 1;
  provider: ProviderContextProvider;
  contextPacketId: string;
  stableProjectIdentity: string;
  baselineDigest: string;
  taskDigest: string;
  candidate: SemanticProposalCandidate | null;
}

export interface ProviderReturnNoCandidateResult {
  state: "no-candidate";
  provider: ProviderContextProvider;
  contextPacketId: string;
  currentBaseline: ProjectContextBaseline;
  mutationAuthorization: false;
  semanticChangesMade: 0;
}

export interface ProviderReturnStaleContextResult {
  state: "stale-context";
  provider: ProviderContextProvider;
  contextPacketId: string;
  suppliedBaselineDigest: string;
  currentBaseline: ProjectContextBaseline;
  message: string;
  mutationAuthorization: false;
  semanticChangesMade: 0;
}

export interface ProviderReturnMismatchedContextResult {
  state: "mismatched-context";
  phase: "context-copy" | "provider-return" | "current-project";
  message: string;
  mutationAuthorization: false;
  semanticChangesMade: 0;
}

export interface ProviderReturnBlockedResult {
  state: "blocked";
  phase: "current-project" | "maintenance";
  message: string;
  maintenance?: SemanticMaintenanceResult;
  recoveryRequired: boolean;
  semanticChangesMade: 0 | 1 | "unknown";
}

export interface ProviderReturnCandidateResult {
  state: "candidate-received";
  provider: ProviderContextProvider;
  contextPacketId: string;
  maintenance: SemanticMaintenanceResult;
  semanticChangesMade: 0 | 1 | "unknown";
}

export type ProviderReturnResult =
  | ProviderReturnNoCandidateResult
  | ProviderReturnStaleContextResult
  | ProviderReturnMismatchedContextResult
  | ProviderReturnBlockedResult
  | ProviderReturnCandidateResult;

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function strictKeys(value: Record<string, unknown>, required: readonly string[]): void {
  const allowed = new Set(required);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`Provider roundtrip schema contains unsupported field: ${key}.`);
  }
  for (const key of required) {
    if (!(key in value)) throw new Error(`Provider roundtrip schema is missing required field: ${key}.`);
  }
}

function parseProvider(value: unknown): ProviderContextProvider {
  if (value !== "claude-code" && value !== "codex") throw new Error("Provider roundtrip provider is unsupported.");
  return value;
}

function parsePacketId(value: unknown): string {
  if (typeof value !== "string" || !PACKET_ID_PATTERN.test(value)) throw new Error("Provider context packet id is invalid.");
  return value;
}

function parseSha256(value: unknown, label: string): string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) throw new Error(`${label} must be a lowercase SHA-256 digest.`);
  return value;
}

function parseStableIdentity(value: unknown): string {
  if (typeof value !== "string" || !isStableProjectIdentity(value)) throw new Error("Stable project identity is invalid.");
  return value;
}

function parseBaseline(value: unknown): ProjectContextBaseline {
  if (!plainObject(value)) throw new Error("Provider context baseline must be an object.");
  strictKeys(value, ["algorithm", "domain", "digest", "schemaVersion"]);
  if (value.algorithm !== "sha256") throw new Error("Provider context baseline algorithm is unsupported.");
  if (value.domain !== PROJECT_CONTEXT_BASELINE_DOMAIN) throw new Error("Provider context baseline domain is unsupported.");
  const digest = parseSha256(value.digest, "Provider context baseline digest");
  if (!Number.isSafeInteger(value.schemaVersion) || (value.schemaVersion as number) < 1) {
    throw new Error("Provider context baseline schema version is invalid.");
  }
  return {
    algorithm: "sha256",
    domain: PROJECT_CONTEXT_BASELINE_DOMAIN,
    digest,
    schemaVersion: value.schemaVersion as number,
  };
}

function parseProjection(value: unknown): void {
  if (!plainObject(value)) throw new Error("Provider context projection must be an object.");
  strictKeys(value, [
    "derived",
    "providerContext",
    "automaticInjection",
    "returnedCopiesTrusted",
    "mutationAuthorization",
    "applySupported",
    "authorizationEligible",
  ]);
  if (value.derived !== true
    || value.providerContext !== true
    || value.automaticInjection !== false
    || value.returnedCopiesTrusted !== false
    || value.mutationAuthorization !== false
    || value.applySupported !== false
    || value.authorizationEligible !== false) {
    throw new Error("Provider context projection flags are invalid.");
  }
}

export function providerReturnTaskDigest(task: string): string {
  const hash = createHash("sha256");
  hash.update(PROVIDER_RETURN_TASK_DIGEST_DOMAIN, "utf8");
  hash.update(Buffer.from([0]));
  hash.update(task, "utf8");
  return hash.digest("hex");
}

export function parseSuppliedReadyProviderContext(value: unknown): SuppliedReadyProviderContext {
  if (!plainObject(value)) throw new Error("Provider context copy must contain one object.");
  strictKeys(value, [
    "schemaVersion",
    "packetVersion",
    "generatedAt",
    "frameworkVersion",
    "provider",
    "projectLocator",
    "stableProjectIdentity",
    "projection",
    "mutationAuthorization",
    "applySupported",
    "authorizationEligible",
    "changesMade",
    "state",
    "packetId",
    "baseline",
    "safetyState",
    "evidence",
    "task",
    "findings",
  ]);
  if (value.schemaVersion !== 1 || value.packetVersion !== 1 || value.state !== "ready") {
    throw new Error("Only ready Provider Context v1 packets are accepted for roundtrip intake.");
  }
  if (typeof value.generatedAt !== "string" || typeof value.frameworkVersion !== "string" || typeof value.projectLocator !== "string") {
    throw new Error("Provider context copy contains invalid metadata.");
  }
  const provider = parseProvider(value.provider);
  const packetId = parsePacketId(value.packetId);
  const stableProjectIdentity = parseStableIdentity(value.stableProjectIdentity);
  const baseline = parseBaseline(value.baseline);
  parseProjection(value.projection);
  if (value.mutationAuthorization !== false || value.applySupported !== false || value.authorizationEligible !== false || value.changesMade !== 0) {
    throw new Error("Provider context copy contains invalid authority flags.");
  }
  if (value.safetyState !== "clear") throw new Error("Blocked Provider Context cannot be used as a ready roundtrip root.");
  if (!plainObject(value.evidence)) throw new Error("Provider context evidence must be an object.");
  if (!Array.isArray(value.findings) || value.findings.length !== 0) throw new Error("Ready Provider Context must not contain blocking findings.");
  if (!plainObject(value.task)) throw new Error("Provider context task must be an object.");
  strictKeys(value.task, ["value", "authorityClass"]);
  if (typeof value.task.value !== "string" || value.task.value.trim().length === 0 || value.task.authorityClass !== "session-ephemeral") {
    throw new Error("Provider context task is invalid.");
  }
  const expectedPacketId = providerContextPacketId(provider, baseline.digest, value.task.value);
  if (packetId !== expectedPacketId) throw new Error("Provider context packet id does not match its provider/baseline/task material.");

  return {
    schemaVersion: 1,
    packetVersion: 1,
    state: "ready",
    provider,
    packetId,
    stableProjectIdentity,
    baseline,
    task: { value: value.task.value, authorityClass: "session-ephemeral" },
  };
}

export function parseProviderReturnEvidence(value: unknown): ProviderReturnEvidence {
  if (!plainObject(value)) throw new Error("Provider return JSON must contain one object.");
  strictKeys(value, [
    "schemaVersion",
    "packetVersion",
    "provider",
    "contextPacketId",
    "stableProjectIdentity",
    "baselineDigest",
    "taskDigest",
    "candidate",
  ]);
  if (value.schemaVersion !== PROVIDER_RETURN_SCHEMA_VERSION || value.packetVersion !== PROVIDER_RETURN_PACKET_VERSION) {
    throw new Error("Provider return schema or packet version is unsupported.");
  }
  return {
    schemaVersion: 1,
    packetVersion: 1,
    provider: parseProvider(value.provider),
    contextPacketId: parsePacketId(value.contextPacketId),
    stableProjectIdentity: parseStableIdentity(value.stableProjectIdentity),
    baselineDigest: parseSha256(value.baselineDigest, "Provider return baseline digest"),
    taskDigest: parseSha256(value.taskDigest, "Provider return task digest"),
    candidate: value.candidate === null ? null : parseSemanticProposalCandidate(value.candidate),
  };
}

function maintenanceChanges(result: SemanticMaintenanceResult): 0 | 1 | "unknown" {
  return result.semanticChangesMade;
}

export async function processProviderReturn(
  suppliedContextValue: unknown,
  returnValue: unknown,
  authorizationId?: string,
  projectPath: string = process.cwd(),
): Promise<ProviderReturnResult> {
  let context: SuppliedReadyProviderContext;
  try {
    context = parseSuppliedReadyProviderContext(suppliedContextValue);
  } catch (error) {
    return {
      state: "mismatched-context",
      phase: "context-copy",
      message: error instanceof Error ? error.message : "Provider context copy is invalid.",
      mutationAuthorization: false,
      semanticChangesMade: 0,
    };
  }

  let returned: ProviderReturnEvidence;
  try {
    returned = parseProviderReturnEvidence(returnValue);
  } catch (error) {
    return {
      state: "mismatched-context",
      phase: "provider-return",
      message: error instanceof Error ? error.message : "Provider return evidence is invalid.",
      mutationAuthorization: false,
      semanticChangesMade: 0,
    };
  }

  if (returned.provider !== context.provider
    || returned.contextPacketId !== context.packetId
    || returned.stableProjectIdentity !== context.stableProjectIdentity
    || returned.baselineDigest !== context.baseline.digest
    || returned.taskDigest !== providerReturnTaskDigest(context.task.value)) {
    return {
      state: "mismatched-context",
      phase: "provider-return",
      message: "Provider return evidence does not match the supplied Provider Context correlation material.",
      mutationAuthorization: false,
      semanticChangesMade: 0,
    };
  }

  const current = await buildProjectContextSnapshot(projectPath);
  if (current.safetyState !== "clear") {
    return {
      state: "blocked",
      phase: "current-project",
      message: current.findings.map((finding) => finding.message).join("; ") || "Current Project Brain context is blocked.",
      recoveryRequired: false,
      semanticChangesMade: 0,
    };
  }

  if (current.stableProjectIdentity !== context.stableProjectIdentity) {
    return {
      state: "mismatched-context",
      phase: "current-project",
      message: "Provider return belongs to a different logical Project Brain identity.",
      mutationAuthorization: false,
      semanticChangesMade: 0,
    };
  }

  if (current.baseline.algorithm !== context.baseline.algorithm
    || current.baseline.domain !== context.baseline.domain
    || current.baseline.schemaVersion !== context.baseline.schemaVersion
    || current.baseline.digest !== context.baseline.digest) {
    return {
      state: "stale-context",
      provider: context.provider,
      contextPacketId: context.packetId,
      suppliedBaselineDigest: context.baseline.digest,
      currentBaseline: current.baseline,
      message: "Project Brain changed after the supplied Provider Context baseline. Obtain fresh provider context before resubmitting durable-change evidence.",
      mutationAuthorization: false,
      semanticChangesMade: 0,
    };
  }

  if (returned.candidate === null) {
    return {
      state: "no-candidate",
      provider: context.provider,
      contextPacketId: context.packetId,
      currentBaseline: current.baseline,
      mutationAuthorization: false,
      semanticChangesMade: 0,
    };
  }

  const maintenance = await maintainSemanticProjectState(returned.candidate, authorizationId, projectPath);
  if (maintenance.state === "blocked") {
    return {
      state: "blocked",
      phase: "maintenance",
      message: maintenance.message,
      maintenance,
      recoveryRequired: maintenance.recoveryRequired,
      semanticChangesMade: maintenanceChanges(maintenance),
    };
  }

  return {
    state: "candidate-received",
    provider: context.provider,
    contextPacketId: context.packetId,
    maintenance,
    semanticChangesMade: maintenanceChanges(maintenance),
  };
}
