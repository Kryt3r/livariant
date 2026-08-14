import { resolve } from "node:path";
import { discoverProject } from "../project/discovery.js";
import {
  buildActionableProposal,
  parseActionableProposal,
  type ActionableProposal,
} from "./actionable-proposal.js";
import {
  assertAuthorizationReadyForApply,
  beginAuthorizationApplication,
  completeAuthorizationApplication,
  failAuthorizationApplication,
} from "./authorization.js";
import {
  reconcileFailedAuthorizationApplication,
  reconcilePreMutationAuthorization,
} from "./semantic-apply-reconciliation.js";
import { recordAcceptedDecision, supersedeAcceptedDecision } from "./canonical-change.js";
import { addConfirmedGoal, addConfirmedKnowledge } from "./canonical-knowledge-change.js";
import {
  PROJECT_CONTEXT_MANAGED_INPUTS,
  buildProjectContextBaseline,
  projectContextManagedInputsEqual,
  readProjectContextManagedInputs,
  type ProjectContextManagedInputName,
} from "./project-context-material.js";
import { readProjectBrainSemanticRegions } from "./project-brain-semantics.js";

export interface SemanticApplyOptions {
  beforeConsume?: () => void | Promise<void>;
  afterConsume?: () => void | Promise<void>;
  beforePromote?: () => void | Promise<void>;
  afterPromoteBeforeVerify?: () => void | Promise<void>;
  beforeComplete?: () => void | Promise<void>;
}

export interface SemanticApplyResult {
  state: "completed";
  authorizationId: string;
  stableProjectIdentity: string;
  actionableProposalId: string;
  mutationScope: ActionableProposal["mutationScope"];
  mutationAuthorizationConsumed: true;
  semanticChangesMade: 1;
}

type ManagedInputs = Map<ProjectContextManagedInputName, Buffer>;

function sameProposalMaterial(left: ActionableProposal, right: ActionableProposal): boolean {
  return left.actionableProposalId === right.actionableProposalId
    && left.materialDigest.digest === right.materialDigest.digest
    && left.stableProjectIdentity === right.stableProjectIdentity
    && left.baseline.algorithm === right.baseline.algorithm
    && left.baseline.domain === right.baseline.domain
    && left.baseline.digest === right.baseline.digest
    && left.baseline.schemaVersion === right.baseline.schemaVersion
    && left.mutationScope.domain === right.mutationScope.domain
    && left.mutationScope.changeKind === right.mutationScope.changeKind
    && left.mutationScope.proposedStatement === right.mutationScope.proposedStatement
    && left.mutationScope.targetDecisionId === right.mutationScope.targetDecisionId;
}

function sameBaseline(left: ActionableProposal["baseline"], right: ActionableProposal["baseline"]): boolean {
  return left.algorithm === right.algorithm
    && left.domain === right.domain
    && left.digest === right.digest
    && left.schemaVersion === right.schemaVersion;
}

async function assertProposalStillCurrent(proposal: ActionableProposal, projectRoot: string): Promise<void> {
  const rebuilt = await buildActionableProposal(proposal.candidate, projectRoot);
  if (rebuilt.state !== "actionable-proposal" || !sameProposalMaterial(proposal, rebuilt.proposal)) {
    throw new Error("Canonical Project Brain state changed after authorization; refusing stale semantic mutation.");
  }
}

async function captureCoherentManagedState(projectRoot: string): Promise<ManagedInputs> {
  const brainPath = resolve(projectRoot, ".project-brain");
  const first = await readProjectContextManagedInputs(brainPath);
  const second = await readProjectContextManagedInputs(brainPath);
  if (!projectContextManagedInputsEqual(first, second)) {
    throw new Error("Project Brain changed while Semantic Apply was capturing managed state; refusing a mixed-time verification snapshot.");
  }
  return second;
}

async function captureAuthorizedPreState(proposal: ActionableProposal, projectRoot: string): Promise<ManagedInputs> {
  const captured = await captureCoherentManagedState(projectRoot);
  const baseline = buildProjectContextBaseline(captured, proposal.baseline.schemaVersion);
  if (!sameBaseline(baseline, proposal.baseline)) {
    throw new Error("Managed Project Brain state no longer matches the exact authorized pre-mutation baseline.");
  }
  return captured;
}

function authorizedTargetFile(proposal: ActionableProposal): ProjectContextManagedInputName {
  if (proposal.mutationScope.domain === "project-decision") return "decisions.md";
  if (proposal.mutationScope.domain === "project-goal") return "goals.md";
  if (proposal.mutationScope.domain === "project-knowledge") return "knowledge.md";
  throw new Error("Semantic apply mutation scope has no supported managed target file.");
}

