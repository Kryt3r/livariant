import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
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

async function loadWritableStore(projectPath: string): Promise<ProjectBrainStore> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error("Canonical knowledge change requires a valid Project Brain.");

  const doctor = await runDoctor(project.root);
  if (doctor.state !== "healthy") {
    throw new Error(`Canonical knowledge change is blocked until Project Brain diagnosis is resolved: ${doctor.state}.`);
  }
  return store;
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
  const store = await loadWritableStore(projectPath);
  const current = await store.readGoalsDocument();
  const candidate = renderGoals(current, normalized);
  await store.replaceGoalsDocument(current, candidate, { beforePromote: options.beforePromote });

  const verify = await store.readGoalsDocument();
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
  const store = await loadWritableStore(projectPath);
  const current = await store.readKnowledgeDocument();
  const candidate = renderKnowledge(current, normalized);
  await store.replaceKnowledgeDocument(current, candidate, { beforePromote: options.beforePromote });

  const verify = await store.readKnowledgeDocument();
  if (!bullets(verify).includes(normalized)) throw new Error("Confirmed project knowledge verification failed after persistence.");
  return { kind: "knowledge", text: normalized };
}
