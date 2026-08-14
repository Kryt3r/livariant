import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { discoverProject } from "../project/discovery.js";
import { assertPathWithinRoot } from "../project-brain/path-safety.js";
import type { ActionableProposal } from "./actionable-proposal.js";
import { inspectAuthorizationAudit, type ProjectAuthorizationRecord } from "./authorization.js";

interface MachineReceipt {
  schemaVersion: 1;
  kind: "semantic-mutation-authorization";
  state: "authorized" | "applying" | "completed" | "failed-recovery-required" | "invalidated";
  authorizedAt: string;
  authorizationId: string;
  stableProjectIdentity: string;
  actionableProposalId: string;
  actionableProposalVersion: 1;
  proposalDigest: string;
  mutationScope: ActionableProposal["mutationScope"];
  baseline: ActionableProposal["baseline"];
}

function errno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && !rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep));
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label = "Machine-local semantic authorization receipt"): void {
  const expected = new Set(keys);
  if (Object.keys(value).length !== keys.length || Object.keys(value).some((key) => !expected.has(key))) {
    throw new Error(`${label} shape is invalid during apply reconciliation.`);
  }
  for (const key of keys) if (!(key in value)) throw new Error(`${label} is missing required material during apply reconciliation.`);
}

function parseScope(value: unknown): ActionableProposal["mutationScope"] {
  if (!plainObject(value)) throw new Error("Machine-local authorization mutation scope is invalid during apply reconciliation.");
  const supersede = value.changeKind === "supersede";
  exactKeys(value, supersede
    ? ["domain", "changeKind", "proposedStatement", "targetDecisionId"]
    : ["domain", "changeKind", "proposedStatement"], "Machine-local authorization mutation scope");
  if (value.domain !== "project-decision" && value.domain !== "project-goal" && value.domain !== "project-knowledge") throw new Error("Machine-local authorization mutation scope domain is invalid during apply reconciliation.");
  if (value.changeKind !== "add" && value.changeKind !== "supersede") throw new Error("Machine-local authorization mutation scope change kind is invalid during apply reconciliation.");
  if (value.changeKind === "supersede" && value.domain !== "project-decision") throw new Error("Only project-decision may be superseded during apply reconciliation.");
  if (typeof value.proposedStatement !== "string" || !value.proposedStatement) throw new Error("Machine-local authorization mutation scope statement is invalid during apply reconciliation.");
  if (supersede && (typeof value.targetDecisionId !== "string" || !value.targetDecisionId)) throw new Error("Machine-local authorization supersession target is invalid during apply reconciliation.");
  return {
    domain: value.domain,
    changeKind: value.changeKind,
    proposedStatement: value.proposedStatement,
    ...(supersede ? { targetDecisionId: value.targetDecisionId as string } : {}),
  };
}

function parseBaseline(value: unknown): ActionableProposal["baseline"] {
  if (!plainObject(value)) throw new Error("Machine-local authorization baseline is invalid during apply reconciliation.");
  exactKeys(value, ["algorithm", "domain", "digest", "schemaVersion"], "Machine-local authorization baseline");
  if (value.algorithm !== "sha256" || value.domain !== "livariant:project-context-baseline:v1" || typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest) || typeof value.schemaVersion !== "number") {
    throw new Error("Machine-local authorization baseline material is invalid during apply reconciliation.");
  }
  return value as unknown as ActionableProposal["baseline"];
}

function sameScope(left: ActionableProposal["mutationScope"], right: ActionableProposal["mutationScope"]): boolean {
  return left.domain === right.domain
    && left.changeKind === right.changeKind
    && left.proposedStatement === right.proposedStatement
    && left.targetDecisionId === right.targetDecisionId;
}

function sameBaseline(left: ActionableProposal["baseline"], right: ActionableProposal["baseline"]): boolean {
  return left.algorithm === right.algorithm
    && left.domain === right.domain
    && left.digest === right.digest
    && left.schemaVersion === right.schemaVersion;
}

function projectBindingMatchesProposal(record: ProjectAuthorizationRecord, authorizationId: string, proposal: ActionableProposal): boolean {
  return record.authorizationId === authorizationId
    && record.stableProjectIdentity === proposal.stableProjectIdentity
    && record.actionableProposalId === proposal.actionableProposalId
    && record.actionableProposalVersion === proposal.actionableProposalVersion
    && record.proposalDigest === proposal.materialDigest.digest
    && sameScope(record.mutationScope, proposal.mutationScope)
    && sameBaseline(record.baseline, proposal.baseline);
}

