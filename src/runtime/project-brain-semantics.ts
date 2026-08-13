import { parseDecisionsMarkdown, type DecisionRecord } from "../project-brain/decisions.js";
import type { ProjectContextManagedInputName } from "./project-context-material.js";

export interface ProjectBrainSemanticRegions {
  projectIdentity: string[];
  confirmedGoals: string[];
  nonCanonicalGoalBullets: string[];
  decisionRecords: DecisionRecord[];
  decisionIssues: string[];
  knownFacts: string[];
  unresolvedUnknowns: string[];
}

function bullets(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

function splitAtFirstSubheading(markdown: string): { before: string; after: string } {
  const index = markdown.search(/\n##\s/);
  return index < 0
    ? { before: markdown, after: "" }
    : { before: markdown.slice(0, index), after: markdown.slice(index) };
}

function splitKnowledge(markdown: string): { confirmed: string; unresolved: string } {
  const marker = "## Known unknowns";
  const index = markdown.indexOf(marker);
  return index < 0
    ? { confirmed: markdown, unresolved: "" }
    : { confirmed: markdown.slice(0, index), unresolved: markdown.slice(index) };
}

export function readProjectBrainSemanticRegions(
  inputs: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
): ProjectBrainSemanticRegions {
  const projectDoc = inputs.get("project.md")!.toString("utf8");
  const goalsDoc = inputs.get("goals.md")!.toString("utf8");
  const decisionsDoc = inputs.get("decisions.md")!.toString("utf8");
  const knowledgeDoc = inputs.get("knowledge.md")!.toString("utf8");

  const goals = splitAtFirstSubheading(goalsDoc);
  const knowledge = splitKnowledge(knowledgeDoc);
  const decisions = parseDecisionsMarkdown(decisionsDoc);

  return {
    projectIdentity: bullets(projectDoc),
    confirmedGoals: bullets(goals.before),
    nonCanonicalGoalBullets: bullets(goals.after),
    decisionRecords: decisions.records,
    decisionIssues: decisions.issues,
    knownFacts: bullets(knowledge.confirmed),
    unresolvedUnknowns: bullets(knowledge.unresolved),
  };
}
