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

async function entry(): Promise<void> {
  const command = process.argv[2];
  if (command !== "discover" && command !== "understand" && command !== "adopt-understanding" && command !== "drift" && command !== "provider-context" && command !== "provider-return" && command !== "prepare" && command !== "authorize" && command !== "apply" && command !== "maintain" && command !== "mcp") {
    const showsHelp = command === undefined || ["help", "--help", "-h"].includes(command);
    await import("./legacy-main.js");
    if (showsHelp) {
      console.log("  discover [--json]");
      console.log("  understand [--input <review.json>] [--json]");
      console.log("  adopt-understanding --input <review.json> --select <candidate-target> [--json]");
      console.log("  drift --input <observation.json> [--json]");
      console.log("  provider-context --provider <claude-code|codex> --task <task.txt> [--json]");
      console.log("  provider-return --context <provider-context.json> --input <provider-return.json> [--authorization <authorization-id>] [--json]");
      console.log("  prepare --input <candidate.json> [--json]");
      console.log("  authorize --input <actionable-proposal.json> [--json]");
      console.log("  apply --authorization <authorization-id> --input <actionable-proposal.json> [--json]");
      console.log("  maintain --input <candidate.json> [--authorization <authorization-id>] [--json]");
      console.log("  mcp");
      console.log("  mcp setup --provider <claude-code|codex> [--json]");
    }
    return;
  }
  if (await delegateToActiveRuntime()) return;
  if (command === "discover") {
    const { handleDiscoverCommand } = await import("./discover-command.js");
    await handleDiscoverCommand(process.argv.slice(3));
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
