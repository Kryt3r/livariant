import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  autonomyPolicy,
  DEFAULT_AUTONOMY_PROFILE,
  isAutonomyProfile,
  readAutonomyProfile,
  type AutonomyProfile,
} from "../autonomy/profile.js";
import { inspectExternalKnowledgeSource, parseExternalKnowledgeSourceKind } from "../external-knowledge/index.js";
import { inspectInitialization } from "../runtime/index.js";
import { buildUnderstandingReview } from "../project/understanding-review.js";
import { escapeTerminalControlText } from "./understand-command.js";

export type FirstRunProvider = "claude-code" | "codex";

interface FirstRunArgs {
  json: boolean;
  language?: string;
  autonomyProfile?: AutonomyProfile;
  acknowledgeAutonomyRisk: boolean;
  externalSourceType?: string;
  externalSourcePath?: string;
  provider?: FirstRunProvider;
}

interface FirstRunNextAction {
  id: "initialize" | "persist-autonomy" | "review-understanding" | "configure-provider" | "continue";
  optional: boolean;
  command?: string;
  purpose: string;
  changesProject: boolean;
  changesMachineLocalState?: boolean;
  requiresSeparateAuthorization: boolean;
}

export interface FirstRunReport {
  schemaVersion: 1;
  preferredLanguage: string;
  autonomy: {
    selectedProfile: AutonomyProfile;
    policy: ReturnType<typeof autonomyPolicy>;
    selectedForFirstRun: true;
    persistedByFirstRun: false;
    persistenceRequiresExplicitAction: true;
  };
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
    autonomyProfileIsAuthority: false;
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
  let autonomyProfile: AutonomyProfile | undefined;
  let acknowledgeAutonomyRisk = false;
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
    if (arg === "--acknowledge-autonomy-risk") {
      if (acknowledgeAutonomyRisk) throw new Error("First-run accepts --acknowledge-autonomy-risk at most once.");
      acknowledgeAutonomyRisk = true;
      continue;
    }
    if (["--language", "--autonomy-profile", "--external-source-type", "--external-source", "--provider"].includes(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`First-run ${arg} requires a value.`);
      if (arg === "--language") {
        if (language !== undefined) throw new Error("First-run accepts --language at most once.");
        language = value;
      } else if (arg === "--autonomy-profile") {
        if (autonomyProfile !== undefined) throw new Error("First-run accepts --autonomy-profile at most once.");
        if (!isAutonomyProfile(value)) throw new Error("First-run autonomy profile must be 'ask-always', 'ask-important', or 'continue-without-confirmation'.");
        autonomyProfile = value;
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
  if (autonomyProfile === "continue-without-confirmation" && !acknowledgeAutonomyRisk && (json || !process.stdin.isTTY || !process.stdout.isTTY)) {
    throw new Error("First-run continue-without-confirmation requires --acknowledge-autonomy-risk in non-interactive or --json mode.");
  }
  if (autonomyProfile !== "continue-without-confirmation" && acknowledgeAutonomyRisk) {
    throw new Error("--acknowledge-autonomy-risk is only valid with continue-without-confirmation.");
  }

  return { json, language, autonomyProfile, acknowledgeAutonomyRisk, externalSourceType, externalSourcePath, provider };
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

async function resolveAutonomyProfile(parsed: FirstRunArgs): Promise<AutonomyProfile> {
  if (parsed.autonomyProfile) {
    if (parsed.autonomyProfile !== "continue-without-confirmation" || parsed.acknowledgeAutonomyRisk) return parsed.autonomyProfile;
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("High-autonomy profile acknowledgement requires an interactive terminal or --acknowledge-autonomy-risk.");
    const prompt = createInterface({ input, output });
    try {
      console.log("Warning: Continue without confirmation lets the agent make consequential workflow choices without asking you first when no hard Livariant authority is required.");
      console.log("Mutation, Runtime and Release Authority boundaries still remain mandatory.");
      const answer = await prompt.question("Type CONTINUE to use this profile for First-Run: ");
      if (answer !== "CONTINUE") throw new Error("High-autonomy profile acknowledgement did not match.");
      return parsed.autonomyProfile;
    } finally {
      prompt.close();
    }
  }

  const current = await readAutonomyProfile(process.cwd());
  if (current.source === "fail-closed") return current.profile;
  if (current.persisted) return current.profile;
  if (parsed.json || !process.stdin.isTTY || !process.stdout.isTTY) return DEFAULT_AUTONOMY_PROFILE;

  const prompt = createInterface({ input, output });
  try {
    console.log("Choose how often Livariant should stop and ask:");
    console.log("1) Always ask — maximum control");
    console.log("2) Ask on important decisions — recommended balance");
    console.log("3) Continue without confirmation — higher autonomy, higher risk");
    const answer = (await prompt.question("Autonomy mode [2]: ")).trim();
    if (answer === "" || answer === "2") return "ask-important";
    if (answer === "1") return "ask-always";
    if (answer === "3") {
      console.log("Warning: this mode lets the agent make consequential workflow choices without asking you first when no hard Livariant authority is required.");
      console.log("Mutation, Runtime and Release Authority boundaries still remain mandatory.");
      const acknowledgement = await prompt.question("Type CONTINUE to accept this risk: ");
      if (acknowledgement !== "CONTINUE") throw new Error("High-autonomy profile acknowledgement did not match.");
      return "continue-without-confirmation";
    }
    throw new Error("Autonomy mode must be 1, 2, or 3.");
  } finally {
    prompt.close();
  }
}

function buildNextActions(
  plan: Awaited<ReturnType<typeof inspectInitialization>>,
  autonomyProfile: AutonomyProfile,
  provider?: FirstRunProvider,
  externalSourceType?: string,
): FirstRunNextAction[] {
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

  const persistenceCommand = autonomyProfile === "continue-without-confirmation"
    ? `livariant autonomy set --profile ${autonomyProfile} --acknowledge-risk`
    : `livariant autonomy set --profile ${autonomyProfile}`;
  next.push({
    id: "persist-autonomy",
    optional: false,
    command: persistenceCommand,
    purpose: plan.projectBrainHealth === "valid"
      ? "Persist this autonomy preference machine-locally for this stable project identity. This does not grant Authority."
      : "After Project Brain initialization establishes a stable project identity, persist this autonomy preference machine-locally. This does not grant Authority.",
    changesProject: false,
    changesMachineLocalState: true,
    requiresSeparateAuthorization: false,
  });

  next.push({
    id: "review-understanding",
    optional: false,
    command: externalSourceType
      ? `livariant understand --external-source-type ${externalSourceType} --external-source <same-source-path>`
      : "livariant understand",
    purpose: externalSourceType
      ? "Continue the understanding review with the same external knowledge source. Replace <same-source-path> with the source path you selected for First-Run."
      : "Review unknowns and provide corrections or answers before anything becomes Project Truth.",
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
  autonomyProfile?: AutonomyProfile;
  externalSourceType?: string;
  externalSourcePath?: string;
  provider?: FirstRunProvider;
}): Promise<FirstRunReport> {
  const preferredLanguage = normalizeLanguage(options.language);
  const selectedAutonomyProfile = options.autonomyProfile ?? DEFAULT_AUTONOMY_PROFILE;
  const plan = await inspectInitialization();
  const externalEvidence = options.externalSourceType && options.externalSourcePath
    ? [await inspectExternalKnowledgeSource(parseExternalKnowledgeSourceKind(options.externalSourceType), options.externalSourcePath)]
    : [];
  const understanding = buildUnderstandingReview(plan.discovery, undefined, externalEvidence);

  return {
    schemaVersion: 1,
    preferredLanguage,
    autonomy: {
      selectedProfile: selectedAutonomyProfile,
      policy: autonomyPolicy(selectedAutonomyProfile),
      selectedForFirstRun: true,
      persistedByFirstRun: false,
      persistenceRequiresExplicitAction: true,
    },
    project: {
      root: plan.discovery.projectRoot,
      shape: plan.discovery.projectShape,
      projectState: plan.projectState,
      projectBrainHealth: plan.projectBrainHealth,
      initializationAction: plan.action,
    },
    understanding,
    nextActions: buildNextActions(plan, selectedAutonomyProfile, options.provider, options.externalSourceType),
    boundaries: {
      evidenceIsProjectTruth: false,
      externalEvidenceIsProjectTruth: false,
      autonomyProfileIsAuthority: false,
      grantsAuthority: false,
      mutationAuthorized: false,
      runtimeAuthorized: false,
      releaseAuthorized: false,
      changesMade: 0,
    },
  };
}

function renderEvidencePreview(
  items: Array<{ value: string; provenance: string }>,
  emptyText: string,
  maxItems = 3,
): void {
  if (items.length === 0) {
    console.log(`- ${emptyText}`);
    return;
  }
  for (const item of items.slice(0, maxItems)) {
    console.log(`- ${escapeTerminalControlText(item.value)} (${escapeTerminalControlText(item.provenance)})`);
  }
  if (items.length > maxItems) console.log(`- ...and ${items.length - maxItems} more`);
}

function renderHuman(report: FirstRunReport): void {
  console.log("Livariant first run");
  console.log("");
  console.log(`Preferred interaction language: ${escapeTerminalControlText(report.preferredLanguage)}`);
  console.log(`Autonomy: ${report.autonomy.policy.label}`);
  console.log(`Autonomy behavior: ${report.autonomy.policy.summary}`);
  if (report.autonomy.policy.warning) console.log(`Autonomy warning: ${report.autonomy.policy.warning}`);
  console.log("Autonomy grants Authority: no");
  console.log(`Project: ${escapeTerminalControlText(report.project.root)}`);
  console.log(`Workspace: ${report.project.shape}`);
  console.log(`Project Brain: ${report.project.projectBrainHealth}`);
  console.log("");

  console.log("What Livariant found:");
  renderEvidencePreview(report.understanding.confirmed, "no confirmed project evidence yet");
  renderEvidencePreview(report.understanding.stronglyInferred, "no strong inferences", 2);
  console.log("");

  console.log("Still needs your review:");
  if (report.understanding.attention.length === 0 && report.understanding.questions.length === 0) {
    console.log("- nothing currently flagged");
  } else {
    for (const item of report.understanding.attention.slice(0, 2)) {
      console.log(`- ${escapeTerminalControlText(item.message)}`);
    }
    for (const question of report.understanding.questions.slice(0, 3)) {
      console.log(`- ${escapeTerminalControlText(question.prompt)}`);
    }
    const hidden = Math.max(0, report.understanding.attention.length - 2) + Math.max(0, report.understanding.questions.length - 3);
    if (hidden > 0) console.log(`- ...and ${hidden} more item(s)`);
  }
  console.log(`- external knowledge sources connected: ${report.understanding.externalEvidence?.length ?? 0}`);
  console.log("");

  console.log("Important safety boundary:");
  console.log("- Discovery and external knowledge are evidence, not Project Truth.");
  console.log("- Autonomy preference changes how often an agent should ask; it is not mutation, Runtime, or Release Authority.");
  console.log("- This first-run does not persist autonomy, authorize initialization/adoption, configure providers, change runtime trust, or authorize release.");
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
  const autonomyProfile = await resolveAutonomyProfile(parsed);
  const report = await buildFirstRunReport({
    language,
    autonomyProfile,
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
