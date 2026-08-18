import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const temp = await mkdtemp(resolve(tmpdir(), "livariant-mcp-package-smoke-"));

function npmInvocation(args) {
  return process.platform === "win32"
    ? {
        command: process.execPath,
        args: [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args],
      }
    : { command: "npm", args };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    input: options.input,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1", ...(options.env ?? {}) },
    shell: false,
  });
  if (result.error || result.status !== (options.expectedStatus ?? 0)) {
    throw new Error([
      `${command} ${args.join(" ")} failed with exit ${String(result.status)}`,
      result.error?.message,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"));
  }
  return result;
}

function runNpm(args, options = {}) {
  const invocation = npmInvocation(args);
  return run(invocation.command, invocation.args, options);
}

function line(value) {
  return `${JSON.stringify(value)}\n`;
}

async function assertMissing(path, label) {
  try {
    await access(path);
  } catch {
    return;
  }
  throw new Error(`MCP setup helper unexpectedly created ${label}: ${path}`);
}

async function captureManaged(projectRoot) {
  const names = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"];
  return new Map(await Promise.all(names.map(async (name) => [name, await readFile(resolve(projectRoot, ".project-brain", name))])));
}

async function assertManagedUnchanged(projectRoot, before) {
  for (const [name, bytes] of before) {
    const after = await readFile(resolve(projectRoot, ".project-brain", name));
    if (!after.equals(bytes)) throw new Error(`Installed MCP protected-session refusal mutated ${name}`);
  }
}

try {
  const packDir = resolve(temp, "pack");
  const installDir = resolve(temp, "install");
  await import("node:fs/promises").then(({ mkdir }) => Promise.all([
    mkdir(packDir, { recursive: true }),
    mkdir(installDir, { recursive: true }),
  ]));

  const packed = runNpm(["pack", "--json", "--pack-destination", packDir]);
  const packResult = JSON.parse(packed.stdout);
  const filename = packResult?.[0]?.filename;
  if (typeof filename !== "string") throw new Error("npm pack did not return a package filename");
  const entries = packResult[0]?.files?.map((file) => file.path) ?? [];
  for (const required of ["dist/src/cli/mcp-command.js", "dist/src/cli/mcp-setup.js", "dist/src/mcp/server.js"]) {
    if (!entries.includes(required)) throw new Error(`Packed artifact is missing MCP file: ${required}`);
  }

  const tarball = resolve(packDir, filename);
  runNpm(["init", "-y"], { cwd: installDir });
  runNpm(["install", "--ignore-scripts", tarball], { cwd: installDir });
  const cliPath = resolve(installDir, "node_modules", "livariant", "dist", "src", "cli", "index.js");

  const init = run(process.execPath, [cliPath, "init", "--apply"], { cwd: installDir });
  if (!/Project Brain initialized:/.test(init.stdout)) throw new Error(`MCP smoke could not initialize Project Brain:\n${init.stdout}`);

  const setup = run(process.execPath, [cliPath, "mcp", "setup", "--provider", "codex", "--json"], { cwd: installDir });
  if (setup.stderr !== "") throw new Error(`Installed MCP setup helper wrote unexpected stderr:\n${setup.stderr}`);
  const setupPlan = JSON.parse(setup.stdout);
  if (setupPlan.provider !== "codex" || setupPlan.transport !== "stdio" || setupPlan.mutatesProviderConfiguration !== false) {
    throw new Error(`Installed MCP setup helper returned an unexpected plan:\n${setup.stdout}`);
  }
  if (setupPlan.registrationCommand !== "codex mcp add livariant -- livariant mcp") {
    throw new Error(`Installed MCP setup helper returned unexpected Codex registration command:\n${setup.stdout}`);
  }
  if (!setupPlan.projectScopedConfig?.includes("[mcp_servers.livariant]") || !setupPlan.projectScopedConfig.includes("enabled_tools")) {
    throw new Error(`Installed MCP setup helper omitted project-scoped Codex configuration:\n${setup.stdout}`);
  }
  await assertMissing(resolve(installDir, ".codex", "config.toml"), "Codex project configuration");
  await assertMissing(resolve(installDir, ".mcp.json"), "Claude project MCP configuration");

  const before = await captureManaged(installDir);
  const blocked = run(process.execPath, [cliPath, "mcp"], {
    cwd: installDir,
    input: line({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "package-smoke", version: "1" } },
    }),
    expectedStatus: 1,
  });
  if (blocked.stdout.trim() !== "") {
    throw new Error(`Installed MCP emitted protocol output despite protected-session refusal:\n${blocked.stdout}`);
  }
  if (!/Canonical Project Brain use requires exact protected Guardian integrity acceptance|Protected Livariant Guardian is not ready|Guardian root is not provisioned/i.test(blocked.stderr)) {
    throw new Error(`Installed MCP did not explain protected integrity refusal:\n${blocked.stderr}`);
  }
  await assertManagedUnchanged(installDir, before);

  const packageJson = JSON.parse(await readFile(resolve(installDir, "node_modules", "livariant", "package.json"), "utf8"));
  console.log(`MCP package smoke passed for Livariant ${packageJson.version}: installed tarball rendered read-only native setup guidance and refused valid stdio session startup without protected Guardian Project Brain acceptance while preserving project bytes.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
