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
  if (command !== "drift" && command !== "provider-context" && command !== "prepare" && command !== "authorize") {
    const showsHelp = command === undefined || ["help", "--help", "-h"].includes(command);
    await import("./legacy-main.js");
    if (showsHelp) {
      console.log("  drift --input <observation.json> [--json]");
      console.log("  provider-context --provider <claude-code|codex> --task <task.txt> [--json]");
      console.log("  prepare --input <candidate.json> [--json]");
      console.log("  authorize --input <actionable-proposal.json> [--json]");
    }
    return;
  }
  if (await delegateToActiveRuntime()) return;
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
  if (command === "prepare") {
    const { handlePrepareCommand } = await import("./prepare-command.js");
    await handlePrepareCommand(process.argv.slice(3));
    return;
  }
  const { handleAuthorizeCommand } = await import("./authorize-command.js");
  await handleAuthorizeCommand(process.argv.slice(3));
}

entry().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown runtime failure";
  console.error(`Runtime error: ${message}`);
  process.exitCode = 1;
});