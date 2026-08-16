import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { inspectExternalKnowledgeSource, parseExternalKnowledgeSourceKind } from "../external-knowledge/index.js";
import { inspectInitialization } from "../runtime/index.js";
import { buildUnderstandingReview } from "../project/understanding-review.js";
import { escapeTerminalControlText } from "./understand-command.js";

export type FirstRunProvider = "claude-code" | "codex";

interface FirstRunArgs {
  json: boolean;
  language?: string;
  externalSourceType?: string;
  externalSourcePath?: string;
  provider?: FirstRunProvider;
}

interface FirstRunNextAction {
  id: "initialize" | "review-understanding" | "configure-provider" | "continue";
  optional: boolean;
  command?: string;
  purpose: string;
  changesProject: boolean;
  requiresSeparateAuthorization: boolean;
}

export interface FirstRunReport {
  schemaVersion: 1;
  preferredLanguage: string;
  project: {
    root: string;
    shape: string;
    projectState: string;
    projectBrainHealth: string;
    initializationAction: string;
  };
  understanding: ReturnType<typeof buildUnderstandingReview>;
  nextActions: FirstRunNextAction[];
  boundaries: {
    evidenceIsProjectTruth: false;
    externalEvidenceIsProjectTruth: false;
    grantsAuthority: false;
    mutationAuthorized: false;
    runtimeAuthorized: false;
    releaseAuthorized: false;
    changesMade: 0;
  };
}

