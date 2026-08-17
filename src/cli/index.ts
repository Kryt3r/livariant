#!/usr/bin/env node

import { spawnSync } from "node:child_process";

async function delegateToActiveRuntime(): Promise<boolean> {
  if (process.env.PBF_RUNTIME_DELEGATION_BYPASS === "1") return false;
  const [{ readActiveRuntimePointer }, { getStatus, getVersionInfo }] = await Promise.all([
    import("../distribution/runtime-installation.js"),
    import("../runtime/index.js"),
  ]);
  const active = await readActiveRuntimePointer(process.cwd());
  if (!active) return false;
  const status = await getStatus(process.cwd());
  if (status.projectBrain !== "present" || status.frameworkVersion !== active.version) return false;
  if (active.version === getVersionInfo().frameworkVersion) return false;
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

function blocksLegacySemanticApply(command: string | undefined, args: string[]): boolean {
  return (command === "goals" || command === "knowledge" || command === "decisions") && args.includes("--apply");
}

function renderLegacySemanticApplyRetirement(): void {
  console.error("Legacy semantic --apply is retired and does not create mutation Authority.");
  console.error("Use the guarded flow: propose/review -> prepare -> authorize -> apply, or use maintain to reach authorization-required first.");
  console.error("Changes made: 0");
}

function renderHelp(): void {
  console.log("Livariant");
  console.log("Commands:");
  console.log("  version [--json]");
  console.log("  status");
  console.log("  doctor");
  console.log("  resume [--provider claude-code|codex]");
  console.log("  context [--json]");
  console.log("  propose --input <candidate.json> [--json]");
  console.log("  init [--apply]");
  console.log("  integrity inspect [--json]");
  console.log("  integrity accept-current --acknowledge-current-state [--json]");
  console.log("  goals [list] | goals add <goal>  # plan only");
  console.log("  knowledge [list] | knowledge add <fact>  # plan only");
  console.log("  decisions [list] | decisions add <decision>  # plan only");
  console.log("  decisions supersede <id> <replacement> [--reason <reason>]  # plan only");
  console.log("  update --manifest <release-manifest.json> [--apply --artifact <runtime.tgz> --trusted-source <source-id>]");
  console.log("  recover [--apply]");
  console.log("  first-run [--language <preferred-language>] [--autonomy-profile <ask-always|ask-important|continue-without-confirmation>] [--acknowledge-autonomy-risk] [--external-source-type <local-directory> --external-source <source-path>] [--provider <claude-code|codex>] [--json]");
  console.log("  autonomy show [--json]");
  console.log("  autonomy set --profile <ask-always|ask-important|continue-without-confirmation> [--acknowledge-risk] [--json]");
  console.log("  discover [--json]");
  console.log("  external-source inspect --type <local-directory> --path <source-path> [--json]");
  console.log("  understand [--input <review.json>] [--external-source-type <local-directory> --external-source <source-path>] [--json]");
  console.log("  adopt-understanding --input <review.json> --select <candidate-id> [--json]");
  console.log("  drift --input <observation.json> [--json]");
  console.log("  provider-context --provider <claude-code|codex> --task <task.txt> [--json]");
  console.log("  provider-return --context <provider-context.json> --input <provider-return.json> [--authorization <authorization-id>] [--json]");
  console.log("  prepare --input <candidate.json> [--json]");
  console.log("  authorize --input <actionable-proposal.json> [--json]");
  console.log("  apply --authorization <authorization-id> --input <actionable-proposal.json> [--json]");
  console.log("  maintain --input <candidate.json> [--authorization <authorization-id>] [--json]");
  console.log("  mcp");
  console.log("  mcp setup --provider <claude-code|codex> [--json]");
  console.log("");
  console.log("Legacy goals/knowledge/decisions commands are list/plan surfaces only; their --apply mutation path is retired.");
  console.log("Canonical semantic mutation uses proposal-bound Authorization through prepare/authorize/apply or maintain.");
  console.log("Project Brain integrity checkpoints detect unaccepted managed-byte drift but are not same-user Agent-resistant Authority.");
}

async function entry(): Promise<void> {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  const showsHelp = command === undefined || ["help", "--help", "-h"].includes(command);
  if (showsHelp) {
    renderHelp();
    return;
  }
  if (blocksLegacySemanticApply(command, args)) {
    renderLegacySemanticApplyRetirement();
    process.exitCode = 3;
    return;
  }
  if (command !== "first-run" && command !== "integrity" && command !== "autonomy" && command !== "discover" && command !== "external-source" && command !== "understand" && command !== "adopt-understanding" && command !== "drift" && command !== "provider-context" && command !== "provider-return" && command !== "prepare" && command !== "authorize" && command !== "apply" && command !== "maintain" && command !== "mcp") {
    await import("./legacy-main.js");
    return;
  }
  if (await delegateToActiveRuntime()) return;
  if (command === "first-run") {
    const { handleFirstRunCommand } = await import("./first-run-command.js");
    await handleFirstRunCommand(process.argv.slice(3));
    return;
  }
  if (command === "integrity") {
    const { handleIntegrityCommand } = await import("./integrity-command.js");
    await handleIntegrityCommand(process.argv.slice(3));
    return;
  }
  if (command === "autonomy") {
    const { handleAutonomyCommand } = await import("./autonomy-command.js");
    await handleAutonomyCommand(process.argv.slice(3));
    return;
  }
  if (command === "discover") {
    const { handleDiscoverCommand } = await import("./discover-command.js");
    await handleDiscoverCommand(process.argv.slice(3));
    return;
  }
  if (command === "external-source") {
    const { handleExternalSourceCommand } = await import("./external-source-command.js");
    await handleExternalSourceCommand(process.argv.slice(3));
    return;
  }
  if (command === "understand") {
    const { handleUnderstandCommand } = await import("./understand-command.js");
    await handleUnderstandCommand(process.argv.slice(3));
    return;
  }
  if (command === "adopt-understanding") {
    const { handleAdoptUnderstandingCommand } = await import("./adopt-understanding-command.js");
    await handleAdoptUnderstandingCommand(process.argv.slice(3));
    return;
  }
  if (command === "drift") {
    const { handleDriftCommand } = await import("./drift-command.js");
    await handleDriftCommand(process.argv.slice(3));
    return;
  }
  if (command === "provider-context") {
    const { handleProviderContextCommand } = await import("./provider-context-command.js");
    await handleProviderContextCommand(process.argv.slice(3));
    return;
  }
  if (command === "provider-return") {
    const { handleProviderReturnCommand } = await import("./provider-return-command.js");
    await handleProviderReturnCommand(process.argv.slice(3));
    return;
  }
  if (command === "prepare") {
    const { handlePrepareCommand } = await import("./prepare-command.js");
    await handlePrepareCommand(process.argv.slice(3));
    return;
  }
  if (command === "authorize") {
    const { handleAuthorizeCommand } = await import("./authorize-command.js");
    await handleAuthorizeCommand(process.argv.slice(3));
    return;
  }
  if (command === "apply") {
    const { handleApplyCommand } = await import("./apply-command.js");
    await handleApplyCommand(process.argv.slice(3));
    return;
  }
  if (command === "maintain") {
    const { handleMaintenanceCommand } = await import("./maintenance-command.js");
    await handleMaintenanceCommand(process.argv.slice(3));
    return;
  }
  const { handleMcpCommand } = await import("./mcp-command.js");
  await handleMcpCommand(process.argv.slice(3));
}

entry().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown runtime failure";
  console.error(`Runtime error: ${message}`);
  process.exitCode = 1;
});