function assertExactManagedDelta(
  proposal: ActionableProposal,
  before: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
  after: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
): void {
  const target = authorizedTargetFile(proposal);
  for (const name of PROJECT_CONTEXT_MANAGED_INPUTS) {
    const beforeBytes = before.get(name);
    const afterBytes = after.get(name);
    if (!beforeBytes || !afterBytes) throw new Error(`Semantic Apply exact-delta verification is missing managed input ${name}.`);
    if (name === target) {
      if (beforeBytes.equals(afterBytes)) {
        throw new Error(`Semantic Apply expected the authorized target ${target} to change, but its bytes are unchanged.`);
      }
      continue;
    }
    if (!beforeBytes.equals(afterBytes)) {
      throw new Error(`Semantic Apply detected an unrelated managed Project Brain change in ${name}; refusing terminal success.`);
    }
  }
}

function assertSemanticPostconditionFromInputs(
  proposal: ActionableProposal,
  inputs: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
): void {
  const regions = readProjectBrainSemanticRegions(inputs);
  if (regions.decisionIssues.length > 0) {
    throw new Error(`Semantic apply verification found ambiguous decision history: ${regions.decisionIssues.join("; ")}`);
  }

  const scope = proposal.mutationScope;
  if (scope.domain === "project-decision" && scope.changeKind === "add") {
    const matches = regions.decisionRecords.filter((record) =>
      record.status === "active" && !record.legacy && record.text === scope.proposedStatement,
    );
    if (matches.length !== 1) throw new Error("Semantic apply verification could not prove exactly one active authorized decision result.");
    return;
  }

  if (scope.domain === "project-decision" && scope.changeKind === "supersede") {
    if (!scope.targetDecisionId) throw new Error("Semantic apply supersession verification is missing the authorized target decision id.");
    const target = regions.decisionRecords.find((record) => record.id === scope.targetDecisionId);
    if (!target || target.status !== "superseded" || !target.supersededBy) {
      throw new Error("Semantic apply verification could not prove the authorized decision target was superseded.");
    }
    const replacement = regions.decisionRecords.find((record) => record.id === target.supersededBy);
    if (!replacement || replacement.status !== "active" || replacement.legacy || replacement.text !== scope.proposedStatement) {
      throw new Error("Semantic apply verification could not prove the exact authorized replacement decision is active.");
    }
    return;
  }

  if (scope.domain === "project-goal" && scope.changeKind === "add") {
    if (regions.confirmedGoals.filter((goal) => goal === scope.proposedStatement).length !== 1) {
      throw new Error("Semantic apply verification could not prove exactly one confirmed authorized goal result.");
    }
    return;
  }

  if (scope.domain === "project-knowledge" && scope.changeKind === "add") {
    if (regions.knownFacts.filter((fact) => fact === scope.proposedStatement).length !== 1) {
      throw new Error("Semantic apply verification could not prove exactly one confirmed authorized knowledge result.");
    }
    return;
  }

  throw new Error("Semantic apply mutation scope is unsupported.");
}

export async function verifySemanticApplyPostcondition(
  proposalInput: ActionableProposal,
  projectPath: string = process.cwd(),
): Promise<void> {
  const proposal = parseActionableProposal(proposalInput);
  const project = discoverProject(projectPath);
  const captured = await captureCoherentManagedState(project.root);
  assertSemanticPostconditionFromInputs(proposal, captured);
}

async function executeAuthorizedMutation(
  proposal: ActionableProposal,
  projectRoot: string,
  options: SemanticApplyOptions,
): Promise<void> {
  const beforePromote = async () => {
    await options.beforePromote?.();
    await assertProposalStillCurrent(proposal, projectRoot);
  };
  const scope = proposal.mutationScope;

  if (scope.domain === "project-decision" && scope.changeKind === "add") {
    await recordAcceptedDecision(scope.proposedStatement, projectRoot, { authorized: true, beforePromote });
    return;
  }
  if (scope.domain === "project-decision" && scope.changeKind === "supersede") {
    if (!scope.targetDecisionId) throw new Error("Authorized decision supersession is missing a target id.");
    await supersedeAcceptedDecision({
      decisionId: scope.targetDecisionId,
      replacement: scope.proposedStatement,
    }, projectRoot, { authorized: true, beforePromote });
    return;
  }
  if (scope.domain === "project-goal" && scope.changeKind === "add") {
    await addConfirmedGoal(scope.proposedStatement, projectRoot, { authorized: true, beforePromote });
    return;
  }
  if (scope.domain === "project-knowledge" && scope.changeKind === "add") {
    await addConfirmedKnowledge(scope.proposedStatement, projectRoot, { authorized: true, beforePromote });
    return;
  }
  throw new Error("Authorized semantic mutation scope is unsupported.");
}

async function tryAlignExistingFailure(
  authorizationId: string,
  proposal: ActionableProposal,
  projectRoot: string,
): Promise<boolean> {
  try {
    await reconcileFailedAuthorizationApplication(authorizationId, proposal, projectRoot);
    return true;
  } catch {
    return false;
  }
}

