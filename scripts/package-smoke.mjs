import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const temp = await mkdtemp(resolve(tmpdir(), "livariant-package-smoke-"));
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const expectedVersion = packageJson.version;

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
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
  });
  const expectedStatus = options.expectedStatus ?? 0;
  if (result.error || result.status !== expectedStatus) {
    throw new Error([
      `${command} ${args.join(" ")} failed with exit ${String(result.status)} (expected ${expectedStatus})`,
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

function providerReturnTaskDigest(task) {
  const hash = createHash("sha256");
  hash.update("livariant:provider-return-task:v1", "utf8");
  hash.update(Buffer.from([0]));
  hash.update(task, "utf8");
  return hash.digest("hex");
}

function assertProtectedBlocked(output, label) {
  if (output.state !== "blocked" || output.semanticChangesMade !== 0) {
    throw new Error(`${label} did not fail closed without protected Project Brain truth:\n${JSON.stringify(output)}`);
  }
  const text = JSON.stringify(output);
  if (!/protected Guardian integrity acceptance|Protected Livariant Guardian is not ready|Guardian root is not provisioned/i.test(text)) {
    throw new Error(`${label} did not explain the protected integrity requirement:\n${JSON.stringify(output)}`);
  }
}

try {
  const packDir = resolve(temp, "pack");
  const installDir = resolve(temp, "install");
  const globalPrefix = resolve(temp, "global-prefix");
  await import("node:fs/promises").then(({ mkdir }) => Promise.all([
    mkdir(packDir, { recursive: true }),
    mkdir(installDir, { recursive: true }),
    mkdir(globalPrefix, { recursive: true }),
  ]));

  const packed = runNpm(["pack", "--json", "--pack-destination", packDir]);
  const packResult = JSON.parse(packed.stdout);
  const filename = packResult?.[0]?.filename;
  if (typeof filename !== "string") throw new Error("npm pack did not return a package filename");
  const tarball = resolve(packDir, filename);

  const entries = packResult[0]?.files?.map((file) => file.path) ?? [];
  const required = [
    "package.json",
    "dist/src/cli/index.js",
    "dist/src/cli/lifecycle.js",
    "dist/src/cli/maintenance-command.js",
    "dist/src/cli/provider-return-command.js",
    "dist/src/runtime/index.js",
    "dist/src/runtime/semantic-maintenance.js",
    "dist/src/runtime/provider-return.js",
    "dist/src/runtime/provider-context-copy-validation.js",
    "dist/src/runtime/protected-context.js",
    "dist/src/runtime/protected-provider-context.js",
    "dist/src/runtime/protected-resume.js",
    "dist/src/lifecycle/update.js",
    "dist/src/lifecycle/recovery.js",
    "dist/src/distribution/release-integrity.js",
    "dist/src/adapters/resume-provider.js",
    "dist/src/adapters/provider-resume-adapter.js",
  ];
  for (const path of required) {
    if (!entries.includes(path)) throw new Error(`Packed artifact is missing required file: ${path}`);
  }
  if (entries.some((path) => path.startsWith("tests/") || path.startsWith("dist/tests/"))) {
    throw new Error("Packed artifact unexpectedly contains test fixtures or compiled tests");
  }

  runNpm(["install", "--global", "--prefix", globalPrefix, "--ignore-scripts", tarball]);
  const globalPackageRoot = process.platform === "win32"
    ? resolve(globalPrefix, "node_modules", "livariant")
    : resolve(globalPrefix, "lib", "node_modules", "livariant");
  const globalCliPath = resolve(globalPackageRoot, "dist", "src", "cli", "index.js");
  const globalCli = run(process.execPath, [globalCliPath, "version"], { cwd: installDir });
  if (!globalCli.stdout.includes(`Livariant framework version: ${expectedVersion}`) || !/Channel: preview/.test(globalCli.stdout)) {
    throw new Error(`Globally installed release-tarball CLI returned unexpected version output:\n${globalCli.stdout}`);
  }

  runNpm(["init", "-y"], { cwd: installDir });
  runNpm(["install", "--ignore-scripts", tarball], { cwd: installDir });

  const packageRoot = resolve(installDir, "node_modules", "livariant");
  const cliPath = resolve(packageRoot, "dist", "src", "cli", "index.js");
  const cli = run(process.execPath, [cliPath, "version"], { cwd: installDir });
  if (!cli.stdout.includes(`Livariant framework version: ${expectedVersion}`)) {
    throw new Error(`Installed CLI returned unexpected version output:\n${cli.stdout}`);
  }
  if (!/Channel: preview/.test(cli.stdout)) {
    throw new Error(`Installed CLI returned unexpected channel output:\n${cli.stdout}`);
  }

  const init = run(process.execPath, [cliPath, "init", "--apply"], { cwd: installDir });
  if (!/Project Brain initialized:/.test(init.stdout)) {
    throw new Error(`Installed CLI did not initialize Project Brain:\n${init.stdout}`);
  }

  const maintenanceCandidate = resolve(installDir, "maintenance-candidate.json");
  await writeFile(maintenanceCandidate, `${JSON.stringify({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: "Installed package maintenance smoke",
    rationale: "Verify packaged orchestration remains blocked before protected integrity acceptance",
    origin: "explicit-user",
  }, null, 2)}\n`, "utf8");
  const maintain = run(process.execPath, [cliPath, "maintain", "--input", maintenanceCandidate, "--json"], {
    cwd: installDir,
    expectedStatus: 2,
  });
  let maintainOutput;
  try {
    maintainOutput = JSON.parse(maintain.stdout.trim());
  } catch {
    throw new Error(`Installed maintain CLI did not return valid JSON:\n${maintain.stdout}`);
  }
  assertProtectedBlocked(maintainOutput, "Installed maintain CLI");
  const goalsAfterMaintain = await readFile(resolve(installDir, ".project-brain", "goals.md"), "utf8");
  if (goalsAfterMaintain.includes("Installed package maintenance smoke")) {
    throw new Error("Installed maintain CLI mutated Project Brain before protected integrity acceptance");
  }

  const providerTaskPath = resolve(installDir, "provider-task.txt");
  await writeFile(providerTaskPath, "Review installed provider return smoke\n", "utf8");
  const providerContextResult = run(process.execPath, [cliPath, "provider-context", "--provider", "codex", "--task", providerTaskPath, "--json"], {
    cwd: installDir,
    expectedStatus: 3,
  });
  let protectedProviderContext;
  try {
    protectedProviderContext = JSON.parse(providerContextResult.stdout.trim());
  } catch {
    throw new Error(`Installed provider-context CLI did not return valid JSON:\n${providerContextResult.stdout}`);
  }
  if (protectedProviderContext.state !== "blocked" || protectedProviderContext.safetyState !== "blocked" || protectedProviderContext.changesMade !== 0) {
    throw new Error(`Installed provider-context CLI did not fail closed before protected integrity acceptance:\n${providerContextResult.stdout}`);
  }

  // Build a structurally valid local-only context through the installed low-level module
  // so the packaged Provider Return CLI is exercised at the protected current-project gate.
  const providerContextModulePath = resolve(packageRoot, "dist", "src", "runtime", "provider-context.js");
  const { buildProviderContext } = await import(pathToFileURL(providerContextModulePath).href);
  const localOnlyContext = await buildProviderContext("codex", "Check whether durable truth changed", installDir);
  if (localOnlyContext.state !== "ready") {
    throw new Error(`Installed low-level Provider Context fixture was not structurally ready:\n${JSON.stringify(localOnlyContext)}`);
  }
  const providerContextPath = resolve(installDir, "provider-context.json");
  await writeFile(providerContextPath, `${JSON.stringify(localOnlyContext, null, 2)}\n`, "utf8");
  const providerReturnPath = resolve(installDir, "provider-return.json");
  await writeFile(providerReturnPath, `${JSON.stringify({
    schemaVersion: 1,
    packetVersion: 1,
    provider: localOnlyContext.provider,
    contextPacketId: localOnlyContext.packetId,
    stableProjectIdentity: localOnlyContext.stableProjectIdentity,
    baselineDigest: localOnlyContext.baseline.digest,
    taskDigest: providerReturnTaskDigest(localOnlyContext.task.value),
    candidate: null,
  }, null, 2)}\n`, "utf8");

  const providerReturnResult = run(process.execPath, [cliPath, "provider-return", "--context", providerContextPath, "--input", providerReturnPath, "--json"], {
    cwd: installDir,
    expectedStatus: 2,
  });
  let providerReturnOutput;
  try {
    providerReturnOutput = JSON.parse(providerReturnResult.stdout.trim());
  } catch {
    throw new Error(`Installed provider-return CLI did not return valid JSON:\n${providerReturnResult.stdout}`);
  }
  assertProtectedBlocked(providerReturnOutput, "Installed provider-return CLI");
  if (providerReturnOutput.phase !== "current-project") {
    throw new Error(`Installed provider-return CLI blocked at an unexpected phase:\n${providerReturnResult.stdout}`);
  }

  const resume = run(process.execPath, [cliPath, "resume", "--provider", "codex"], {
    cwd: installDir,
    env: { LIVARIANT_PROVIDER_ENV: "codex" },
    expectedStatus: 1,
  });
  if (!/requires exact protected Guardian integrity acceptance|Protected Livariant Guardian is not ready|Guardian root is not provisioned/i.test(`${resume.stdout}\n${resume.stderr}`)) {
    throw new Error(`Installed resume CLI did not fail closed before protected integrity acceptance:\n${resume.stdout}\n${resume.stderr}`);
  }

  const emptyManifest = resolve(installDir, "empty-release-manifest.json");
  await writeFile(emptyManifest, "[]\n", "utf8");
  const update = run(process.execPath, [cliPath, "update", "--manifest", emptyManifest], { cwd: installDir });
  if (!/No compatible Livariant update is available/.test(update.stdout)) {
    throw new Error(`Installed CLI did not expose read-only update discovery:\n${update.stdout}`);
  }
  const recover = run(process.execPath, [cliPath, "recover"], { cwd: installDir });
  if (!/No interrupted migration requires recovery/.test(recover.stdout)) {
    throw new Error(`Installed CLI did not expose read-only recovery inspection:\n${recover.stdout}`);
  }

  const installedPackage = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
  if (installedPackage.name !== "livariant" || installedPackage.version !== expectedVersion || installedPackage.bin?.livariant !== "./dist/src/cli/index.js") {
    throw new Error("Installed package does not expose the expected Livariant package and CLI identity");
  }

  console.log(`Package smoke test passed for Livariant ${expectedVersion}: packed and globally/project-locally installed from the release tarball, initialized a Project Brain, verified protected-integrity fail-closed behavior for installed maintain/provider-context/provider-return/resume surfaces before Guardian acceptance, and exposed read-only update/recovery inspection.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