function parseArgs(args: string[]): FirstRunArgs {
  let json = false;
  let language: string | undefined;
  let externalSourceType: string | undefined;
  let externalSourcePath: string | undefined;
  let provider: FirstRunProvider | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      if (json) throw new Error("First-run accepts --json at most once.");
      json = true;
      continue;
    }
    if (["--language", "--external-source-type", "--external-source", "--provider"].includes(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`First-run ${arg} requires a value.`);
      if (arg === "--language") {
        if (language !== undefined) throw new Error("First-run accepts --language at most once.");
        language = value;
      } else if (arg === "--external-source-type") {
        if (externalSourceType !== undefined) throw new Error("First-run accepts --external-source-type at most once.");
        externalSourceType = value;
      } else if (arg === "--external-source") {
        if (externalSourcePath !== undefined) throw new Error("First-run accepts --external-source at most once.");
        externalSourcePath = value;
      } else {
        if (provider !== undefined) throw new Error("First-run accepts --provider at most once.");
        if (value !== "claude-code" && value !== "codex") throw new Error("First-run provider must be 'claude-code' or 'codex'.");
        provider = value;
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown first-run argument: ${arg}`);
  }

  if ((externalSourceType === undefined) !== (externalSourcePath === undefined)) {
    throw new Error("First-run external evidence requires both --external-source-type and --external-source.");
  }

  return { json, language, externalSourceType, externalSourcePath, provider };
}

function normalizeLanguage(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) throw new Error("Preferred interaction language must not be empty.");
  if (normalized.length > 80) throw new Error("Preferred interaction language is too long.");
  return normalized;
}

async function resolveLanguage(parsed: FirstRunArgs): Promise<string> {
  if (parsed.language !== undefined) return normalizeLanguage(parsed.language);
  if (parsed.json || !process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("First-run requires --language <preferred-language> in non-interactive or --json mode.");
  }
  const prompt = createInterface({ input, output });
  try {
    const answer = await prompt.question("Preferred interaction language: ");
    return normalizeLanguage(answer);
  } finally {
    prompt.close();
  }
}

function buildNextActions(plan: Awaited<ReturnType<typeof inspectInitialization>>, provider?: FirstRunProvider): FirstRunNextAction[] {
  const next: FirstRunNextAction[] = [];
  if (plan.action === "initialize") {
    next.push({
      id: "initialize",
      optional: false,
      command: "livariant init --apply",
      purpose: "Initialize Project Brain only after you explicitly approve the bootstrap plan.",
      changesProject: true,
      requiresSeparateAuthorization: true,
    });
  }
  next.push({
    id: "review-understanding",
    optional: false,
    command: "livariant understand",
    purpose: "Review unknowns and provide corrections or answers before anything becomes Project Truth.",
    changesProject: false,
    requiresSeparateAuthorization: false,
  });
  if (provider) {
    next.push({
      id: "configure-provider",
      optional: true,
      command: `livariant mcp setup --provider ${provider}`,
      purpose: `Render the ${provider} MCP setup guidance. Livariant makes no provider-configuration write; any later registration remains a separate explicit external action.`,
      changesProject: false,
      requiresSeparateAuthorization: false,
    });
  }
  next.push({
    id: "continue",
    optional: false,
    purpose: "Only reviewed candidate material may enter Controlled Starting Understanding Adoption; raw discovery or external evidence cannot be adopted directly.",
    changesProject: false,
    requiresSeparateAuthorization: true,
  });
  return next;
}

export async function buildFirstRunReport(options: {
  language: string;
  externalSourceType?: string;
  externalSourcePath?: string;
  provider?: FirstRunProvider;
}): Promise<FirstRunReport> {
  const preferredLanguage = normalizeLanguage(options.language);
  const plan = await inspectInitialization();
  const externalEvidence = options.externalSourceType && options.externalSourcePath
    ? [await inspectExternalKnowledgeSource(parseExternalKnowledgeSourceKind(options.externalSourceType), options.externalSourcePath)]
    : [];
  const understanding = buildUnderstandingReview(plan.discovery, undefined, externalEvidence);

  return {
    schemaVersion: 1,
    preferredLanguage,
    project: {
      root: plan.discovery.projectRoot,
      shape: plan.discovery.projectShape,
      projectState: plan.projectState,
      projectBrainHealth: plan.projectBrainHealth,
      initializationAction: plan.action,
    },
    understanding,
    nextActions: buildNextActions(plan, options.provider),
    boundaries: {
      evidenceIsProjectTruth: false,
      externalEvidenceIsProjectTruth: false,
      grantsAuthority: false,
      mutationAuthorized: false,
      runtimeAuthorized: false,
      releaseAuthorized: false,
      changesMade: 0,
    },
  };
}

function renderHuman(report: FirstRunReport): void {
  console.log("Livariant first run");
  console.log("");
  console.log(`Preferred interaction language: ${escapeTerminalControlText(report.preferredLanguage)}`);
  console.log(`Project: ${escapeTerminalControlText(report.project.root)}`);
  console.log(`Workspace: ${report.project.shape}`);
  console.log(`Project Brain: ${report.project.projectBrainHealth}`);
  console.log("");

  console.log("What Livariant found:");
  const confirmed = report.understanding.confirmed.length;
  const inferred = report.understanding.stronglyInferred.length;
  const uncertain = report.understanding.uncertain.length;
  console.log(`- confirmed evidence: ${confirmed}`);
  console.log(`- strong inferences: ${inferred}`);
  console.log(`- uncertain evidence: ${uncertain}`);
  console.log(`- questions still open: ${report.understanding.questions.length}`);
  console.log(`- external knowledge sources connected: ${report.understanding.externalEvidence?.length ?? 0}`);
  console.log("");

  console.log("Important safety boundary:");
  console.log("- Discovery and external knowledge are evidence, not Project Truth.");
  console.log("- This first-run does not authorize initialization, adoption, provider configuration, runtime changes, or release.");
  console.log("");

  console.log("Next actions:");
  for (const action of report.nextActions) {
    const optional = action.optional ? "optional" : "next";
    const command = action.command ? ` — ${action.command}` : "";
    console.log(`- [${optional}] ${action.purpose}${command}`);
  }
  console.log("");
  console.log("Changes made: 0");
}

export async function handleFirstRunCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const language = await resolveLanguage(parsed);
  const report = await buildFirstRunReport({
    language,
    externalSourceType: parsed.externalSourceType,
    externalSourcePath: parsed.externalSourcePath,
    provider: parsed.provider,
  });

  if (parsed.json) {
    console.log(JSON.stringify(report));
    return;
  }
  renderHuman(report);
}
