import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { assertPathWithinRoot, assertRegularFile } from "../project-brain/path-safety.js";
import { runDoctor } from "./doctor.js";

export interface CanonicalKnowledgeChangeOptions {
  authorized: boolean;
  beforePromote?: () => void | Promise<void>;
}

export interface CanonicalKnowledgeChangeResult {
  kind: "goal" | "knowledge";
  text: string;
}

function normalizedScalar(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  if (/\r|\n/.test(normalized)) throw new Error(`${label} must be a single-line scalar value.`);
  return normalized;
}

function bullets(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

async function loadWritableBrainFile(projectPath: string, filename: "goals.md" | "knowledge.md"): Promise<{
  path: string;
  brainPath: string;
  content: string;
}> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error("Canonical knowledge change requires a valid Project Brain.");

  const doctor = await runDoctor(project.root);
  if (doctor.state !== "healthy") {
    throw new Error(`Canonical knowledge change is blocked until Project Brain diagnosis is resolved: ${doctor.state}.`);
  }

  const path = resolve(inspection.path, filename);
  assertPathWithinRoot(inspection.path, path, `Project Brain ${filename} path`);
  await assertRegularFile(path, `Project Brain ${filename}`);
  return { path, brainPath: inspection.path, content: await readFile(path, "utf8") };
}

async function persistBrainFile(
  path: string,
  brainPath: string,
  filename: string,
  expectedOriginal: string,
  content: string,
  beforePromote?: () => void | Promise<void>,
): Promise<void> {
  const tempPath = resolve(brainPath, `.${filename}.tmp-${randomUUID()}`);
  assertPathWithinRoot(brainPath, tempPath, `Project Brain ${filename} candidate path`);
  await writeFile(tempPath, content, { encoding: "utf8", flag: "wx" });
  try {
    await assertRegularFile(tempPath, `Project Brain ${filename} candidate`);
    await beforePromote?.();
    await assertRegularFile(path, `Project Brain ${filename}`);
    const current = await readFile(path, "utf8");
    if (current !== expectedOriginal) {
      throw new Error(`Project Brain ${filename} changed concurrently; refusing to overwrite newer project-owned state.`);
    }
    await rename(tempPath, path);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

function renderGoals(current: string, goal: string): string {
  if (bullets(current).includes(goal)) throw new Error("An identical confirmed goal already exists.");

  const placeholder = "No confirmed project goals have been recorded yet.";
  if (current.includes(placeholder)) {
    return current.replace(placeholder, `Confirmed project goals.\n\n- ${goal}`);
  }

  const firstSubheading = current.search(/\n##\s/);
  if (firstSubheading < 0) return `${current.trimEnd()}\n\n- ${goal}\n`;

  const before = current.slice(0, firstSubheading).trimEnd();
  const after = current.slice(firstSubheading).trimStart();
  return `${before}\n\n- ${goal}\n\n${after}`;
}

function renderKnowledge(current: string, knowledge: string): string {
  if (bullets(current).includes(knowledge)) throw new Error("Identical confirmed project knowledge already exists.");

  const unknownHeading = "## Known unknowns";
  const confirmedHeading = "## Confirmed project knowledge";
  const confirmedIndex = current.indexOf(confirmedHeading);

  if (confirmedIndex < 0) {
    const unknownIndex = current.indexOf(unknownHeading);
    const section = `${confirmedHeading}\n\n- ${knowledge}\n\n`;
    if (unknownIndex < 0) return `${current.trimEnd()}\n\n${section.trimEnd()}\n`;
    return `${current.slice(0, unknownIndex).trimEnd()}\n\n${section}${current.slice(unknownIndex)}`;
  }

  const afterHeading = confirmedIndex + confirmedHeading.length;
  const nextHeadingOffset = current.slice(afterHeading).search(/\n##\s/);
  const insertionIndex = nextHeadingOffset < 0 ? current.length : afterHeading + nextHeadingOffset;
  const before = current.slice(0, insertionIndex).trimEnd();
  const after = current.slice(insertionIndex).trimStart();
  return after.length > 0
    ? `${before}\n- ${knowledge}\n\n${after}`
    : `${before}\n- ${knowledge}\n`;
}

export async function addConfirmedGoal(
  goal: string,
  projectPath: string = process.cwd(),
  options: CanonicalKnowledgeChangeOptions = { authorized: false },
): Promise<CanonicalKnowledgeChangeResult> {
  if (!options.authorized) throw new Error("Recording a confirmed goal requires explicit authorization.");
  const normalized = normalizedScalar(goal, "Confirmed goal");
  const state = await loadWritableBrainFile(projectPath, "goals.md");
  const candidate = renderGoals(state.content, normalized);
  await persistBrainFile(state.path, state.brainPath, "goals", state.content, candidate, options.beforePromote);

  const verify = await readFile(state.path, "utf8");
  if (!bullets(verify).includes(normalized)) throw new Error("Confirmed goal verification failed after persistence.");
  return { kind: "goal", text: normalized };
}

export async function addConfirmedKnowledge(
  knowledge: string,
  projectPath: string = process.cwd(),
  options: CanonicalKnowledgeChangeOptions = { authorized: false },
): Promise<CanonicalKnowledgeChangeResult> {
  if (!options.authorized) throw new Error("Recording confirmed project knowledge requires explicit authorization.");
  const normalized = normalizedScalar(knowledge, "Confirmed project knowledge");
  const state = await loadWritableBrainFile(projectPath, "knowledge.md");
  const candidate = renderKnowledge(state.content, normalized);
  await persistBrainFile(state.path, state.brainPath, "knowledge", state.content, candidate, options.beforePromote);

  const verify = await readFile(state.path, "utf8");
  if (!bullets(verify).includes(normalized)) throw new Error("Confirmed project knowledge verification failed after persistence.");
  return { kind: "knowledge", text: normalized };
}
