import { randomUUID } from "node:crypto";
import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import {
  parseDecisionsMarkdown,
  renderDecisionsMarkdown,
  type DecisionRecord,
} from "../project-brain/decisions.js";
import type { ActionableProposalScope } from "./actionable-proposal.js";
import { assertApplyingCanonicalMutationAuthority } from "./canonical-mutation-authority.js";
import { runDoctor } from "./doctor.js";

export interface CanonicalDecisionChangeOptions {
  authorized: boolean;
  beforePromote?: () => void | Promise<void>;
}

export interface SupersedeDecisionInput {
  decisionId: string;
  replacement: string;
  reason?: string;
}

export interface SupersedeDecisionResult {
  superseded: DecisionRecord;
  replacement: DecisionRecord;
}

function newDecisionId(): string {
  return `D-${randomUUID()}`;
}

function normalizedScalar(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  if (/\r|\n/.test(normalized)) throw new Error(`${label} must be a single-line scalar value.`);
  return normalized;
}

async function loadWritableDecisionState(projectPath: string): Promise<{
  store: ProjectBrainStore;
  content: string;
  records: DecisionRecord[];
}> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error("Decision change requires a valid Project Brain.");

  const doctor = await runDoctor(project.root);
  if (doctor.state !== "healthy") {
    throw new Error(`Decision change is blocked until Project Brain diagnosis is resolved: ${doctor.state}.`);
  }

  const content = await store.readDecisionsDocument();
  const parsed = parseDecisionsMarkdown(content);
  if (parsed.issues.length > 0) {
    throw new Error(`Decision history is ambiguous: ${parsed.issues.join("; ")}`);
  }
  return { store, content, records: parsed.records };
}

async function persistDecisionState(
  store: ProjectBrainStore,
  expectedOriginal: string,
  records: DecisionRecord[],
  beforePromote?: () => void | Promise<void>,
): Promise<void> {
  const content = renderDecisionsMarkdown(records);
  const parsed = parseDecisionsMarkdown(content);
  if (parsed.issues.length > 0) throw new Error(`Decision candidate is invalid: ${parsed.issues.join("; ")}`);
  await store.replaceDecisionsDocument(expectedOriginal, content, { beforePromote });

  const verify = parseDecisionsMarkdown(await store.readDecisionsDocument());
  if (verify.issues.length > 0) throw new Error(`Decision verification failed after persistence: ${verify.issues.join("; ")}`);
}

async function requireApplyingAuthority(scope: ActionableProposalScope, projectPath: string): Promise<void> {
  await assertApplyingCanonicalMutationAuthority(scope, discoverProject(projectPath).root);
}

export async function listAcceptedDecisions(projectPath: string = process.cwd()): Promise<DecisionRecord[]> {
  const state = await loadWritableDecisionState(projectPath);
  return state.records.map((record) => ({ ...record }));
}

export async function recordAcceptedDecision(
  decision: string,
  projectPath: string = process.cwd(),
  options: CanonicalDecisionChangeOptions = { authorized: false },
): Promise<DecisionRecord> {
  if (!options.authorized) throw new Error("Recording an accepted decision requires explicit authorization.");
  const normalized = normalizedScalar(decision, "Accepted decision");
  await requireApplyingAuthority({ domain: "project-decision", changeKind: "add", proposedStatement: normalized }, projectPath);

  const state = await loadWritableDecisionState(projectPath);
  if (state.records.some((record) => record.status === "active" && record.text === normalized)) {
    throw new Error("An identical active decision already exists.");
  }

  const record: DecisionRecord = {
    id: newDecisionId(),
    status: "active",
    text: normalized,
    legacy: false,
  };
  await persistDecisionState(state.store, state.content, [...state.records, record], options.beforePromote);
  const persisted = parseDecisionsMarkdown(await state.store.readDecisionsDocument()).records.find((item) => item.id === record.id);
  if (!persisted || persisted.status !== "active" || persisted.text !== record.text) {
    throw new Error("Accepted decision verification failed after persistence.");
  }
  return record;
}

export async function supersedeAcceptedDecision(
  input: SupersedeDecisionInput,
  projectPath: string = process.cwd(),
  options: CanonicalDecisionChangeOptions = { authorized: false },
): Promise<SupersedeDecisionResult> {
  if (!options.authorized) throw new Error("Decision supersession requires explicit authorization.");
  const replacementText = normalizedScalar(input.replacement, "Replacement decision");
  const reason = input.reason === undefined ? undefined : normalizedScalar(input.reason, "Supersession reason");
  await requireApplyingAuthority({
    domain: "project-decision",
    changeKind: "supersede",
    proposedStatement: replacementText,
    targetDecisionId: input.decisionId,
  }, projectPath);

  const state = await loadWritableDecisionState(projectPath);
  const matches = state.records.filter((record) => record.id === input.decisionId);
  if (matches.length !== 1) throw new Error("Decision supersession requires exactly one current decision identity.");
  const target = matches[0];
  if (target.status !== "active") throw new Error("Only an active decision can be superseded.");
  if (state.records.some((record) => record.status === "active" && record.text === replacementText && record.id !== target.id)) {
    throw new Error("Replacement already exists as another active decision.");
  }

  const replacement: DecisionRecord = {
    id: newDecisionId(),
    status: "active",
    text: replacementText,
    legacy: false,
  };
  const superseded: DecisionRecord = {
    id: target.legacy ? newDecisionId() : target.id,
    status: "superseded",
    text: target.text,
    supersededBy: replacement.id,
    reason,
    legacy: false,
  };

  const next = state.records.map((record) => record.id === target.id ? superseded : record);
  next.push(replacement);
  await persistDecisionState(state.store, state.content, next, options.beforePromote);

  const verified = parseDecisionsMarkdown(await state.store.readDecisionsDocument()).records;
  const verifiedSuperseded = verified.find((record) => record.id === superseded.id);
  const verifiedReplacement = verified.find((record) => record.id === replacement.id);
  if (
    !verifiedSuperseded || verifiedSuperseded.status !== "superseded" || verifiedSuperseded.supersededBy !== replacement.id ||
    !verifiedReplacement || verifiedReplacement.status !== "active" || verifiedReplacement.text !== replacement.text
  ) {
    throw new Error("Decision supersession verification failed after persistence.");
  }
  return { superseded, replacement };
}