function parseMachineReceipt(value: unknown): MachineReceipt {
  if (!plainObject(value)) throw new Error("Machine-local semantic authorization receipt is invalid during apply reconciliation.");
  exactKeys(value, [
    "schemaVersion", "kind", "state", "authorizedAt", "authorizationId", "stableProjectIdentity",
    "actionableProposalId", "actionableProposalVersion", "proposalDigest", "mutationScope", "baseline",
  ]);
  if (value.schemaVersion !== 1 || value.kind !== "semantic-mutation-authorization") throw new Error("Machine-local semantic authorization receipt schema is invalid during apply reconciliation.");
  if (!["authorized", "applying", "completed", "failed-recovery-required", "invalidated"].includes(String(value.state))) throw new Error("Machine-local semantic authorization receipt state is invalid during apply reconciliation.");
  if (typeof value.authorizedAt !== "string" || typeof value.authorizationId !== "string" || typeof value.stableProjectIdentity !== "string" || typeof value.actionableProposalId !== "string" || value.actionableProposalVersion !== 1 || typeof value.proposalDigest !== "string" || !/^[a-f0-9]{64}$/.test(value.proposalDigest)) {
    throw new Error("Machine-local semantic authorization receipt binding is invalid during apply reconciliation.");
  }
  return {
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: value.state as MachineReceipt["state"],
    authorizedAt: value.authorizedAt,
    authorizationId: value.authorizationId,
    stableProjectIdentity: value.stableProjectIdentity,
    actionableProposalId: value.actionableProposalId,
    actionableProposalVersion: 1,
    proposalDigest: value.proposalDigest,
    mutationScope: parseScope(value.mutationScope),
    baseline: parseBaseline(value.baseline),
  };
}

function machineMatchesProject(machine: MachineReceipt, project: ProjectAuthorizationRecord): boolean {
  return machine.authorizationId === project.authorizationId
    && machine.stableProjectIdentity === project.stableProjectIdentity
    && machine.actionableProposalId === project.actionableProposalId
    && machine.actionableProposalVersion === project.actionableProposalVersion
    && machine.proposalDigest === project.proposalDigest
    && sameScope(machine.mutationScope, project.mutationScope)
    && sameBaseline(machine.baseline, project.baseline);
}

