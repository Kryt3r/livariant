import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { assertPathWithinRoot, assertRegularFile } from "../project-brain/path-safety.js";
import {
  parseDecisionsMarkdown,
  renderDecisionsMarkdown,
  type DecisionRecord,
} from "../project-brain/decisions.js";
import { runDoctor } from "./doctor.js";

export interface CanonicalDecisionChangeOptions {
  authorized: boolean;
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
  path: string;
  brainPath: string;
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

  const path = resolve(inspection.path, "decisions.md");
  assertPathWithinRoot(inspection.path, path, "Project Brain decisions path");
  await assertRegularFile(path, "Project Brain decisions");
  const parsed = parseDecisionsMarkdown(await readFile(path, "utf8"));
  if (parsed.issues.length > 0) {
    throw new Error(`Decision history is ambiguous: ${parsed.issues.join("; ")}`);
  }
  return { path, brainPath: inspection.path, records: parsed.records };
}

async function persistDecisionState(path: string, brainPath: string, records: DecisionRecord[]): Promise<void> {
  const tempPath = resolve(brainPath, `.decisions.tmp-${randomUUID()}.md`);
  assertPathWithinRoot(brainPath, tempPath, "Project Brain decision candidate path");
  const content = renderDecisionsMarkdown(records);
  await writeFile(tempPath, content, { encoding: "utf8", flag: "wx" });
  try {
    await assertRegularFile(tempPath, "Project Brain decision candidate");
    const parsed = parseDecisionsMarkdown(await readFile(tempPath, "utf8"));
    if (parsed.issues.length > 0) throw new Error(`Decision candidate is invalid: ${parsed.issues.join("; ")}`);
    await rename(tempPath, path);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
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
  await persistDecisionState(state.path, state.brainPath, [...state.records, record]);
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
  await persistDecisionState(state.path, state.brainPath, next);
  return { superseded, replacement };
}
