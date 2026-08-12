#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  addConfirmedGoal,
  addConfirmedKnowledge,
  buildResumeContext,
  getStatus,
  getVersionInfo,
  initializeProject,
  inspectInitialization,
  listAcceptedDecisions,
  recordAcceptedDecision,
  runDoctor,
  supersedeAcceptedDecision,
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

async function handleGoals(args: string[]): Promise<void> {
  const action = args[0] ?? "list";
  if (action === "list") {
    const context = await buildResumeContext();
    console.log("Confirmed goals:");
    console.log(context.confirmedGoals.length ? context.confirmedGoals.map((item) => `- ${item}`).join("\n") : "- none confirmed");
    return;
  }
  if (action !== "add") throw new Error("Goals command supports 'list' or 'add <goal> [--apply]'.");
  const text = textBeforeFlags(args, 1, ["--apply"]);
  printChangePlan("goal", text);
  if (!args.includes("--apply")) {
    console.log("");
    console.log("No changes applied. Add --apply to authorize this goal.");
    return;
  }
  await addConfirmedGoal(text, process.cwd(), { authorized: true });
  console.log("");
  console.log("Confirmed goal recorded and verified.");
}

async function handleKnowledge(args: string[]): Promise<void> {
  const action = args[0] ?? "list";
  if (action === "list") {
    const context = await buildResumeContext();
    console.log("Known facts:");
    console.log(context.knownFacts.length ? context.knownFacts.map((item) => `- ${item}`).join("\n") : "- none confirmed");
    return;
  }
  if (action !== "add") throw new Error("Knowledge command supports 'list' or 'add <fact> [--apply]'.");
  const text = textBeforeFlags(args, 1, ["--apply"]);
  printChangePlan("knowledge", text);
  if (!args.includes("--apply")) {
    console.log("");
    console.log("No changes applied. Add --apply to authorize this knowledge change.");
    return;
  }
  await addConfirmedKnowledge(text, process.cwd(), { authorized: true });
  console.log("");
  console.log("Confirmed project knowledge recorded and verified.");
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
    if (!args.includes("--apply")) {
      console.log("");
      console.log("No changes applied. Add --apply to authorize this decision.");
      return;
    }
    const record = await recordAcceptedDecision(text, process.cwd(), { authorized: true });
    console.log("");
    console.log(`Accepted decision recorded and verified: ${record.id}`);
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
    if (!args.includes("--apply")) {
      console.log("");
      console.log("No changes applied. Add --apply to authorize this supersession.");
      return;
    }
    const result = await supersedeAcceptedDecision({ decisionId, replacement, reason }, process.cwd(), { authorized: true });
    console.log("");
    console.log(`Decision ${result.superseded.id} superseded by ${result.replacement.id} and verified.`);
    return;
  }

  throw new Error("Decisions command supports 'list', 'add <decision> [--apply]', or 'supersede <id> <replacement> [--reason <reason>] [--apply]'.");
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
      console.log("  init [--apply]");
      console.log("  goals [list] | goals add <goal> [--apply]");
      console.log("  knowledge [list] | knowledge add <fact> [--apply]");
      console.log("  decisions [list] | decisions add <decision> [--apply]");
      console.log("  decisions supersede <id> <replacement> [--reason <reason>] [--apply]");
      console.log("  update --manifest <release-manifest.json> [--apply --artifact <runtime.tgz> --trusted-source <source-id>]");
      console.log("  recover [--apply]");
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
