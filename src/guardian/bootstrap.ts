import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, chown, copyFile, lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stderr, stdin } from "node:process";
import { assertProtectedGuardianBootstrapSource, isProtectedPosixMode } from "./bootstrap-source.js";
import {
  buildGuardianRootDescriptor,
  guardianLayoutPaths,
  isProtectedPosixOwner,
  productionGuardianRoot,
  type GuardianPlatform,
} from "./trust-root.js";
import { assertWindowsProtectedParentAnchor, assertWindowsProtectedPath } from "./windows-protection.js";

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

async function requireAbsent(path: string, label: string): Promise<void> {
  try {
    await lstat(path);
  } catch (error) {
    if (errno(error, "ENOENT")) return;
    throw error;
  }
  throw new Error(`${label} already exists. Fresh bootstrap refuses to replace, repair, or bless pre-existing state.`);
}

async function assertRealDirectory(path: string, label: string): Promise<void> {
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (errno(error, "ENOENT")) {
      throw new Error(`${label} is not provisioned. Stage A must create and protect the Guardian system parent before Stage-B bootstrap.`);
    }
    throw error;
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory and must not be a symbolic link or junction.`);
}

async function assertLinuxProtectedStatic(path: string, label: string): Promise<void> {
  await assertRealDirectory(path, label);
  const stats = await lstat(path);
  if (!isProtectedPosixOwner(Number(stats.uid))) throw new Error(`${label} is not owned by root.`);
  if (!isProtectedPosixMode(Number(stats.mode))) throw new Error(`${label} is writable by group or other principals.`);
}

async function assertProtectedProductionParent(root: string, platform: GuardianPlatform): Promise<void> {
  if (platform === "linux") {
    const parent = dirname(root);
    const anchor = dirname(parent);
    await assertLinuxProtectedStatic(anchor, "Guardian Linux system anchor");
    await assertLinuxProtectedStatic(parent, "Guardian Linux parent root");
    return;
  }

  const guardianParent = dirname(root);
  const livariantParent = dirname(guardianParent);
  const anchor = dirname(livariantParent);
  await assertRealDirectory(anchor, "Guardian Windows ProgramData anchor");
  await assertRealDirectory(livariantParent, "Guardian Windows Livariant parent");
  await assertRealDirectory(guardianParent, "Guardian Windows parent root");
  assertWindowsProtectedParentAnchor(anchor, "Guardian Windows ProgramData anchor");
  assertWindowsProtectedPath(livariantParent, "Guardian Windows Livariant parent");
  assertWindowsProtectedPath(guardianParent, "Guardian Windows parent root");
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

export function guardianBootstrapHasInteractiveTerminal(inputIsTTY: boolean | undefined, outputIsTTY: boolean | undefined): boolean {
  return inputIsTTY === true && outputIsTTY === true;
}

async function requireInteractiveBootstrap(root: string, helperSource: string, helperSha256: string): Promise<void> {
  if (!guardianBootstrapHasInteractiveTerminal(stdin.isTTY, stderr.isTTY)) {
    throw new Error("Guardian bootstrap requires a local interactive terminal. Non-interactive agents, scripts, redirected input, and CI cannot provision the production Guardian.");
  }
  const phrase = `BOOTSTRAP GUARDIAN ${helperSha256.slice(0, 12)}`;
  stderr.write("Livariant Guardian bootstrap\n");
  stderr.write(`Protected root: ${root}\n`);
  stderr.write(`Protected helper source: ${helperSource}\n`);
  stderr.write(`Helper SHA-256: ${helperSha256}\n`);
  stderr.write("This establishes only the protected Guardian foundation. It issues NO mutation, Runtime, integrity, or release Authority.\n");
  stderr.write("Bootstrap prerequisite: Stage A already provisioned both these exact Livariant/Node bytes and the empty Guardian system parent under OS protection outside normal agent-autonomous flow.\n");
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

function hardenWindowsDirectory(path: string): void {
  runIcacls([
    path,
    "/inheritance:r",
    "/grant:r",
    `${WINDOWS_SYSTEM_SID}:(OI)(CI)F`,
    `${WINDOWS_ADMINISTRATORS_SID}:(OI)(CI)F`,
    `${WINDOWS_USERS_SID}:(OI)(CI)RX`,
    "/C",
    "/Q",
  ]);
  runIcacls([path, "/setowner", WINDOWS_ADMINISTRATORS_SID, "/C", "/Q"]);
}

function hardenWindowsFile(path: string): void {
  runIcacls([
    path,
    "/inheritance:r",
    "/grant:r",
    `${WINDOWS_SYSTEM_SID}:F`,
    `${WINDOWS_ADMINISTRATORS_SID}:F`,
    `${WINDOWS_USERS_SID}:RX`,
    "/C",
    "/Q",
  ]);
  runIcacls([path, "/setowner", WINDOWS_ADMINISTRATORS_SID, "/C", "/Q"]);
}

function hardenWindows(root: string): void {
  const { descriptor, helper, records } = guardianLayoutPaths(root);
  hardenWindowsDirectory(root);
  hardenWindowsDirectory(records);
  hardenWindowsFile(descriptor);
  hardenWindowsFile(helper);
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

  await assertProtectedGuardianBootstrapSource(platform, helperSource, bootstrapModule, process.execPath);
  await assertProtectedProductionParent(root, platform);

  const helperStats = await lstat(helperSource);
  if (!helperStats.isFile() || helperStats.isSymbolicLink()) throw new Error("Guardian bootstrap helper source must be a regular non-symlink file.");
  const helperBytes = await readFile(helperSource);
  const helperSha256 = createHash("sha256").update(helperBytes).digest("hex");

  await requireAbsent(root, "Guardian production root");
  requirePrivilegedProcess(platform);
  await requireInteractiveBootstrap(root, helperSource, helperSha256);
  await assertProtectedProductionParent(root, platform);
  await requireAbsent(root, "Guardian production root");

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
    nextStep: "Close the privileged terminal and run `livariant guardian status` from an ordinary user terminal to verify requester write exclusion and protected parent-chain integrity.",
    bootstrapTrustAssumption: "Before Guardian bootstrap, exact Livariant release material and the empty Guardian system parent must be provisioned into fixed OS-protected locations by a separate privileged Stage-A installation step outside normal agent-autonomous flow. WP-026 does not claim that requester-controlled bytes can self-bootstrap trust.",
  };
}