async function assertRealDirectory(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory during apply reconciliation.`);
}

async function machineRoot(projectRoot: string, projectId: string): Promise<string> {
  const home = userInfo().homedir;
  const base = resolve(home, ".livariant", "trust", "semantic-authorizations");
  await assertRealDirectory(base, "Machine-local semantic authorization root");
  const [physicalHome, physicalBase, physicalProject] = await Promise.all([realpath(home), realpath(base), realpath(projectRoot)]);
  if (!pathIsWithin(physicalHome, physicalBase)) throw new Error("Machine-local semantic authorization root resolves outside the operating-system user home.");
  if (pathIsWithin(physicalBase, physicalProject) || pathIsWithin(physicalProject, physicalBase)) throw new Error("Machine-local semantic authorization root overlaps the project directory.");
  const root = resolve(physicalBase, projectId);
  if (!pathIsWithin(physicalBase, root)) throw new Error("Machine-local semantic authorization project root is unsafe.");
  await assertRealDirectory(root, "Machine-local semantic authorization project root");
  return realpath(root);
}

async function withReconciliationLock<T>(projectRoot: string, record: ProjectAuthorizationRecord, action: (receiptPath: string) => Promise<T>): Promise<T> {
  const root = await machineRoot(projectRoot, record.stableProjectIdentity);
  const receiptPath = resolve(root, `${record.authorizationId}.json`);
  const lockPath = resolve(root, `${record.authorizationId}.lock`);
  if (!pathIsWithin(root, receiptPath) || !pathIsWithin(root, lockPath)) throw new Error("Machine-local semantic authorization reconciliation path is unsafe.");
  try {
    await mkdir(lockPath, { recursive: false });
  } catch (error) {
    if (errno(error, "EEXIST")) throw new Error("Machine-local authorization has an active or interrupted transition lock; refusing reconciliation.");
    throw error;
  }
  try {
    return await action(receiptPath);
  } finally {
    try { await rm(lockPath, { recursive: true, force: true }); } catch { /* remaining lock keeps future reconciliation fail-closed */ }
  }
}

function projectPaths(projectRoot: string) {
  const brain = resolve(projectRoot, ".project-brain");
  const root = resolve(brain, ".authorizations");
  const active = resolve(root, "active.json");
  const history = resolve(root, "history");
  assertPathWithinRoot(brain, root, "Project authorization reconciliation root");
  assertPathWithinRoot(root, active, "Project authorization reconciliation active path");
  assertPathWithinRoot(root, history, "Project authorization reconciliation history path");
  return { root, active, history };
}

async function readValidatedActive(projectRoot: string): Promise<{ record: ProjectAuthorizationRecord; raw: string }> {
  const audit = await inspectAuthorizationAudit(projectRoot);
  if (!audit.active) throw new Error("No active project authorization exists for apply reconciliation.");
  const paths = projectPaths(projectRoot);
  await assertRealDirectory(paths.root, "Project authorization root");
  await assertRealDirectory(paths.history, "Project authorization history");
  const raw = await readFile(paths.active, "utf8");
  return { record: audit.active, raw };
}

async function replaceProjectState(projectRoot: string, expectedRaw: string, record: ProjectAuthorizationRecord): Promise<void> {
  const paths = projectPaths(projectRoot);
  const temp = resolve(paths.root, `.active.apply-reconcile-${randomUUID()}.json`);
  assertPathWithinRoot(paths.root, temp, "Project authorization reconciliation candidate");
  await writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    const current = await readFile(paths.active, "utf8");
    if (current !== expectedRaw) throw new Error("Project authorization changed concurrently during apply reconciliation.");
    await rename(temp, paths.active);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

async function archiveFailedProjectState(projectRoot: string, expectedRaw: string, record: ProjectAuthorizationRecord): Promise<void> {
  const paths = projectPaths(projectRoot);
  const historyPath = resolve(paths.history, `${record.authorizationId}.json`);
  assertPathWithinRoot(paths.history, historyPath, "Project authorization failed history path");
  const current = await readFile(paths.active, "utf8");
  if (current !== expectedRaw) throw new Error("Project authorization changed concurrently during failure reconciliation.");
  await writeFile(historyPath, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  const after = await readFile(paths.active, "utf8");
  if (after !== expectedRaw) throw new Error("Project authorization changed while failure reconciliation was committing.");
  await rm(paths.active);
}

async function readMachine(receiptPath: string, project: ProjectAuthorizationRecord): Promise<MachineReceipt> {
  const stats = await lstat(receiptPath);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("Machine-local semantic authorization receipt is unsafe during apply reconciliation.");
  const machine = parseMachineReceipt(JSON.parse(await readFile(receiptPath, "utf8")) as unknown);
  if (!machineMatchesProject(machine, project)) throw new Error("Machine-local and project authorization bindings disagree during apply reconciliation.");
  return machine;
}

export async function reconcilePreMutationAuthorization(
  authorizationId: string,
  proposal: ActionableProposal,
  projectPath: string = process.cwd(),
): Promise<"applying"> {
  const project = discoverProject(projectPath);
  const initial = await readValidatedActive(project.root);
  if (!projectBindingMatchesProposal(initial.record, authorizationId, proposal)) throw new Error("Active project authorization does not match the exact Actionable Proposal during reconciliation.");

  return withReconciliationLock<"applying">(project.root, initial.record, async (receiptPath) => {
    const current = await readValidatedActive(project.root);
    if (!projectBindingMatchesProposal(current.record, authorizationId, proposal)) throw new Error("Project authorization binding changed during reconciliation.");
    const machine = await readMachine(receiptPath, current.record);

    if (current.record.state === "authorized" && machine.state === "applying") {
      const applying = { ...current.record, state: "applying" as const };
      await replaceProjectState(project.root, current.raw, applying);
      return "applying";
    }
    if (current.record.state === "applying" && machine.state === "applying") return "applying";

    if (current.record.state === "applying" && machine.state === "completed") {
      throw new Error("Machine-local authorization is completed while project authorization is applying; exact post-state proof is unavailable, so recovery remains required.");
    }
    throw new Error(`Authorization state pair ${current.record.state}/${machine.state} is not eligible for pre-mutation reconciliation.`);
  });
}

export async function reconcileFailedAuthorizationApplication(
  authorizationId: string,
  proposal: ActionableProposal,
  projectPath: string = process.cwd(),
): Promise<ProjectAuthorizationRecord> {
  const project = discoverProject(projectPath);
  const initial = await readValidatedActive(project.root);
  if (!projectBindingMatchesProposal(initial.record, authorizationId, proposal)) throw new Error("Active project authorization does not match the exact Actionable Proposal during failure reconciliation.");

  return withReconciliationLock(project.root, initial.record, async (receiptPath) => {
    const current = await readValidatedActive(project.root);
    if (!projectBindingMatchesProposal(current.record, authorizationId, proposal)) throw new Error("Project authorization binding changed during failure reconciliation.");
    const machine = await readMachine(receiptPath, current.record);
    if (current.record.state !== "applying" || machine.state !== "failed-recovery-required") {
      throw new Error(`Authorization state pair ${current.record.state}/${machine.state} is not eligible for failure reconciliation.`);
    }
    const failed = { ...current.record, state: "failed-recovery-required" as const };
    await archiveFailedProjectState(project.root, current.raw, failed);
    return failed;
  });
}
