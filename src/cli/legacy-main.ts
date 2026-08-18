#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  buildProjectContextSnapshot,
  buildResumeContext,
  buildSemanticProposal,
  getStatus,
  getVersionInfo,
  initializeProject,
  inspectInitialization,
  listAcceptedDecisions,
  readSemanticProposalCandidateFile,
  runDoctor,
  type SemanticProposalFinding,
} from "../runtime/index.js";
import { getPreviewResumeAdapter } from "../adapters/provider-resume-adapter.js";
import type { ResumeProviderId } from "../adapters/resume-provider.js";
import { readActiveRuntimePointer } from "../distribution/runtime-installation.js";
import { handleRecover, handleUpdate } from "./lifecycle.js";

function printVersion(args: string[]): void {
  const info = getVersionInfo();
  if (args.includes("--json")) {
    console.log(JSON.stringify(info));
    return;
  }
  console.log(`Livariant framework version: ${info.frameworkVersion}`);
  console.log(`Runtime: ${info.runtime}`);
  console.log(`Channel: ${info.channel}`);
}

function commandSkipsRuntimeDelegation(command: string | undefined): boolean {
  return command === undefined || ["help", "--help", "-h", "version"].includes(command);
}

function canContinueWithoutRuntimeDelegation(command: string | undefined): boolean {
  return command === "status" || command === "doctor";
}

