import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { parseDecisionsMarkdown } from "../project-brain/decisions.js";
import { runDoctor } from "./doctor.js";

export interface ResumeContext {
  projectRoot: string;
  projectIdentity: string[];
  confirmedGoals: string[];
  activeDecisions: string[];
  knownFacts: string[];
  unresolvedUnknowns: string[];
  lifecycle: "initialized";
  evidenceSummary: string[];
}

function bullets(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

function beforeFirstSubheading(markdown: string): string {
  const index = markdown.search(/\n##\s/);
  return index < 0 ? markdown : markdown.slice(0, index);
}

export async function buildResumeContext(projectPath: string = process.cwd()): Promise<ResumeContext> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") {
    throw new Error("Resume requires a valid Project Brain.");
  }

  const doctor = await runDoctor(project.root);
  if (doctor.state !== "healthy") {
    const reason = doctor.findings.map((finding) => finding.message).join("; ");
    throw new Error(`Resume blocked by freshness/diagnostic state '${doctor.state}': ${reason}`);
  }

  const brainPath = inspection.path;
  const [projectDoc, goals, decisions, knowledge] = await Promise.all([
    readFile(resolve(brainPath, "project.md"), "utf8"),
    readFile(resolve(brainPath, "goals.md"), "utf8"),
    readFile(resolve(brainPath, "decisions.md"), "utf8"),
    readFile(resolve(brainPath, "knowledge.md"), "utf8"),
  ]);

  const parsedDecisions = parseDecisionsMarkdown(decisions);
  if (parsedDecisions.issues.length > 0) {
    throw new Error(`Resume blocked by ambiguous decision history: ${parsedDecisions.issues.join("; ")}`);
  }

  const marker = "## Known unknowns";
  const markerIndex = knowledge.indexOf(marker);
  const evidencePart = markerIndex >= 0 ? knowledge.slice(0, markerIndex) : knowledge;
  const unknownPart = markerIndex >= 0 ? knowledge.slice(markerIndex) : "";

  return {
    projectRoot: project.root,
    projectIdentity: bullets(projectDoc),
    confirmedGoals: bullets(beforeFirstSubheading(goals)),
    activeDecisions: parsedDecisions.records.filter((record) => record.status === "active").map((record) => record.text),
    knownFacts: bullets(evidencePart),
    unresolvedUnknowns: bullets(unknownPart),
    lifecycle: "initialized",
    evidenceSummary: bullets(evidencePart),
  };
}
