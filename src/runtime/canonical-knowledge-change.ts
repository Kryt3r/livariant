import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { assertPathWithinRoot, assertRegularFile } from "../project-brain/path-safety.js";
import { runDoctor } from "./doctor.js";

export interface CanonicalKnowledgeChangeOptions {
  authorized: boolean;
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

async function persistBrainFile(path: string, brainPath: string, filename: string, content: string): Promise<void> {
  const tempPath = resolve(brainPath, `.${filename}.tmp-${randomUUID()}`);
  assertPathWithinRoot(brainPath, tempPath, `Project Brain ${filename} candidate path`);
  await writeFile(tempPath, content, { encoding: "utf8", flag: "wx" });
  try {
    await assertRegularFile(tempPath, `Project Brain ${filename} candidate`);
    await rename(tempPath, path);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

function renderGoals(current: string, goal: string): string {
  const existing = bullets(current);
  if (existing.includes(goal)) throw new Error("An identical confirmed goal already exists.");
  const next = [...existing, goal];
  return `# Goals\n\nConfirmed project goals.\n\n${next.map((item) => `- ${item}`).join("\n")}\n`;
}

function renderKnowledge(current: string, knowledge: string): string {
  const marker = "## Known unknowns";
  const confirmedHeading = "## Confirmed project knowledge";
  const markerIndex = current.indexOf(marker);
  const beforeUnknowns = markerIndex >= 0 ? current.slice(0, markerIndex).trimEnd() : current.trimEnd();
  const unknowns = markerIndex >= 0 ? current.slice(markerIndex).trimStart() : "";

  let prefix = beforeUnknowns;
  let confirmed: string[] = [];
  const headingIndex = beforeUnknowns.indexOf(confirmedHeading);
  if (headingIndex >= 0) {
    const beforeConfirmed = beforeUnknowns.slice(0, headingIndex).trimEnd();
    const confirmedSection = beforeUnknowns.slice(headingIndex + confirmedHeading.length);
    confirmed = bullets(confirmedSection);
    prefix = beforeConfirmed;
  }

  if (confirmed.includes(knowledge)) throw new Error("Identical confirmed project knowledge already exists.");
  confirmed.push(knowledge);

  const sections = [
    prefix,
    `${confirmedHeading}\n\n${confirmed.map((item) => `- ${item}`).join("\n")}`,
    unknowns,
  ].filter((section) => section.length > 0);
  return `${sections.join("\n\n")}\n`;
}

export async function addConfirmedGoal(
  goal: string,
  projectPath: string = process.cwd(),
  options: CanonicalKnowledgeChangeOptions = { authorized: false },
): Promise<CanonicalKnowledgeChangeResult> {
  if (!options.authorized) throw new Error("Recording a confirmed goal requires explicit authorization.");
  const normalized = normalizedScalar(goal, "Confirmed goal");
  const state = await loadWritableBrainFile(projectPath, "goals.md");
  await persistBrainFile(state.path, state.brainPath, "goals", renderGoals(state.content, normalized));

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
  await persistBrainFile(state.path, state.brainPath, "knowledge", renderKnowledge(state.content, normalized));

  const verify = await readFile(state.path, "utf8");
  if (!bullets(verify).includes(normalized)) throw new Error("Confirmed project knowledge verification failed after persistence.");
  return { kind: "knowledge", text: normalized };
}