async function delegateToActiveRuntime(command: string | undefined): Promise<boolean> {
  if (process.env.PBF_RUNTIME_DELEGATION_BYPASS === "1") return false;

  let active;
  try {
    active = await readActiveRuntimePointer(process.cwd());
  } catch (error) {
    if (canContinueWithoutRuntimeDelegation(command)) return false;
    throw error;
  }
  if (!active) return false;

  const status = await getStatus(process.cwd());
  if (status.projectBrain !== "present" || status.frameworkVersion !== active.version) return false;

  const current = getVersionInfo().frameworkVersion;
  if (active.version === current) return false;

  const result = spawnSync(process.execPath, [active.cliPath, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
  return true;
}

async function printStatus(): Promise<void> {
  const status = await getStatus();
  console.log(`Project: ${status.projectRoot}`);
  console.log("");
  console.log("Livariant installation:");
  console.log(status.frameworkVersion);
  console.log(`Executing Runtime: ${status.executingRuntimeVersion}`);
  if (status.activatedRuntimeVersion) console.log(`Activated Runtime: ${status.activatedRuntimeVersion}`);
  if (status.preparedRuntimeVersion) console.log(`Prepared Runtime: ${status.preparedRuntimeVersion}`);
  console.log("");
  console.log("Project Brain:");
  console.log(status.projectBrain === "present" ? "present" : status.projectBrain === "needs-diagnosis" ? "needs diagnosis" : "not initialized");
  console.log("");
  console.log("Lifecycle:");
  console.log(status.lifecycle);
  if (status.lifecycleReason) console.log(`Reason: ${status.lifecycleReason}`);
  console.log("");
  console.log("Changes made:");
  console.log(status.changesMade);
}

async function printDoctor(): Promise<void> {
  const report = await runDoctor();
  console.log("Doctor report");
  console.log("");
  console.log(`Project: ${report.projectRoot}`);
  console.log(`State: ${report.state}`);
  console.log("");
  console.log("Findings:");
  for (const finding of report.findings) console.log(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
  console.log("");
  console.log(`Changes made: ${report.changesMade}`);
}

function providerFromArgs(args: string[]): ResumeProviderId | undefined {
  const index = args.indexOf("--provider");
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === "claude-code" || value === "codex") return value;
  throw new Error("Resume provider must be 'claude-code' or 'codex'.");
}

async function printResume(args: string[]): Promise<void> {
  const context = await buildResumeContext();
  const provider = providerFromArgs(args);
  if (provider) {
    console.log(getPreviewResumeAdapter(provider).render(context));
    return;
  }
  console.log("Resume context");
  console.log("");
  console.log(`Project: ${context.projectRoot}`);
  console.log(`Lifecycle: ${context.lifecycle}`);
  console.log("");
  console.log("Identity:");
  console.log(context.projectIdentity.length ? context.projectIdentity.map((item) => `- ${item}`).join("\n") : "- none confirmed");
  console.log("");
  console.log("Confirmed goals:");
  console.log(context.confirmedGoals.length ? context.confirmedGoals.map((item) => `- ${item}`).join("\n") : "- none confirmed");
  console.log("");
  console.log("Active decisions:");
  console.log(context.activeDecisions.length ? context.activeDecisions.map((item) => `- ${item}`).join("\n") : "- none confirmed");
  console.log("");
  console.log("Known facts:");
  console.log(context.knownFacts.length ? context.knownFacts.map((item) => `- ${item}`).join("\n") : "- none confirmed");
  console.log("");
  console.log("Unresolved unknowns:");
  console.log(context.unresolvedUnknowns.length ? context.unresolvedUnknowns.map((item) => `- ${item}`).join("\n") : "- none");
}

function renderContextItems(items: Array<{ value: string; authorityClass: string }>, empty: string): string {
  return items.length ? items.map((item) => `- [${item.authorityClass}] ${item.value}`).join("\n") : `- ${empty}`;
}

async function printContext(args: string[]): Promise<void> {
  const snapshot = await buildProjectContextSnapshot();
  if (args.includes("--json")) {
    console.log(JSON.stringify(snapshot));
    if (snapshot.safetyState === "blocked") process.exitCode = 3;
    return;
  }

  console.log("Project context snapshot");
  console.log("");
  console.log(`Safety state: ${snapshot.safetyState}`);
  console.log(`Project: ${snapshot.projectLocator}`);
  console.log(`Stable project identity: ${snapshot.stableProjectIdentity ?? "not established"}`);

  if (snapshot.safetyState === "blocked") {
    console.log("");
    console.log("Blocking findings:");
    for (const finding of snapshot.findings) console.log(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
    console.log("");
    console.log("Changes made: 0");
    process.exitCode = 3;
    return;
  }

  console.log(`Baseline: ${snapshot.baseline.algorithm}:${snapshot.baseline.digest}`);
  console.log(`Baseline schema: ${snapshot.baseline.schemaVersion}`);
  console.log("Projection: derived, not mutation authorization");
  console.log("");
  console.log("Identity:");
  console.log(renderContextItems(snapshot.context.projectIdentity, "none confirmed"));
  console.log("");
  console.log("Confirmed goals:");
  console.log(renderContextItems(snapshot.context.confirmedGoals, "none confirmed"));
  console.log("");
  console.log("Active decisions:");
  console.log(renderContextItems(snapshot.context.activeDecisions, "none confirmed"));
  console.log("");
  console.log("Known facts:");
  console.log(renderContextItems(snapshot.context.knownFacts, "none confirmed"));
  console.log("");
  console.log("Unresolved unknowns:");
  console.log(renderContextItems(snapshot.context.unresolvedUnknowns, "none"));
  console.log("");
  console.log("Changes made: 0");
}

function renderUntrustedText(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      result += `\\u${code.toString(16).padStart(4, "0")}`;
    } else {
      result += char;
    }
  }
  return result;
}

function proposalInputPath(args: string[]): string {
  const inputIndexes = args.map((value, index) => value === "--input" ? index : -1).filter((index) => index >= 0);
  if (inputIndexes.length !== 1) throw new Error("Propose requires exactly one --input <candidate.json> argument.");
  const inputIndex = inputIndexes[0];
  const path = args[inputIndex + 1];
  if (!path || path.startsWith("--")) throw new Error("--input requires a candidate JSON path.");
  const allowedIndexes = new Set([inputIndex, inputIndex + 1]);
  args.forEach((value, index) => {
    if (value === "--json") allowedIndexes.add(index);
  });
  if (allowedIndexes.size !== args.length || args.filter((value) => value === "--json").length > 1) {
    throw new Error("Propose supports only --input <candidate.json> and optional --json.");
  }
  return path;
}

function renderProposalFinding(finding: SemanticProposalFinding | { code: string; severity: string; message: string }): string {
  if ("category" in finding) return `- [${finding.category}/${finding.effect}] ${finding.code}: ${finding.message}`;
  return `- [${finding.severity}] ${finding.code}: ${finding.message}`;
}

async function printProposal(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const inputPath = proposalInputPath(args);
  let candidate;
  try {
    candidate = await readSemanticProposalCandidateFile(inputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Candidate input is invalid.";
    if (json) console.log(JSON.stringify({ state: "invalid-candidate", error: { code: "candidate-invalid", message }, changesMade: 0 }));
    else {
      console.log("Semantic proposal candidate invalid");
      console.log(`Reason: ${message}`);
      console.log("Changes made: 0");
    }
    process.exitCode = 2;
    return;
  }

  const result = await buildSemanticProposal(candidate);
  if (json) {
    console.log(JSON.stringify(result));
    if (result.state === "blocked") process.exitCode = 3;
    return;
  }

  console.log("Semantic proposal");
  console.log("");
  if (result.state === "blocked") {
    console.log("State: blocked");
    console.log(`Project: ${result.projectLocator}`);
    if (result.baseline) console.log(`Baseline: ${result.baseline.algorithm}:${result.baseline.digest}`);
    console.log("");
    console.log("Findings:");
    for (const finding of result.findings) console.log(renderProposalFinding(finding));
    console.log("");
    console.log("Review only: true");
    console.log("Apply supported: false");
    console.log("Authorization eligible: false");
    console.log("Changes made: 0");
    process.exitCode = 3;
    return;
  }

  const proposal = result.proposal;
  console.log("State: proposal");
  console.log(`Proposal ID: ${proposal.proposalId}`);
  console.log(`Project: ${proposal.projectLocator}`);
  console.log(`Baseline: ${proposal.baseline.algorithm}:${proposal.baseline.digest}`);
  console.log(`Domain: ${proposal.candidate.domain}`);
  console.log(`Change kind: ${proposal.candidate.changeKind}`);
  if (proposal.candidate.changeKind === "supersede") console.log(`Target decision: ${renderUntrustedText(proposal.candidate.targetDecisionId)}`);
  console.log(`Proposed statement: ${renderUntrustedText(proposal.candidate.proposedStatement)}`);
  console.log(`Rationale: ${renderUntrustedText(proposal.candidate.rationale)}`);
  console.log(`Origin claim: ${proposal.candidate.originClaim} (verified: false)`);
  console.log("");
  console.log("Findings:");
  for (const finding of proposal.findings) console.log(renderProposalFinding(finding));
  console.log("");
  console.log("Review only: true");
  console.log("Mutation authorization: false");
  console.log("Apply supported: false");
  console.log("Authorization eligible: false");
  console.log("Changes made: 0");
}

function printInitializationPlan(plan: Awaited<ReturnType<typeof inspectInitialization>>): void {
  console.log("Initialization assessment");
  console.log("");
  console.log(`Project: ${plan.projectState}`);
  console.log(`Project Brain: ${plan.projectBrainHealth}`);
  console.log(`Action: ${plan.action}`);
  console.log("");
  console.log("Verified evidence:");
  if (plan.evidence.length === 0) console.log("- none");
  else for (const evidence of plan.evidence) console.log(`- ${evidence}`);
  console.log("");
  console.log("Project files to modify:");
  console.log(plan.projectFilesToModify.length === 0 ? "- none" : plan.projectFilesToModify.map((file) => `- ${file}`).join("\n"));
  console.log("");
  console.log("Project Brain files to create:");
  console.log(plan.filesToCreate.length === 0 ? "- none" : plan.filesToCreate.map((file) => `- ${file}`).join("\n"));
  if (plan.reason) {
    console.log("");
    console.log(`Reason: ${plan.reason}`);
  }
}

async function handleInit(args: string[]): Promise<void> {
  const plan = await inspectInitialization();
  printInitializationPlan(plan);
  if (!args.includes("--apply")) {
    if (plan.action === "initialize") {
      console.log("");
      console.log("No changes applied. Use 'livariant init --apply' to authorize bootstrap.");
    }
    return;
  }
  if (plan.action !== "initialize") {
    process.exitCode = 3;
    return;
  }
  const result = await initializeProject(process.cwd(), { authorized: true });
  console.log("");
  console.log(`Project Brain initialized: ${result.projectBrainPath}`);
  console.log("Protected integrity: required before canonical Project Brain reads.");
  console.log("Review with 'livariant integrity inspect', then run 'livariant integrity accept-current'.");
}

function textBeforeFlags(args: string[], start: number, stopFlags: string[]): string {
  const parts: string[] = [];
  for (let index = start; index < args.length; index += 1) {
    if (stopFlags.includes(args[index])) break;
    parts.push(args[index]);
  }
  const text = parts.join(" ").trim();
  if (!text) throw new Error("A non-empty text value is required.");
  return text;
}

function flagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function printChangePlan(kind: string, text: string): void {
  console.log("Canonical knowledge change plan");
  console.log("");
  console.log(`Kind: ${kind}`);
  console.log(`Proposed value: ${text}`);
  console.log("Target: Project Brain canonical state");
  console.log("Changes made: 0");
}

function rejectLegacySemanticApply(): void {
  console.error("Legacy semantic --apply is retired and does not create mutation Authority.");
  console.error("Use the guarded flow: propose/review -> prepare -> authorize -> apply, or use maintain to reach authorization-required first.");
  console.error("Changes made: 0");
  process.exitCode = 3;
}

async function handleGoals(args: string[]): Promise<void> {
  const action = args[0] ?? "list";
  if (action === "list") {
    const context = await buildResumeContext();
    console.log("Confirmed goals:");
    console.log(context.confirmedGoals.length ? context.confirmedGoals.map((item) => `- ${item}`).join("\n") : "- none confirmed");
    return;
  }
  if (action !== "add") throw new Error("Goals command supports 'list' or plan-only 'add <goal>'.");
  const text = textBeforeFlags(args, 1, ["--apply"]);
  printChangePlan("goal", text);
  if (args.includes("--apply")) {
    console.log("");
    rejectLegacySemanticApply();
    return;
  }
  console.log("");
  console.log("No changes applied. Canonical semantic mutation uses proposal-bound Authorization through prepare/authorize/apply or maintain.");
}

async function handleKnowledge(args: string[]): Promise<void> {
  const action = args[0] ?? "list";
  if (action === "list") {
    const context = await buildResumeContext();
    console.log("Known facts:");
    console.log(context.knownFacts.length ? context.knownFacts.map((item) => `- ${item}`).join("\n") : "- none confirmed");
    return;
  }
  if (action !== "add") throw new Error("Knowledge command supports 'list' or plan-only 'add <fact>'.");
  const text = textBeforeFlags(args, 1, ["--apply"]);
  printChangePlan("knowledge", text);
  if (args.includes("--apply")) {
    console.log("");
    rejectLegacySemanticApply();
    return;
  }
  console.log("");
  console.log("No changes applied. Canonical semantic mutation uses proposal-bound Authorization through prepare/authorize/apply or maintain.");
}

async function handleDecisions(args: string[]): Promise<void> {
  const action = args[0] ?? "list";
  if (action === "list") {
    const records = await listAcceptedDecisions();
    console.log("Accepted decisions:");
    const active = records.filter((record) => record.status === "active");
    console.log(active.length ? active.map((record) => `- [${record.id}] ${record.text}`).join("\n") : "- none confirmed");
    return;
  }

  if (action === "add") {
    const text = textBeforeFlags(args, 1, ["--apply"]);
    printChangePlan("decision", text);
    if (args.includes("--apply")) {
      console.log("");
      rejectLegacySemanticApply();
      return;
    }
    console.log("");
    console.log("No changes applied. Canonical semantic mutation uses proposal-bound Authorization through prepare/authorize/apply or maintain.");
    return;
  }

  if (action === "supersede") {
    const decisionId = args[1];
    if (!decisionId || decisionId.startsWith("--")) throw new Error("Decision supersession requires a decision id.");
    const replacement = textBeforeFlags(args, 2, ["--reason", "--apply"]);
    const reason = flagValue(args, "--reason");
    printChangePlan("decision supersession", replacement);
    console.log(`Supersedes: ${decisionId}`);
    if (reason) console.log(`Reason: ${reason}`);
    if (args.includes("--apply")) {
      console.log("");
      rejectLegacySemanticApply();
      return;
    }
    console.log("");
    console.log("No changes applied. Canonical semantic mutation uses proposal-bound Authorization through prepare/authorize/apply or maintain.");
    return;
  }

  throw new Error("Decisions command supports 'list', plan-only 'add <decision>', or plan-only 'supersede <id> <replacement> [--reason <reason>]'.");
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  if (!commandSkipsRuntimeDelegation(command) && await delegateToActiveRuntime(command)) return;
  switch (command) {
    case "version": printVersion(args); return;
    case "status": await printStatus(); return;
    case "doctor": await printDoctor(); return;
    case "resume": await printResume(args); return;
    case "context": await printContext(args); return;
    case "propose": await printProposal(args); return;
    case "init": await handleInit(args); return;
    case "goals": await handleGoals(args); return;
    case "knowledge": await handleKnowledge(args); return;
    case "decisions": await handleDecisions(args); return;
    case "update": await handleUpdate(args); return;
    case "recover": await handleRecover(args); return;
    case undefined:
    case "help":
    case "--help":
    case "-h":
      console.log("Livariant");
      console.log("Commands:");
      console.log("  version [--json]");
      console.log("  status");
      console.log("  doctor");
      console.log("  resume [--provider claude-code|codex]");
      console.log("  context [--json]");
      console.log("  propose --input <candidate.json> [--json]");
      console.log("  init [--apply]");
      console.log("  goals [list] | goals add <goal>  # plan only");
      console.log("  knowledge [list] | knowledge add <fact>  # plan only");
      console.log("  decisions [list] | decisions add <decision>  # plan only");
      console.log("  decisions supersede <id> <replacement> [--reason <reason>]  # plan only");
      console.log("  update --manifest <release-manifest.json> [--apply --artifact <runtime.tgz> --trusted-source <source-id>]");
      console.log("  recover [--apply]");
      console.log("");
      console.log("Legacy semantic --apply is retired. Use proposal-bound prepare/authorize/apply or maintain for canonical semantic mutation.");
      return;
    default:
      console.error(`Unknown command: ${command}`);
      process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown runtime failure";
  console.error(`Runtime error: ${message}`);
  process.exitCode = 1;
});
