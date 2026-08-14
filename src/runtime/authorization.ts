import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { discoverProject } from "../project/discovery.js";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { assertPathWithinRoot, assertRegularFile } from "../project-brain/path-safety.js";
import {
  buildActionableProposal,
  parseActionableProposal,
  type ActionableProposal,
  type ActionableProposalScope,
} from "./actionable-proposal.js";
import type { ProjectContextBaseline } from "./project-context-material.js";

export const AUTHORIZATION_SCHEMA_VERSION = 1;
export type AuthorizationState =
  | "preparing"
  | "authorized"
  | "applying"
  | "completed"
  | "failed-recovery-required"
  | "invalidated";

const MACHINE_AUTH_KIND = "semantic-mutation-authorization" as const;
const PROJECT_AUDIT_KIND = "semantic-mutation-authorization-audit" as const;

interface AuthorizationBinding {
  authorizationId: string;
  stableProjectIdentity: string;
  actionableProposalId: string;
  actionableProposalVersion: 1;
  proposalDigest: string;
  mutationScope: ActionableProposalScope;
  baseline: ProjectContextBaseline;
}

export interface ProjectAuthorizationRecord extends AuthorizationBinding {
  schemaVersion: 1;
  kind: typeof PROJECT_AUDIT_KIND;
  state: AuthorizationState;
  authorizedAt: string;
}

export interface MachineAuthorizationReceipt extends AuthorizationBinding {
  schemaVersion: 1;
  kind: typeof MACHINE_AUTH_KIND;
  state: Exclude<AuthorizationState, "preparing">;
  authorizedAt: string;
}

export interface AuthorizationResult {
  state: "authorized";
  authorization: ProjectAuthorizationRecord;
  machineAuthorityVerified: true;
  mutationAuthorization: true;
  applySupported: false;
  semanticChangesMade: 0;
  authorizationStateChangesMade: 1;
}

export interface AuthorizationOptions {
  beforeCommit?: () => void | Promise<void>;
}

function errno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function strictKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const allow = new Set(allowed);
  for (const key of Object.keys(value)) if (!allow.has(key)) throw new Error(`${label} contains an unsupported field.`);
  for (const key of allowed) if (!(key in value)) throw new Error(`${label} is missing required field: ${key}.`);
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && !rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep));
}

function sameBaseline(left: ProjectContextBaseline, right: ProjectContextBaseline): boolean {
  return left.algorithm === right.algorithm && left.domain === right.domain && left.digest === right.digest && left.schemaVersion === right.schemaVersion;
}

function sameScope(left: ActionableProposalScope, right: ActionableProposalScope): boolean {
  return left.domain === right.domain
    && left.changeKind === right.changeKind
    && left.proposedStatement === right.proposedStatement
    && left.targetDecisionId === right.targetDecisionId;
}

function bindingFromProposal(authorizationId: string, proposal: ActionableProposal): AuthorizationBinding {
  return {
    authorizationId,
    stableProjectIdentity: proposal.stableProjectIdentity,
    actionableProposalId: proposal.actionableProposalId,
    actionableProposalVersion: 1,
    proposalDigest: proposal.materialDigest.digest,
    mutationScope: proposal.mutationScope,
    baseline: proposal.baseline,
  };
}

function sameBinding(left: AuthorizationBinding, right: AuthorizationBinding): boolean {
  return left.authorizationId === right.authorizationId
    && left.stableProjectIdentity === right.stableProjectIdentity
    && left.actionableProposalId === right.actionableProposalId
    && left.actionableProposalVersion === right.actionableProposalVersion
    && left.proposalDigest === right.proposalDigest
    && sameScope(left.mutationScope, right.mutationScope)
    && sameBaseline(left.baseline, right.baseline);
}

