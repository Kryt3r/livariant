import { parseDecisionsMarkdown, renderDecisionsMarkdown, type DecisionRecord } from "../project-brain/decisions.js";
import type { ActionableProposal } from "./actionable-proposal.js";
import {
  buildProjectContextBaseline,
  projectContextManagedInputsEqual,
  readProjectContextManagedInputs,
  type ProjectContextBaseline,
  type ProjectContextManagedInputName,
} from "./project-context-material.js";
import {
  renderGoalsCandidate,
  renderKnowledgeCandidate,
} from "./canonical-knowledge-change.js";
import { resolve } from "node:path";

export interface PlannedDecisionIds {
  decisionId?: string;
  replacementDecisionId?: string;
  supersededDecisionId?: string;
}

export interface SemanticMutationPlan {
  expectedPostBaseline: ProjectContextBaseline;
  decisionIds: PlannedDecisionIds;
}

function deterministicDecisionId(proposal: ActionableProposal, role: "add" | "replacement" | "legacy-target"): string {
  const token = proposal.materialDigest.digest;
  if (role === "legacy-target") return `D-legacy-${token.slice(0, 40)}`;
  if (role === "replacement") return `D-replacement-${token.slice(0, 40)}`;
  return `D-${token.slice(0, 48)}`;
}

function cloneInputs(
  inputs: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
): Map<ProjectContextManagedInputName, Buffer> {
  return new Map([...inputs.entries()].map(([name, bytes]) => [name, Buffer.from(bytes)]));
}

function planDecisionMutation(
  proposal: ActionableProposal,
  current: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
): { next: Map<ProjectContextManagedInputName, Buffer>; ids: PlannedDecisionIds } {
  const source = current.get("decisions.md");
  if (!source) throw new Error("Semantic mutation planning is missing decisions.md.");
  const parsed = parseDecisionsMarkdown(source.toString("utf8"));
  if (parsed.issues.length > 0) throw new Error(`Semantic mutation planning found ambiguous decisions: ${parsed.issues.join("; ")}`);

  const scope = proposal.mutationScope;
  const nextRecords: DecisionRecord[] = parsed.records.map((record) => ({ ...record }));
  const next = cloneInputs(current);

  if (scope.changeKind === "add") {
    if (nextRecords.some((record) => record.status === "active" && record.text === scope.proposedStatement)) {
      throw new Error("Semantic mutation planning found an identical active decision.");
    }
    const decisionId = deterministicDecisionId(proposal, "add");
    nextRecords.push({ id: decisionId, status: "active", text: scope.proposedStatement, legacy: false });
    next.set("decisions.md", Buffer.from(renderDecisionsMarkdown(nextRecords), "utf8"));
    return { next, ids: { decisionId } };
  }

  if (!scope.targetDecisionId) throw new Error("Semantic mutation planning requires a supersession target.");
  const matches = nextRecords.filter((record) => record.id === scope.targetDecisionId);
  if (matches.length !== 1 || matches[0].status !== "active") {
    throw new Error("Semantic mutation planning requires exactly one active supersession target.");
  }
  const target = matches[0];
  const replacementDecisionId = deterministicDecisionId(proposal, "replacement");
  const supersededDecisionId = target.legacy ? deterministicDecisionId(proposal, "legacy-target") : target.id;
  const replacement: DecisionRecord = {
    id: replacementDecisionId,
    status: "active",
    text: scope.proposedStatement,
    legacy: false,
  };
  const superseded: DecisionRecord = {
    id: supersededDecisionId,
    status: "superseded",
    text: target.text,
    supersededBy: replacementDecisionId,
    legacy: false,
  };
  const records = nextRecords.map((record) => record.id === target.id ? superseded : record);
  records.push(replacement);
  next.set("decisions.md", Buffer.from(renderDecisionsMarkdown(records), "utf8"));
  return { next, ids: { replacementDecisionId, supersededDecisionId } };
}

export async function buildSemanticMutationPlan(
  proposal: ActionableProposal,
  projectRoot: string,
): Promise<SemanticMutationPlan> {
  const brainPath = resolve(projectRoot, ".project-brain");
  const current = await readProjectContextManagedInputs(brainPath);
  const observed = buildProjectContextBaseline(current, proposal.baseline.schemaVersion);
  if (
    observed.algorithm !== proposal.baseline.algorithm
    || observed.domain !== proposal.baseline.domain
    || observed.schemaVersion !== proposal.baseline.schemaVersion
    || observed.digest !== proposal.baseline.digest
  ) {
    throw new Error("Semantic mutation planning refused stale work because the current trusted Project Brain baseline changed and no longer matches the exact actionable proposal pre-state.");
  }

  let next: Map<ProjectContextManagedInputName, Buffer>;
  let decisionIds: PlannedDecisionIds = {};
  if (proposal.mutationScope.domain === "project-decision") {
    const planned = planDecisionMutation(proposal, current);
    next = planned.next;
    decisionIds = planned.ids;
  } else {
    next = cloneInputs(current);
    if (proposal.mutationScope.domain === "project-goal") {
      const source = current.get("goals.md");
      if (!source) throw new Error("Semantic mutation planning is missing goals.md.");
      next.set("goals.md", Buffer.from(renderGoalsCandidate(source.toString("utf8"), proposal.mutationScope.proposedStatement), "utf8"));
    } else if (proposal.mutationScope.domain === "project-knowledge") {
      const source = current.get("knowledge.md");
      if (!source) throw new Error("Semantic mutation planning is missing knowledge.md.");
      next.set("knowledge.md", Buffer.from(renderKnowledgeCandidate(source.toString("utf8"), proposal.mutationScope.proposedStatement), "utf8"));
    } else {
      throw new Error("Semantic mutation planning does not support this mutation domain.");
    }
  }

  if (projectContextManagedInputsEqual(current, next)) {
    throw new Error("Semantic mutation planning expected a material Project Brain change.");
  }
  return {
    expectedPostBaseline: buildProjectContextBaseline(next, proposal.baseline.schemaVersion),
    decisionIds,
  };
}
