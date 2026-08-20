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
import { inspectGuardianMachineReadiness, type GuardianMachineReadiness } from "../guardian/readiness.js";
import { inspectInitialization } from "../runtime/index.js";
import { buildUnderstandingReview } from "../project/understanding-review.js";
import {
  cliMessage,
  localizeAttention,
  localizeAutonomyPolicy,
  localizeDiscoveryValue,
  localizeProjectBrainHealth,
  localizeProjectShape,
  localizeQuestion,
  localizeReadinessState,
  resolveCliLocale,
  type CliLocale,
} from "./localization.js";
import { escapeTerminalControlText } from "./understand-command.js";

export type FirstRunProvider = "claude-code" | "codex";

type FirstRunActionId =
  | "install-protected-bootstrap"
  | "bootstrap-guardian"
  | "stop-unsafe-machine"
  | "unsupported-platform"
  | "initialize-plan"
  | "initialize-authorize"
  | "initialize-apply"
  | "persist-autonomy"
  | "review-understanding"
  | "configure-provider"
  | "continue";

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
  id: FirstRunActionId;
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
  interactionLocale: CliLocale;
  interactionLanguageSupported: boolean;
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
  machine: GuardianMachineReadiness;
  understanding: ReturnType<typeof buildUnderstandingReview>;
  nextActions: FirstRunNextAction[];
  boundaries: {
    evidenceIsProjectTruth: false;
    externalEvidenceIsProjectTruth: false;
    autonomyProfileIsAuthority: false;
    machineReadinessGrantsAuthority: false;
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
    const answer = await prompt.question(cliMessage("en", "language.prompt"));
    return normalizeLanguage(answer);
  } finally {
    prompt.close();
  }
}