function parseScope(value: unknown): ActionableProposalScope {
  if (!plainObject(value)) throw new Error("Authorization mutation scope is invalid.");
  const allowed = value.changeKind === "supersede"
    ? ["domain", "changeKind", "proposedStatement", "targetDecisionId"] as const
    : ["domain", "changeKind", "proposedStatement"] as const;
  strictKeys(value, allowed, "Authorization mutation scope");
  if (value.domain !== "project-decision" && value.domain !== "project-goal" && value.domain !== "project-knowledge") throw new Error("Authorization mutation scope domain is invalid.");
  if (value.changeKind !== "add" && value.changeKind !== "supersede") throw new Error("Authorization mutation scope change kind is invalid.");
  if (typeof value.proposedStatement !== "string" || !value.proposedStatement) throw new Error("Authorization mutation scope statement is invalid.");
  if (value.changeKind === "supersede" && (typeof value.targetDecisionId !== "string" || !value.targetDecisionId)) throw new Error("Authorization supersession target is invalid.");
  return {
    domain: value.domain,
    changeKind: value.changeKind,
    proposedStatement: value.proposedStatement,
    targetDecisionId: typeof value.targetDecisionId === "string" ? value.targetDecisionId : undefined,
  };
}

function parseBaseline(value: unknown): ProjectContextBaseline {
  if (!plainObject(value) || value.algorithm !== "sha256" || value.domain !== "livariant:project-context-baseline:v1" || typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest) || typeof value.schemaVersion !== "number") {
    throw new Error("Authorization baseline is invalid.");
  }
  return value as unknown as ProjectContextBaseline;
}

function parseBinding(value: Record<string, unknown>): AuthorizationBinding {
  if (typeof value.authorizationId !== "string" || !isStableProjectIdentity(value.authorizationId)) throw new Error("Authorization id is invalid.");
  if (typeof value.stableProjectIdentity !== "string" || !isStableProjectIdentity(value.stableProjectIdentity)) throw new Error("Authorization project identity is invalid.");
  if (typeof value.actionableProposalId !== "string" || !value.actionableProposalId.startsWith("actionable-proposal-v1:")) throw new Error("Authorization actionable proposal id is invalid.");
  if (value.actionableProposalVersion !== 1) throw new Error("Authorization actionable proposal version is invalid.");
  if (typeof value.proposalDigest !== "string" || !/^[a-f0-9]{64}$/.test(value.proposalDigest)) throw new Error("Authorization proposal digest is invalid.");
  return {
    authorizationId: value.authorizationId,
    stableProjectIdentity: value.stableProjectIdentity,
    actionableProposalId: value.actionableProposalId,
    actionableProposalVersion: 1,
    proposalDigest: value.proposalDigest,
    mutationScope: parseScope(value.mutationScope),
    baseline: parseBaseline(value.baseline),
  };
}

function parseProjectRecord(value: unknown): ProjectAuthorizationRecord {
  if (!plainObject(value)) throw new Error("Project authorization audit record is invalid.");
  strictKeys(value, ["schemaVersion", "kind", "state", "authorizedAt", "authorizationId", "stableProjectIdentity", "actionableProposalId", "actionableProposalVersion", "proposalDigest", "mutationScope", "baseline"], "Project authorization audit record");
  if (value.schemaVersion !== 1 || value.kind !== PROJECT_AUDIT_KIND) throw new Error("Project authorization audit record schema is invalid.");
  if (!["preparing", "authorized", "applying", "completed", "failed-recovery-required", "invalidated"].includes(String(value.state))) throw new Error("Project authorization audit state is invalid.");
  if (typeof value.authorizedAt !== "string") throw new Error("Project authorization audit timestamp is invalid.");
  return {
    schemaVersion: 1,
    kind: PROJECT_AUDIT_KIND,
    state: value.state as AuthorizationState,
    authorizedAt: value.authorizedAt,
    ...parseBinding(value),
  };
}

