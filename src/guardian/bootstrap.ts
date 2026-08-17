import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, chown, copyFile, lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stderr, stdin } from "node:process";
import { assertProtectedGuardianBootstrapSource } from "./bootstrap-source.js";
import {
  buildGuardianRootDescriptor,
  guardianLayoutPaths,
  productionGuardianRoot,
  type GuardianPlatform,
} from "./trust-root.js";

const WINDOWS_POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const WINDOWS_ICACLS = "C:\\Windows\\System32\\icacls.exe";
const WINDOWS_SYSTEM_SID = "*S-1-5-18";
const WINDOWS_ADMINISTRATORS_SID = "*S-1-5-32-544";
const WINDOWS_USERS_SID = "*S-1-5-32-545";

export interface GuardianBootstrapResult {
  schemaVersion: 1;
  state: "provisioned";
  platform: GuardianPlatform;
  root: string;
  helperSha256: string;
  authorityIssued: false;
  changesMade: number;
  nextStep: string;
  bootstrapTrustAssumption: string;
}

function errno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

async function requireRootAbsent(root: string): Promise<void> {
  try {
    await lstat(root);
  } catch (error) {
    if (errno(error, "ENOENT")) return;
    throw error;
  }
  throw new Error("Guardian production root already exists. Fresh bootstrap refuses to replace, repair, or bless pre-existing state.");
}

function windowsProcessIsElevated(): boolean {
  const script = "$p=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent()); if($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){'yes'}else{'no'}";
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return false;
  return result.stdout.trim().toLowerCase() === "yes";
}

function requirePrivilegedProcess(platform: GuardianPlatform): void {
  if (platform === "linux") {
    if (typeof process.geteuid !== "function" || process.geteuid() !== 0) {
      throw new Error("Guardian bootstrap requires an already privileged root terminal. Livariant does not initiate sudo/pkexec elevation itself.");
    }
    return;
  }
  if (!windowsProcessIsElevated()) {
    throw new Error("Guardian bootstrap requires an already elevated Administrator terminal. Livariant does not initiate UAC elevation itself.");
  }
}

async function requireInteractiveBootstrap(root: string, helperSource: string, helperSha256: string): Promise<void> {
  if (!stdin.isTTY || !stderr.isTTY) {
    throw new Error("Guardian bootstrap requires a local interactive terminal. Non-interactive agents, scripts, redirected input, and CI cannot provision the production Guardian.");
  }
  const phrase = `BOOTSTRAP GUARDIAN ${helperSha256.slice(0, 12)}`;
  stderr.write("Livariant Guardian bootstrap\n");
  stderr.write(`Protected root: ${root}\n`);
  stderr.write(`Protected helper source: ${helperSource}\n`);
  stderr.write(`Helper SHA-256: ${helperSha256}\n`);
  stderr.write("This establishes only the protected Guardian foundation. It issues NO mutation, Runtime, integrity, or release Authority.\n");
  stderr.write("Bootstrap prerequisite: these executing Livariant/Node bytes were already provisioned into a protected system installation from exact release material outside normal agent-autonomous flow.\n");
  stderr.write(`Type exactly: ${phrase}\n`);
  const terminal = createInterface({ input: stdin, output: stderr });
  try {
    const answer = await terminal.question("> ");
    if (answer !== phrase) throw new Error("Guardian bootstrap confirmation did not match the exact helper digest challenge.");
  } finally {
    terminal.close();
  }
}

function runIcacls(args: string[]): void {
  const result = spawnSync(WINDOWS_ICACLS, args, { encoding: "utf8", shell: false, windowsHide: true });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`Guardian Windows ACL hardening failed: ${detail.trim()}`);
  }
}

async function hardenLinux(root: string): Promise<void> {
  const { descriptor, helper, records } = guardianLayoutPaths(root);
  await chown(root, 0, 0);
  await chown(records, 0, 0);
  await chown(descriptor, 0, 0);
  await chown(helper, 0, 0);
  await chmod(root, 0o755);
  await chmod(records, 0o755);
  await chmod(descriptor, 0o444);
  await chmod(helper, 0o555);
}

function hardenWindows(root: string): void {
  // Remove inherited DACLs and replace explicit grants recursively. Users get
  // read/execute only; SYSTEM and built-in Administrators retain full control.
  runIcacls([
    root,
    "/inheritance:r",
    "/grant:r",
    `${WINDOWS_SYSTEM_SID}:(OI)(CI)F`,
    `${WINDOWS_ADMINISTRATORS_SID}:(OI)(CI)F`,
    `${WINDOWS_USERS_SID}:(OI)(CI)RX`,
    "/T",
    "/C",
    "/Q",
  ]);
  runIcacls([root, "/setowner", WINDOWS_ADMINISTRATORS_SID, "/T", "/C", "/Q"]);
}

export async function bootstrapProductionGuardian(): Promise<GuardianBootstrapResult> {
  if (process.platform !== "linux" && process.platform !== "win32") {
    throw new Error("Guardian bootstrap v1 supports Windows and Linux only.");
  }
  const platform: GuardianPlatform = process.platform;
  const root = productionGuardianRoot(platform);
  if (!root) throw new Error("Guardian production root is unavailable for this platform.");

  const bootstrapModule = fileURLToPath(import.meta.url);
  const helperSource = fileURLToPath(new URL("./protected-helper.js", import.meta.url));

  // Critical bootstrap boundary: requester-controlled npm/npx/project/cache bytes
  // may not be elevated into Guardian trust. The executing bootstrap module,
  // helper source, and Node executable must already be OS-protected.
  await assertProtectedGuardianBootstrapSource(platform, helperSource, bootstrapModule, process.execPath);

  const helperStats = await lstat(helperSource);
  if (!helperStats.isFile() || helperStats.isSymbolicLink()) throw new Error("Guardian bootstrap helper source must be a regular non-symlink file.");
  const helperBytes = await readFile(helperSource);
  const helperSha256 = createHash("sha256").update(helperBytes).digest("hex");

  await requireRootAbsent(root);
  requirePrivilegedProcess(platform);
  await requireInteractiveBootstrap(root, helperSource, helperSha256);
  await requireRootAbsent(root);

  await mkdir(dirname(root), { recursive: true });
  await mkdir(root, { recursive: false });
  const physicalRoot = await realpath(root);
  const { descriptor, helper, records } = guardianLayoutPaths(physicalRoot);
  await mkdir(records, { recursive: false });
  await copyFile(helperSource, helper);
  const copiedHelper = await readFile(helper);
  if (createHash("sha256").update(copiedHelper).digest("hex") !== helperSha256) {
    throw new Error("Guardian protected helper copy does not match the user-reviewed bootstrap digest.");
  }
  const rootDescriptor = buildGuardianRootDescriptor(copiedHelper, physicalRoot, platform);
  await writeFile(descriptor, `${JSON.stringify(rootDescriptor, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

  if (platform === "linux") await hardenLinux(physicalRoot);
  else hardenWindows(physicalRoot);

  return {
    schemaVersion: 1,
    state: "provisioned",
    platform,
    root: physicalRoot,
    helperSha256,
    authorityIssued: false,
    changesMade: 4,
    nextStep: "Close the privileged terminal and run `livariant guardian status` from an ordinary user terminal to verify requester write exclusion.",
    bootstrapTrustAssumption: "Before Guardian bootstrap, exact Livariant release material must be provisioned into the fixed protected bootstrap source root by a separate privileged installation step outside normal agent-autonomous flow. WP-026 does not claim that requester-controlled bytes can self-bootstrap trust.",
  };
}