async function enterApplyingState(
  authorizationId: string,
  proposal: ActionableProposal,
  projectRoot: string,
  options: SemanticApplyOptions,
): Promise<void> {
  let readyError: unknown;
  try {
    await assertAuthorizationReadyForApply(authorizationId, proposal, projectRoot);
  } catch (error) {
    readyError = error;
  }

  if (readyError !== undefined) {
    try {
      await assertProposalStillCurrent(proposal, projectRoot);
      await reconcilePreMutationAuthorization(authorizationId, proposal, projectRoot);
      return;
    } catch (reconcileError) {
      if (await tryAlignExistingFailure(authorizationId, proposal, projectRoot)) {
        throw new Error("Semantic apply Authority is already failed-recovery-required; project evidence was aligned forward and cannot be reused.");
      }
      const ready = readyError instanceof Error ? readyError.message : "fresh Authority verification failed";
      const reconcile = reconcileError instanceof Error ? reconcileError.message : "pre-mutation reconciliation failed";
      throw new Error(`Semantic apply is not safely consumable: ${ready}; reconciliation refused: ${reconcile}`);
    }
  }

  await options.beforeConsume?.();
  try {
    await beginAuthorizationApplication(authorizationId, proposal, projectRoot);
  } catch (beginError) {
    try {
      await assertProposalStillCurrent(proposal, projectRoot);
      await reconcilePreMutationAuthorization(authorizationId, proposal, projectRoot);
      return;
    } catch (reconcileError) {
      if (await tryAlignExistingFailure(authorizationId, proposal, projectRoot)) {
        throw new Error("Authority consumption previously failed and is recovery-required; project evidence was aligned forward.");
      }
      const begin = beginError instanceof Error ? beginError.message : "Authority consumption failed";
      const reconcile = reconcileError instanceof Error ? reconcileError.message : "pre-mutation reconciliation failed";
      throw new Error(`Authority consumption did not complete safely and requires recovery: ${begin}; reconciliation refused: ${reconcile}`);
    }
  }
}

async function terminalizeFailure(
  authorizationId: string,
  proposal: ActionableProposal,
  projectRoot: string,
): Promise<void> {
  try {
    await failAuthorizationApplication(authorizationId, projectRoot);
    return;
  } catch (terminalError) {
    try {
      await reconcileFailedAuthorizationApplication(authorizationId, proposal, projectRoot);
      return;
    } catch (reconcileError) {
      const terminal = terminalError instanceof Error ? terminalError.message : "authorization failure transition failed";
      const reconcile = reconcileError instanceof Error ? reconcileError.message : "failure reconciliation failed";
      throw new Error(`Authorization could not be terminalized safely: ${terminal}; reconciliation refused: ${reconcile}`);
    }
  }
}

export async function applyActionableProposal(
  authorizationId: string,
  proposalInput: ActionableProposal,
  projectPath: string = process.cwd(),
  options: SemanticApplyOptions = {},
): Promise<SemanticApplyResult> {
  const proposal = parseActionableProposal(proposalInput);
  const project = discoverProject(projectPath);
  let consumed = false;

  try {
    await enterApplyingState(authorizationId, proposal, project.root, options);
    consumed = true;
    await options.afterConsume?.();
    await assertProposalStillCurrent(proposal, project.root);
    const authorizedPreState = await captureAuthorizedPreState(proposal, project.root);

    await executeAuthorizedMutation(proposal, project.root, options);

    const writerPostState = await captureCoherentManagedState(project.root);
    assertExactManagedDelta(proposal, authorizedPreState, writerPostState);

    await options.afterPromoteBeforeVerify?.();
    const verifiedPostState = await captureCoherentManagedState(project.root);
    if (!projectContextManagedInputsEqual(writerPostState, verifiedPostState)) {
      throw new Error("Managed Project Brain state changed after the authorized writer returned and before Semantic Apply verification.");
    }
    assertSemanticPostconditionFromInputs(proposal, verifiedPostState);

    await options.beforeComplete?.();
    const beforeCompletion = await captureCoherentManagedState(project.root);
    if (!projectContextManagedInputsEqual(verifiedPostState, beforeCompletion)) {
      throw new Error("Managed Project Brain state changed after Semantic Apply verification and before Authority completion.");
    }

    await completeAuthorizationApplication(authorizationId, project.root);
    return {
      state: "completed",
      authorizationId,
      stableProjectIdentity: proposal.stableProjectIdentity,
      actionableProposalId: proposal.actionableProposalId,
      mutationScope: proposal.mutationScope,
      mutationAuthorizationConsumed: true,
      semanticChangesMade: 1,
    };
  } catch (error) {
    if (!consumed) throw error;
    try {
      await terminalizeFailure(authorizationId, proposal, project.root);
    } catch (terminalError) {
      const original = error instanceof Error ? error.message : "semantic mutation failed";
      const terminal = terminalError instanceof Error ? terminalError.message : "authorization terminalization failed";
      throw new Error(`Semantic apply failed after Authority consumption and requires recovery: ${original}; ${terminal}`);
    }
    throw new Error(`Semantic apply failed after Authority consumption and is recovery-required: ${error instanceof Error ? error.message : "semantic mutation failed"}`);
  }
}
