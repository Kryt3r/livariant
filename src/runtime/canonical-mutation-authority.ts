import { lstat, readFile, realpath } from "node:fs/promises";
import { userInfo } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import type { ActionableProposalScope } from "./actionable-proposal.js";
import { inspectAuthorizationAudit, type ProjectAuthorizationRecord } from "./authorization.js";

interface ApplyingMachineReceipt {
  schemaVersion: 1;
  kind: "semantic-mutation-authorization";
  state: "applying";
  authorizedAt: string;
  authorizationId: string;
  stableProjectIdentity: string;
  actionableProposalId: string;
  actionableProposalVersion: 1;
  proposalDigest: string;
  mutationScope: ActionableProposalScope;
  baseline: ProjectAuthorizationRecord["baseline"];
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

function sameScope(left: ActionableProposalScope, right: ActionableProposalScope): boolean {
  return left.domain === right.domain
    && left.changeKind === right.changeKind
    && left.proposedStatement === right.proposedStatement
    && left.targetDecisionId === right.targetDecisionId;
}

function sameBaseline(left: ProjectAuthorizationRecord["baseline"], right: ProjectAuthorizationRecord["baseline"]): boolean {
  return left.algorithm === right.algorithm
    && left.domain === right.domain
    && left.digest === right.digest
    && left.schemaVersion === right.schemaVersion;
}

function parseMachineReceipt(value: unknown): ApplyingMachineReceipt {
  if (!plainObject(value)) throw new Error("Machine-local semantic authorization receipt is invalid.");
  const allowed = new Set([
    "schemaVersion", "kind", "state", "authorizedAt", "authorizationId", "stableProjectIdentity",
    "actionableProposalId", "actionableProposalVersion", "proposalDigest", "mutationScope", "baseline",
  ]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error("Machine-local semantic authorization receipt contains an unsupported field.");
  for (const key of allowed) if (!(key in value)) throw new Error(`Machine-local semantic authorization receipt is missing required field: ${key}.`);
  if (value.schemaVersion !== 1 || value.kind !== "semantic-mutation-authorization" || value.state !== "applying") {
    throw new Error("Canonical mutation requires machine-local semantic authorization in applying state.");
  }
  if (typeof value.authorizedAt !== "string") throw new Error("Machine-local semantic authorization receipt timestamp is invalid.");
  if (!isStableProjectIdentity(value.authorizationId) || !isStableProjectIdentity(value.stableProjectIdentity)) {
    throw new Error("Machine-local semantic authorization identity is invalid.");
  }
  if (typeof value.actionableProposalId !== "string" || !value.actionableProposalId.startsWith("actionable-proposal-v1:")) {
    throw new Error("Machine-local semantic authorization proposal identity is invalid.");
  }
  if (value.actionableProposalVersion !== 1 || typeof value.proposalDigest !== "string" || !/^[a-f0-9]{64}$/.test(value.proposalDigest)) {
    throw new Error("Machine-local semantic authorization proposal binding is invalid.");
  }
  if (!plainObject(value.mutationScope) || !plainObject(value.baseline)) {
    throw new Error("Machine-local semantic authorization binding is invalid.");
  }
  return value as unknown as ApplyingMachineReceipt;
}

function sameBinding(receipt: ApplyingMachineReceipt, active: ProjectAuthorizationRecord): boolean {
  return receipt.authorizationId === active.authorizationId
    && receipt.stableProjectIdentity === active.stableProjectIdentity
    && receipt.actionableProposalId === active.actionableProposalId
    && receipt.actionableProposalVersion === active.actionableProposalVersion
    && receipt.proposalDigest === active.proposalDigest
    && sameScope(receipt.mutationScope, active.mutationScope)
    && sameBaseline(receipt.baseline, active.baseline);
}

async function readApplyingMachineReceipt(projectRoot: string, active: ProjectAuthorizationRecord): Promise<ApplyingMachineReceipt> {
  const home = resolve(userInfo().homedir);
  const base = resolve(home, ".livariant", "trust", "semantic-authorizations");
  const projectRootPath = resolve(base, active.stableProjectIdentity);
  const receiptPath = resolve(projectRootPath, `${active.authorizationId}.json`);
  const [physicalHome, physicalProject] = await Promise.all([realpath(home), realpath(projectRoot)]);
  if (!pathIsWithin(physicalHome, base)) throw new Error("Machine-local semantic authorization root escapes the operating-system user home.");
  if (pathIsWithin(base, physicalProject) || pathIsWithin(physicalProject, base)) {
    throw new Error("Machine-local semantic authorization must not overlap the current project directory.");
  }
  if (!pathIsWithin(base, projectRootPath) || !pathIsWithin(projectRootPath, receiptPath)) {
    throw new Error("Machine-local semantic authorization receipt path is unsafe.");
  }
  const [baseStat, projectStat, receiptStat] = await Promise.all([lstat(base), lstat(projectRootPath), lstat(receiptPath)]);
  if (!baseStat.isDirectory() || baseStat.isSymbolicLink() || !projectStat.isDirectory() || projectStat.isSymbolicLink()) {
    throw new Error("Machine-local semantic authorization root is unsafe.");
  }
  if (!receiptStat.isFile() || receiptStat.isSymbolicLink()) throw new Error("Machine-local semantic authorization receipt is unsafe.");
  return parseMachineReceipt(JSON.parse(await readFile(receiptPath, "utf8")) as unknown);
}

export async function assertApplyingCanonicalMutationAuthority(
  expectedScope: ActionableProposalScope,
  projectRoot: string,
): Promise<ProjectAuthorizationRecord> {
  const audit = await inspectAuthorizationAudit(projectRoot);
  const active = audit.active;
  if (!active || active.state !== "applying") {
    throw new Error("Canonical semantic mutation requires proposal-bound Authorization already consumed into applying state; legacy --apply is not Authority.");
  }
  if (!sameScope(active.mutationScope, expectedScope)) {
    throw new Error("Canonical semantic mutation scope does not match the active proposal-bound Authorization.");
  }
  const receipt = await readApplyingMachineReceipt(projectRoot, active);
  if (!sameBinding(receipt, active)) {
    throw new Error("Machine-local semantic authorization does not match the active project authorization binding.");
  }
  return active;
}
