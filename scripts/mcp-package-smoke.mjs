import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

function parseMessages(stdout) {
  return stdout.trim().split("\n").filter(Boolean).map((entry) => JSON.parse(entry));
}

function structured(messages, id) {
  const message = messages.find((entry) => entry.id === id);
  if (!message?.result?.structuredContent) {
    throw new Error(`MCP response ${String(id)} did not contain structuredContent:\n${JSON.stringify(messages, null, 2)}`);
  }
  return message.result.structuredContent;
}

function taskDigest(task) {
  const hash = createHash("sha256");
  hash.update("livariant:provider-return-task:v1", "utf8");
  hash.update(Buffer.from([0]));
  hash.update(task, "utf8");
  return hash.digest("hex");
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
  for (const required of ["dist/src/cli/mcp-command.js", "dist/src/mcp/server.js"]) {
    if (!entries.includes(required)) throw new Error(`Packed artifact is missing MCP file: ${required}`);
  }

  const tarball = resolve(packDir, filename);
  runNpm(["init", "-y"], { cwd: installDir });
  runNpm(["install", "--ignore-scripts", tarball], { cwd: installDir });
  const cliPath = resolve(installDir, "node_modules", "livariant", "dist", "src", "cli", "index.js");

  const init = run(process.execPath, [cliPath, "init", "--apply"], { cwd: installDir });
  if (!/Project Brain initialized:/.test(init.stdout)) throw new Error(`MCP smoke could not initialize Project Brain:\n${init.stdout}`);

  const task = "Installed package MCP smoke";
  const first = run(process.execPath, [cliPath, "mcp"], {
    cwd: installDir,
    input: [
      line({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "package-smoke", version: "1" } },
      }),
      line({ jsonrpc: "2.0", method: "notifications/initialized" }),
      line({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "livariant_provider_context", arguments: { provider: "codex", task } },
      }),
    ].join(""),
  });
  if (first.stderr !== "") throw new Error(`Installed MCP context request wrote unexpected stderr:\n${first.stderr}`);
  const context = structured(parseMessages(first.stdout), 2);
  if (context.state !== "ready" || context.mutationAuthorization !== false || context.changesMade !== 0) {
    throw new Error(`Installed MCP returned unexpected Provider Context:\n${JSON.stringify(context, null, 2)}`);
  }

  const providerReturn = {
    schemaVersion: 1,
    packetVersion: 1,
    provider: context.provider,
    contextPacketId: context.packetId,
    stableProjectIdentity: context.stableProjectIdentity,
    baselineDigest: context.baseline.digest,
    taskDigest: taskDigest(context.task.value),
    candidate: null,
  };

  const second = run(process.execPath, [cliPath, "mcp"], {
    cwd: installDir,
    input: [
      line({
        jsonrpc: "2.0",
        id: 3,
        method: "initialize",
        params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "package-smoke", version: "1" } },
      }),
      line({ jsonrpc: "2.0", method: "notifications/initialized" }),
      line({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "livariant_provider_return", arguments: { context, providerReturn } },
      }),
    ].join(""),
  });
  if (second.stderr !== "") throw new Error(`Installed MCP return request wrote unexpected stderr:\n${second.stderr}`);
  const returned = structured(parseMessages(second.stdout), 4);
  if (returned.state !== "no-candidate" || returned.semanticChangesMade !== 0 || returned.mutationAuthorization !== false) {
    throw new Error(`Installed MCP returned unexpected provider-return state:\n${JSON.stringify(returned, null, 2)}`);
  }

  const packageJson = JSON.parse(await readFile(resolve(installDir, "node_modules", "livariant", "package.json"), "utf8"));
  console.log(`MCP package smoke passed for Livariant ${packageJson.version}: installed tarball exposed bounded stdio context + no-candidate return without mutation authority.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