async function resolveAutonomyProfile(parsed: FirstRunArgs, locale: CliLocale): Promise<AutonomyProfile> {
  if (parsed.autonomyProfile) {
    if (parsed.autonomyProfile !== "continue-without-confirmation" || parsed.acknowledgeAutonomyRisk) return parsed.autonomyProfile;
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("High-autonomy profile acknowledgement requires an interactive terminal or --acknowledge-autonomy-risk.");
    const prompt = createInterface({ input, output });
    try {
      console.log(cliMessage(locale, "autonomy.warning"));
      console.log(cliMessage(locale, "autonomy.warning.boundary"));
      const answer = await prompt.question(cliMessage(locale, "autonomy.ack.use"));
      if (answer !== "CONTINUE") throw new Error(cliMessage(locale, "autonomy.error.ack"));
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
    console.log(cliMessage(locale, "autonomy.choose"));
    console.log(cliMessage(locale, "autonomy.option.always"));
    console.log(cliMessage(locale, "autonomy.option.important"));
    console.log(cliMessage(locale, "autonomy.option.continue"));
    const answer = (await prompt.question(cliMessage(locale, "autonomy.prompt"))).trim();
    if (answer === "" || answer === "2") return "ask-important";
    if (answer === "1") return "ask-always";
    if (answer === "3") {
      console.log(cliMessage(locale, "autonomy.warning"));
      console.log(cliMessage(locale, "autonomy.warning.boundary"));
      const acknowledgement = await prompt.question(cliMessage(locale, "autonomy.ack.accept"));
      if (acknowledgement !== "CONTINUE") throw new Error(cliMessage(locale, "autonomy.error.ack"));
      return "continue-without-confirmation";
    }
    throw new Error(cliMessage(locale, "autonomy.error.mode"));
  } finally {
    prompt.close();
  }
}

function protectedBootstrapCommand(platform: NodeJS.Platform): string | undefined {
  if (platform === "win32") return "& 'C:\\Program Files\\Livariant\\Bootstrap\\v1\\guardian-bootstrap.ps1'";
  if (platform === "linux") return "/opt/livariant/bootstrap/v1/guardian-bootstrap";
  return undefined;
}

function buildNextActions(
  plan: Awaited<ReturnType<typeof inspectInitialization>>,
  machine: GuardianMachineReadiness,
  autonomyProfile: AutonomyProfile,
  locale: CliLocale,
  provider?: FirstRunProvider,
  externalSourceType?: string,
): FirstRunNextAction[] {
  const next: FirstRunNextAction[] = [];

  if (machine.state === "protected-source-required") {
    next.push({
      id: "install-protected-bootstrap",
      optional: false,
      purpose: cliMessage(locale, "next.installProtectedSource"),
      changesProject: false,
      changesMachineLocalState: true,
      requiresSeparateAuthorization: true,
    });
  } else if (machine.state === "guardian-bootstrap-required") {
    next.push({
      id: "bootstrap-guardian",
      optional: false,
      command: protectedBootstrapCommand(machine.platform),
      purpose: cliMessage(locale, "next.bootstrapGuardian"),
      changesProject: false,
      changesMachineLocalState: true,
      requiresSeparateAuthorization: true,
    });
  } else if (machine.state === "unsafe") {
    next.push({
      id: "stop-unsafe-machine",
      optional: false,
      purpose: cliMessage(locale, "next.stopUnsafe"),
      changesProject: false,
      changesMachineLocalState: false,
      requiresSeparateAuthorization: true,
    });
  } else if (machine.state === "unsupported-platform") {
    next.push({
      id: "unsupported-platform",
      optional: false,
      purpose: cliMessage(locale, "next.unsupported"),
      changesProject: false,
      changesMachineLocalState: false,
      requiresSeparateAuthorization: true,
    });
  }

  if (machine.lifecycleAuthorizationReady && plan.action === "initialize") {
    next.push({
      id: "initialize-plan",
      optional: false,
      command: "livariant init",
      purpose: cliMessage(locale, "next.initialize"),
      changesProject: false,
      requiresSeparateAuthorization: false,
    });
    next.push({
      id: "initialize-authorize",
      optional: false,
      command: "livariant init --authorize",
      purpose: cliMessage(locale, "next.initialize"),
      changesProject: false,
      changesMachineLocalState: true,
      requiresSeparateAuthorization: true,
    });
    next.push({
      id: "initialize-apply",
      optional: false,
      command: "livariant init --apply",
      purpose: cliMessage(locale, "next.initialize"),
      changesProject: true,
      requiresSeparateAuthorization: true,
    });
  }

  if (plan.projectBrainHealth === "valid" || machine.lifecycleAuthorizationReady) {
    const persistenceCommand = autonomyProfile === "continue-without-confirmation"
      ? `livariant autonomy set --profile ${autonomyProfile} --acknowledge-risk`
      : `livariant autonomy set --profile ${autonomyProfile}`;
    next.push({
      id: "persist-autonomy",
      optional: false,
      command: persistenceCommand,
      purpose: plan.projectBrainHealth === "valid"
        ? cliMessage(locale, "next.persist.valid")
        : cliMessage(locale, "next.persist.afterInit"),
      changesProject: false,
      changesMachineLocalState: true,
      requiresSeparateAuthorization: false,
    });
  }

  next.push({
    id: "review-understanding",
    optional: false,
    command: externalSourceType
      ? `livariant understand --external-source-type ${externalSourceType} --external-source <same-source-path>`
      : "livariant understand",
    purpose: externalSourceType
      ? cliMessage(locale, "next.review.external")
      : cliMessage(locale, "next.review"),
    changesProject: false,
    requiresSeparateAuthorization: false,
  });

  if (provider) {
    next.push({
      id: "configure-provider",
      optional: true,
      command: `livariant mcp setup --provider ${provider}`,
      purpose: cliMessage(locale, "next.provider", { provider }),
      changesProject: false,
      requiresSeparateAuthorization: false,
    });
  }

  if (machine.lifecycleAuthorizationReady) {
    next.push({
      id: "continue",
      optional: false,
      purpose: cliMessage(locale, "next.continue"),
      changesProject: false,
      requiresSeparateAuthorization: true,
    });
  }
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
  const localeResolution = resolveCliLocale(preferredLanguage);
  const selectedAutonomyProfile = options.autonomyProfile ?? DEFAULT_AUTONOMY_PROFILE;
  const plan = await inspectInitialization();
  const machine = await inspectGuardianMachineReadiness(plan.discovery.projectRoot);
  const externalEvidence = options.externalSourceType && options.externalSourcePath
    ? [await inspectExternalKnowledgeSource(parseExternalKnowledgeSourceKind(options.externalSourceType), options.externalSourcePath)]
    : [];
  const understanding = buildUnderstandingReview(plan.discovery, undefined, externalEvidence);

  return {
    schemaVersion: 1,
    preferredLanguage,
    interactionLocale: localeResolution.locale,
    interactionLanguageSupported: localeResolution.supported,
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
    machine,
    understanding,
    nextActions: buildNextActions(plan, machine, selectedAutonomyProfile, localeResolution.locale, options.provider, options.externalSourceType),
    boundaries: {
      evidenceIsProjectTruth: false,
      externalEvidenceIsProjectTruth: false,
      autonomyProfileIsAuthority: false,
      machineReadinessGrantsAuthority: false,
      grantsAuthority: false,
      mutationAuthorized: false,
      runtimeAuthorized: false,
      releaseAuthorized: false,
      changesMade: 0,
    },
  };
}

function renderEvidencePreview(
  locale: CliLocale,
  items: Array<{ value: string; provenance: string }>,
  emptyText: string,
  maxItems = 3,
): void {
  if (items.length === 0) {
    console.log(`- ${emptyText}`);
    return;
  }
  for (const item of items.slice(0, maxItems)) {
    console.log(`- ${escapeTerminalControlText(localizeDiscoveryValue(locale, item.value))} (${escapeTerminalControlText(item.provenance)})`);
  }
  if (items.length > maxItems) console.log(`- ${cliMessage(locale, "report.more", { count: items.length - maxItems })}`);
}

function renderHuman(report: FirstRunReport): void {
  const locale = report.interactionLocale;
  const autonomy = localizeAutonomyPolicy(locale, report.autonomy.selectedProfile);

  console.log(cliMessage(locale, "report.title"));
  console.log("");
  if (!report.interactionLanguageSupported) {
    console.log(cliMessage("en", "language.unsupported", { language: escapeTerminalControlText(report.preferredLanguage) }));
  }
  console.log(`${cliMessage(locale, "report.language")}: ${escapeTerminalControlText(report.preferredLanguage)}`);
  console.log(`${cliMessage(locale, "report.locale")}: ${locale === "de" ? "Deutsch" : "English"}`);
  console.log(`${cliMessage(locale, "report.autonomy")}: ${autonomy.label}`);
  console.log(`${cliMessage(locale, "report.autonomyBehavior")}: ${autonomy.summary}`);
  if (autonomy.warning) console.log(`${cliMessage(locale, "report.autonomyWarning")}: ${autonomy.warning}`);
  console.log(cliMessage(locale, "report.autonomyAuthority"));
  console.log(`${cliMessage(locale, "report.project")}: ${escapeTerminalControlText(report.project.root)}`);
  console.log(`${cliMessage(locale, "report.workspace")}: ${localizeProjectShape(locale, report.project.shape)}`);
  console.log(`${cliMessage(locale, "report.projectBrain")}: ${localizeProjectBrainHealth(locale, report.project.projectBrainHealth)}`);
  console.log("");

  console.log(cliMessage(locale, "report.machine"));
  console.log(`- ${cliMessage(locale, "report.machine.platform")}: ${report.machine.platform}`);
  console.log(`- ${localizeReadinessState(locale, report.machine)}`);
  if (report.machine.protectedSource.root) {
    console.log(`- ${cliMessage(locale, "report.machine.source")}: ${escapeTerminalControlText(report.machine.protectedSource.root)}`);
  }
  if (report.machine.guardian.root) {
    console.log(`- ${cliMessage(locale, "report.machine.guardian")}: ${escapeTerminalControlText(report.machine.guardian.root)}`);
  }
  console.log(`- ${cliMessage(locale, "report.machine.lifecycle")}: ${cliMessage(locale, report.machine.lifecycleAuthorizationReady ? "report.yes" : "report.no")}`);
  console.log("");

  console.log(cliMessage(locale, "report.found"));
  renderEvidencePreview(locale, report.understanding.confirmed, cliMessage(locale, "report.noConfirmed"));
  renderEvidencePreview(locale, report.understanding.stronglyInferred, cliMessage(locale, "report.noInferences"), 2);
  console.log("");

  console.log(cliMessage(locale, "report.review"));
  if (report.understanding.attention.length === 0 && report.understanding.questions.length === 0) {
    console.log(`- ${cliMessage(locale, "report.nothingFlagged")}`);
  } else {
    for (const item of report.understanding.attention.slice(0, 2)) {
      console.log(`- ${escapeTerminalControlText(localizeAttention(locale, item))}`);
    }
    for (const question of report.understanding.questions.slice(0, 3)) {
      console.log(`- ${escapeTerminalControlText(localizeQuestion(locale, question))}`);
    }
    const hidden = Math.max(0, report.understanding.attention.length - 2) + Math.max(0, report.understanding.questions.length - 3);
    if (hidden > 0) console.log(`- ${cliMessage(locale, "report.moreItems", { count: hidden })}`);
  }
  console.log(`- ${cliMessage(locale, "report.externalSources", { count: report.understanding.externalEvidence?.length ?? 0 })}`);
  console.log("");

  console.log(cliMessage(locale, "report.safety"));
  console.log(`- ${cliMessage(locale, "report.safety.evidence")}`);
  console.log(`- ${cliMessage(locale, "report.safety.autonomy")}`);
  console.log(`- ${cliMessage(locale, "report.safety.firstRun")}`);
  console.log(`- ${cliMessage(locale, "report.safety.machine")}`);
  console.log("");

  console.log(cliMessage(locale, "report.nextActions"));
  for (const action of report.nextActions) {
    const optional = action.optional ? cliMessage(locale, "report.action.optional") : cliMessage(locale, "report.action.next");
    const command = action.command ? ` — ${action.command}` : "";
    console.log(`- [${optional}] ${action.purpose}${command}`);
  }
  console.log("");
  console.log(cliMessage(locale, "report.changes"));
}

export async function handleFirstRunCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const language = await resolveLanguage(parsed);
  const locale = resolveCliLocale(language).locale;
  const autonomyProfile = await resolveAutonomyProfile(parsed, locale);
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