function parseMachineReceipt(value: unknown): MachineAuthorizationReceipt {
  if (!plainObject(value)) throw new Error("Machine-local authorization receipt is invalid.");
  strictKeys(value, ["schemaVersion", "kind", "state", "authorizedAt", "authorizationId", "stableProjectIdentity", "actionableProposalId", "actionableProposalVersion", "proposalDigest", "mutationScope", "baseline"], "Machine-local authorization receipt");
  if (value.schemaVersion !== 1 || value.kind !== MACHINE_AUTH_KIND) throw new Error("Machine-local authorization receipt schema is invalid.");
  if (!["authorized", "applying", "completed", "failed-recovery-required", "invalidated"].includes(String(value.state))) throw new Error("Machine-local authorization receipt state is invalid.");
  if (typeof value.authorizedAt !== "string") throw new Error("Machine-local authorization receipt timestamp is invalid.");
  return {
    schemaVersion: 1,
    kind: MACHINE_AUTH_KIND,
    state: value.state as MachineAuthorizationReceipt["state"],
    authorizedAt: value.authorizedAt,
    ...parseBinding(value),
  };
}

async function ensureRealDirectory(path: string, label: string): Promise<void> {
  let stats;
  try { stats = await lstat(path); } catch (error) {
    if (!errno(error, "ENOENT")) throw error;
    await mkdir(path, { recursive: false });
    stats = await lstat(path);
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory and must not be a symbolic link.`);
}

function projectAuthorizationPaths(projectRoot: string) {
  const brain = resolve(projectRoot, ".project-brain");
  const root = resolve(brain, ".authorizations");
  const active = resolve(root, "active.json");
  const history = resolve(root, "history");
  assertPathWithinRoot(brain, root, "Project authorization root");
  assertPathWithinRoot(root, active, "Project active authorization path");
  assertPathWithinRoot(root, history, "Project authorization history path");
  return { brain, root, active, history };
}

async function ensureProjectAuthorizationRoot(projectRoot: string): Promise<ReturnType<typeof projectAuthorizationPaths>> {
  const paths = projectAuthorizationPaths(projectRoot);
  await ensureRealDirectory(paths.root, "Project authorization root");
  await ensureRealDirectory(paths.history, "Project authorization history");
  return paths;
}

async function readProjectActive(projectRoot: string): Promise<{ record: ProjectAuthorizationRecord; raw: string } | null> {
  const paths = await ensureProjectAuthorizationRoot(projectRoot);
  try { await assertRegularFile(paths.active, "Project active authorization record"); }
  catch (error) {
    if (errno(error, "ENOENT")) return null;
    throw error;
  }
  const raw = await readFile(paths.active, "utf8");
  return { record: parseProjectRecord(JSON.parse(raw) as unknown), raw };
}

async function writeProjectPreparing(projectRoot: string, record: ProjectAuthorizationRecord): Promise<void> {
  const paths = await ensureProjectAuthorizationRoot(projectRoot);
  await writeFile(paths.active, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

async function replaceProjectActive(projectRoot: string, expectedRaw: string, record: ProjectAuthorizationRecord): Promise<void> {
  const paths = await ensureProjectAuthorizationRoot(projectRoot);
  const temp = resolve(paths.root, `.active.tmp-${randomUUID()}.json`);
  assertPathWithinRoot(paths.root, temp, "Project authorization candidate path");
  await writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    const current = await readFile(paths.active, "utf8");
    if (current !== expectedRaw) throw new Error("Project authorization audit changed concurrently.");
    await rename(temp, paths.active);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

async function archiveProjectActive(projectRoot: string, expectedRaw: string, record: ProjectAuthorizationRecord): Promise<void> {
  const paths = await ensureProjectAuthorizationRoot(projectRoot);
  const historyPath = resolve(paths.history, `${record.authorizationId}.json`);
  assertPathWithinRoot(paths.history, historyPath, "Project authorization history record path");
  const current = await readFile(paths.active, "utf8");
  if (current !== expectedRaw) throw new Error("Project authorization audit changed concurrently.");
  await writeFile(historyPath, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  const after = await readFile(paths.active, "utf8");
  if (after !== expectedRaw) throw new Error("Project authorization audit changed while terminal evidence was being committed.");
  await rm(paths.active);
}

function machineAuthorizationBase(): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations");
}

async function safeMachineAuthorizationRoot(projectRoot: string, projectId: string): Promise<string> {
  if (!isStableProjectIdentity(projectId)) throw new Error("Machine-local authorization requires a valid stable project identity.");
  const home = userInfo().homedir;
  const base = machineAuthorizationBase();
  await mkdir(base, { recursive: true });
  const [physicalHome, physicalBase, physicalProject] = await Promise.all([realpath(home), realpath(base), realpath(projectRoot)]);
  if (!pathIsWithin(physicalHome, physicalBase)) throw new Error("Machine-local semantic authorization root resolves outside the operating-system user home.");
  if (pathIsWithin(physicalBase, physicalProject) || pathIsWithin(physicalProject, physicalBase)) throw new Error("Machine-local semantic authorization must not overlap the current project directory.");
  const baseStats = await lstat(physicalBase);
  if (!baseStats.isDirectory() || baseStats.isSymbolicLink()) throw new Error("Machine-local semantic authorization root must be a real directory.");
  const projectAuthority = resolve(physicalBase, projectId);
  if (!pathIsWithin(physicalBase, projectAuthority)) throw new Error("Machine-local semantic authorization project path is unsafe.");
  await ensureRealDirectory(projectAuthority, "Machine-local semantic authorization project root");
  return realpath(projectAuthority);
}

function machinePaths(root: string, authorizationId: string) {
  if (!isStableProjectIdentity(authorizationId)) throw new Error("Machine-local authorization id is invalid.");
  const receipt = resolve(root, `${authorizationId}.json`);
  const lock = resolve(root, `${authorizationId}.lock`);
  if (!pathIsWithin(root, receipt) || !pathIsWithin(root, lock)) throw new Error("Machine-local authorization path is unsafe.");
  return { receipt, lock };
}

async function readMachineReceipt(projectRoot: string, binding: AuthorizationBinding): Promise<{ receipt: MachineAuthorizationReceipt; raw: string } | null> {
  const root = await safeMachineAuthorizationRoot(projectRoot, binding.stableProjectIdentity);
  const { receipt } = machinePaths(root, binding.authorizationId);
  let stats;
  try { stats = await lstat(receipt); } catch (error) {
    if (errno(error, "ENOENT")) return null;
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("Machine-local authorization receipt is unsafe.");
  const raw = await readFile(receipt, "utf8");
  const parsed = parseMachineReceipt(JSON.parse(raw) as unknown);
  if (!sameBinding(parsed, binding)) throw new Error("Machine-local authorization receipt does not match project authorization binding.");
  return { receipt: parsed, raw };
}

async function createMachineReceipt(projectRoot: string, receipt: MachineAuthorizationReceipt): Promise<void> {
  const root = await safeMachineAuthorizationRoot(projectRoot, receipt.stableProjectIdentity);
  const { receipt: path } = machinePaths(root, receipt.authorizationId);
  await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

async function withMachineLock<T>(projectRoot: string, binding: AuthorizationBinding, action: (receiptPath: string) => Promise<T>): Promise<T> {
  const root = await safeMachineAuthorizationRoot(projectRoot, binding.stableProjectIdentity);
  const { receipt, lock } = machinePaths(root, binding.authorizationId);
  try { await mkdir(lock, { recursive: false }); }
  catch (error) {
    if (errno(error, "EEXIST")) throw new Error("Machine-local authorization is locked by another consumer or an interrupted transition; refusing replay.");
    throw error;
  }
  try { return await action(receipt); }
  finally {
    try { await rm(lock, { recursive: true, force: true }); } catch { /* lock cleanup failure leaves later operations fail-closed only if directory remains */ }
  }
}

async function transitionMachineReceipt(
  projectRoot: string,
  binding: AuthorizationBinding,
  expectedState: MachineAuthorizationReceipt["state"],
  nextState: MachineAuthorizationReceipt["state"],
): Promise<MachineAuthorizationReceipt> {
  return withMachineLock(projectRoot, binding, async (path) => {
    await assertRegularFile(path, "Machine-local semantic authorization receipt");
    const raw = await readFile(path, "utf8");
    const current = parseMachineReceipt(JSON.parse(raw) as unknown);
    if (!sameBinding(current, binding)) throw new Error("Machine-local authorization binding changed or was substituted.");
    if (current.state !== expectedState) throw new Error(`Machine-local authorization is ${current.state}, not ${expectedState}; refusing replay.`);
    const next = { ...current, state: nextState } as MachineAuthorizationReceipt;
    const temp = resolve(resolve(path, ".."), `.${binding.authorizationId}.tmp-${randomUUID()}.json`);
    if (!pathIsWithin(resolve(path, ".."), temp)) throw new Error("Machine-local authorization candidate path is unsafe.");
    await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    try {
      const observed = await readFile(path, "utf8");
      if (observed !== raw) throw new Error("Machine-local authorization changed concurrently.");
      await rename(temp, path);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
    return next;
  });
}

function assertProposalMatchesFresh(input: ActionableProposal, fresh: ActionableProposal): void {
  if (input.actionableProposalId !== fresh.actionableProposalId
    || input.materialDigest.digest !== fresh.materialDigest.digest
    || input.stableProjectIdentity !== fresh.stableProjectIdentity
    || !sameBaseline(input.baseline, fresh.baseline)
    || !sameScope(input.mutationScope, fresh.mutationScope)) {
    throw new Error("Actionable proposal no longer matches the current trusted Project Brain baseline and exact mutation scope.");
  }
}

async function rebuildAndVerifyProposal(input: ActionableProposal, projectRoot: string): Promise<ActionableProposal> {
  const parsed = parseActionableProposal(input);
  const fresh = await buildActionableProposal(parsed.candidate, projectRoot);
  if (fresh.state !== "actionable-proposal") throw new Error("Current Project Brain state cannot reproduce an authorization-eligible actionable proposal.");
  assertProposalMatchesFresh(parsed, fresh.proposal);
  return fresh.proposal;
}

export async function authorizeActionableProposal(
  input: ActionableProposal,
  projectPath: string = process.cwd(),
  options: AuthorizationOptions = {},
): Promise<AuthorizationResult> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error("Authorization requires a valid Project Brain.");

  const fresh = await rebuildAndVerifyProposal(input, project.root);
  await options.beforeCommit?.();
  const revalidated = await rebuildAndVerifyProposal(input, project.root);
  assertProposalMatchesFresh(fresh, revalidated);

  const existing = await readProjectActive(project.root);
  if (existing) {
    const expected = bindingFromProposal(existing.record.authorizationId, revalidated);
    if (!sameBinding(existing.record, expected)) throw new Error("A different or stale active authorization record already exists; refusing ambiguous authority.");
    if (existing.record.state === "authorized") {
      const machine = await readMachineReceipt(project.root, expected);
      if (!machine || machine.receipt.state !== "authorized") throw new Error("Project authorization audit exists without matching authorized machine-local authority.");
      return {
        state: "authorized",
        authorization: existing.record,
        machineAuthorityVerified: true,
        mutationAuthorization: true,
        applySupported: false,
        semanticChangesMade: 0,
        authorizationStateChangesMade: 0 as 1,
      };
    }
    if (existing.record.state !== "preparing") throw new Error(`Active authorization is ${existing.record.state}; it cannot be reused for a new authorization event.`);

    let machine = await readMachineReceipt(project.root, expected);
    if (!machine) {
      const receipt: MachineAuthorizationReceipt = { ...expected, schemaVersion: 1, kind: MACHINE_AUTH_KIND, state: "authorized", authorizedAt: existing.record.authorizedAt };
      await createMachineReceipt(project.root, receipt);
      machine = { receipt, raw: `${JSON.stringify(receipt, null, 2)}\n` };
    }
    if (machine.receipt.state !== "authorized") throw new Error("Machine-local authorization is not in authorized state during creation recovery.");
    const next = { ...existing.record, state: "authorized" as const };
    await replaceProjectActive(project.root, existing.raw, next);
    return { state: "authorized", authorization: next, machineAuthorityVerified: true, mutationAuthorization: true, applySupported: false, semanticChangesMade: 0, authorizationStateChangesMade: 1 };
  }

  const authorizationId = randomUUID().toLowerCase();
  if (!isStableProjectIdentity(authorizationId)) throw new Error("Trusted runtime failed to generate a valid authorization id.");
  const binding = bindingFromProposal(authorizationId, revalidated);
  const authorizedAt = new Date().toISOString();
  const preparing: ProjectAuthorizationRecord = { ...binding, schemaVersion: 1, kind: PROJECT_AUDIT_KIND, state: "preparing", authorizedAt };
  await writeProjectPreparing(project.root, preparing);

  const receipt: MachineAuthorizationReceipt = { ...binding, schemaVersion: 1, kind: MACHINE_AUTH_KIND, state: "authorized", authorizedAt };
  try {
    await createMachineReceipt(project.root, receipt);
  } catch (error) {
    throw new Error(`Authorization creation is incomplete and fail-closed: ${error instanceof Error ? error.message : "machine-local authority write failed"}`);
  }

  const active = await readProjectActive(project.root);
  if (!active || active.record.state !== "preparing" || !sameBinding(active.record, binding)) throw new Error("Project-local authorization audit changed during dual-evidence creation.");
  const authorized = { ...active.record, state: "authorized" as const };
  await replaceProjectActive(project.root, active.raw, authorized);
  const machine = await readMachineReceipt(project.root, binding);
  if (!machine || machine.receipt.state !== "authorized") throw new Error("Authorization dual evidence could not be verified after creation.");

  return { state: "authorized", authorization: authorized, machineAuthorityVerified: true, mutationAuthorization: true, applySupported: false, semanticChangesMade: 0, authorizationStateChangesMade: 1 };
}

export async function assertAuthorizationReadyForApply(
  authorizationId: string,
  proposal: ActionableProposal,
  projectPath: string = process.cwd(),
): Promise<ProjectAuthorizationRecord> {
  const project = discoverProject(projectPath);
  const fresh = await rebuildAndVerifyProposal(proposal, project.root);
  const active = await readProjectActive(project.root);
  if (!active) throw new Error("No active project-local authorization audit exists.");
  const expected = bindingFromProposal(authorizationId, fresh);
  if (!sameBinding(active.record, expected) || active.record.state !== "authorized") throw new Error("Project-local authorization is not valid for this exact proposal and baseline.");
  const machine = await readMachineReceipt(project.root, expected);
  if (!machine || machine.receipt.state !== "authorized") throw new Error("Matching independent machine-local authorization is missing or not reusable.");
  return active.record;
}

export async function beginAuthorizationApplication(
  authorizationId: string,
  proposal: ActionableProposal,
  projectPath: string = process.cwd(),
): Promise<ProjectAuthorizationRecord> {
  const project = discoverProject(projectPath);
  const fresh = await rebuildAndVerifyProposal(proposal, project.root);
  const active = await readProjectActive(project.root);
  if (!active) throw new Error("No active authorization exists.");
  const binding = bindingFromProposal(authorizationId, fresh);
  if (!sameBinding(active.record, binding) || active.record.state !== "authorized") throw new Error("Project-local authorization is not authorized for this exact proposal and baseline.");

  await transitionMachineReceipt(project.root, binding, "authorized", "applying");
  const current = await readProjectActive(project.root);
  if (!current || !sameBinding(current.record, binding) || current.record.state !== "authorized") {
    throw new Error("Authorization became authority-ambiguous after machine-local consumption began; recovery is required.");
  }
  const applying = { ...current.record, state: "applying" as const };
  await replaceProjectActive(project.root, current.raw, applying);
  return applying;
}

async function finishAuthorization(
  authorizationId: string,
  projectPath: string,
  terminalState: "completed" | "failed-recovery-required" | "invalidated",
): Promise<ProjectAuthorizationRecord> {
  const project = discoverProject(projectPath);
  const active = await readProjectActive(project.root);
  if (!active) throw new Error("No active authorization exists.");
  if (active.record.authorizationId !== authorizationId) throw new Error("Active authorization id does not match the requested transition.");
  const expectedProjectState: AuthorizationState = terminalState === "invalidated" ? "authorized" : "applying";
  if (active.record.state !== expectedProjectState) throw new Error(`Authorization is ${active.record.state}; cannot transition to ${terminalState}.`);
  const binding: AuthorizationBinding = active.record;
  const expectedMachineState: MachineAuthorizationReceipt["state"] = terminalState === "invalidated" ? "authorized" : "applying";
  await transitionMachineReceipt(project.root, binding, expectedMachineState, terminalState);
  const current = await readProjectActive(project.root);
  if (!current || !sameBinding(current.record, binding) || current.record.state !== expectedProjectState) {
    throw new Error("Authorization became authority-ambiguous while terminal state was being committed.");
  }
  const terminal = { ...current.record, state: terminalState } as ProjectAuthorizationRecord;
  await archiveProjectActive(project.root, current.raw, terminal);
  return terminal;
}

export async function completeAuthorizationApplication(authorizationId: string, projectPath: string = process.cwd()): Promise<ProjectAuthorizationRecord> {
  return finishAuthorization(authorizationId, projectPath, "completed");
}

export async function failAuthorizationApplication(authorizationId: string, projectPath: string = process.cwd()): Promise<ProjectAuthorizationRecord> {
  return finishAuthorization(authorizationId, projectPath, "failed-recovery-required");
}

export async function invalidateAuthorization(authorizationId: string, projectPath: string = process.cwd()): Promise<ProjectAuthorizationRecord> {
  return finishAuthorization(authorizationId, projectPath, "invalidated");
}

export async function inspectAuthorizationAudit(projectPath: string = process.cwd()): Promise<{ active: ProjectAuthorizationRecord | null; history: ProjectAuthorizationRecord[] }> {
  const project = discoverProject(projectPath);
  const paths = await ensureProjectAuthorizationRoot(project.root);
  const active = await readProjectActive(project.root);
  const history: ProjectAuthorizationRecord[] = [];
  for (const name of await readdir(paths.history)) {
    if (!name.endsWith(".json")) throw new Error("Project authorization history contains an unsupported entry.");
    const path = resolve(paths.history, name);
    assertPathWithinRoot(paths.history, path, "Project authorization history entry path");
    await assertRegularFile(path, "Project authorization history record");
    const record = parseProjectRecord(JSON.parse(await readFile(path, "utf8")) as unknown);
    if (!record.state || !["completed", "failed-recovery-required", "invalidated"].includes(record.state)) throw new Error("Project authorization history contains a non-terminal record.");
    if (`${record.authorizationId}.json` !== name) throw new Error("Project authorization history record filename does not match its authorization id.");
    history.push(record);
  }
  if (active && history.some((record) => record.authorizationId === active.record.authorizationId)) throw new Error("Authorization state is ambiguous: the active authorization also exists in terminal history.");
  return { active: active?.record ?? null, history };
}