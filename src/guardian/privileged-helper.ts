import { lstat, realpath } from "node:fs/promises";
import { dirname, parse, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { assertWindowsProtectedParentAnchor, assertWindowsProtectedPath } from "./windows-protection.js";
import type { GuardianAuthoritySupport } from "./authority-client.js";

const LINUX_SUDO = "/usr/bin/sudo";
const WINDOWS_POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const SAFE_HELPER_ARGUMENT = /^[A-Za-z0-9._:-]+$/u;

function failureDetail(result: ReturnType<typeof spawnSync>): string {
  return result.error?.message || String(result.stderr || result.stdout || `exit ${String(result.status)}`).trim();
}

async function assertLinuxProtectedInterpreter(): Promise<string> {
  const interpreter = await realpath(process.execPath);
  let current = interpreter;
  const filesystemRoot = parse(interpreter).root;
  while (true) {
    const stats = await lstat(current);
    if (stats.isSymbolicLink()) throw new Error("Guardian privileged Node interpreter protection encountered a symbolic link after canonicalization.");
    if (Number(stats.uid) !== 0) throw new Error(`Guardian privileged Node interpreter path is not root-owned: ${current}`);
    if ((Number(stats.mode) & 0o022) !== 0) throw new Error(`Guardian privileged Node interpreter path is writable by group or other principals: ${current}`);
    if (resolve(current) === resolve(filesystemRoot)) break;
    current = dirname(current);
  }
  return interpreter;
}

function windowsProcessIsElevated(): boolean {
  const script = "$p=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent()); if($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){'yes'}else{'no'}";
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  return !result.error && result.status === 0 && result.stdout.trim().toLowerCase() === "yes";
}

async function assertWindowsProtectedInterpreter(): Promise<string> {
  const interpreter = await realpath(process.execPath);
  const parent = dirname(interpreter);
  const anchor = dirname(parent);
  assertWindowsProtectedPath(interpreter, "Guardian privileged Node interpreter");
  assertWindowsProtectedPath(parent, "Guardian privileged Node interpreter directory");
  assertWindowsProtectedParentAnchor(anchor, "Guardian privileged Node interpreter parent anchor");
  return interpreter;
}

function assertSafeHelperArguments(args: readonly string[]): void {
  if (args.length === 0 || args.length > 8 || args.some((arg) => !SAFE_HELPER_ARGUMENT.test(arg))) {
    throw new Error("Guardian privileged transition arguments contain unsupported shell-sensitive or unbounded material.");
  }
}

function runLinux(interpreter: string, support: GuardianAuthoritySupport, args: readonly string[], cwd?: string): void {
  if (typeof process.geteuid !== "function" || process.geteuid() === 0) {
    throw new Error("Guardian Authority transitions must be requested from an ordinary user terminal, not from an already-root Livariant process.");
  }
  const invalidate = spawnSync(LINUX_SUDO, ["-k"], { encoding: "utf8", shell: false, windowsHide: true });
  if (invalidate.error || invalidate.status !== 0) {
    throw new Error(`Guardian could not invalidate cached sudo credentials: ${failureDetail(invalidate)}`);
  }
  const passwordless = spawnSync(LINUX_SUDO, ["-n", "-v"], { encoding: "utf8", shell: false, windowsHide: true });
  if (!passwordless.error && passwordless.status === 0) {
    throw new Error("Guardian refuses passwordless or non-interactive sudo elevation because it would let the ordinary requester principal cross the Authority boundary without independent user presence.");
  }
  const result = spawnSync(LINUX_SUDO, ["-k", "--", interpreter, support.helper, ...args], {
    cwd,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Protected Guardian privileged transition failed: ${failureDetail(result)}`);
  }
}

function runWindows(interpreter: string, support: GuardianAuthoritySupport, args: readonly string[], cwd?: string): void {
  if (windowsProcessIsElevated()) {
    throw new Error("Guardian Authority transitions must be requested from an ordinary Windows terminal, not from an already-elevated Livariant process.");
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    LIVARIANT_GUARDIAN_ELEVATED_NODE: interpreter,
    LIVARIANT_GUARDIAN_ELEVATED_HELPER: support.helper,
    LIVARIANT_GUARDIAN_ELEVATED_CWD: cwd ?? process.cwd(),
    LIVARIANT_GUARDIAN_ELEVATED_ARG_COUNT: String(args.length),
  };
  args.forEach((arg, index) => { env[`LIVARIANT_GUARDIAN_ELEVATED_ARG_${index}`] = arg; });
  const script = [
    "$ErrorActionPreference='Stop'",
    "$count=[int]$env:LIVARIANT_GUARDIAN_ELEVATED_ARG_COUNT",
    "$arguments=New-Object System.Collections.Generic.List[string]",
    "$arguments.Add($env:LIVARIANT_GUARDIAN_ELEVATED_HELPER)",
    "for($i=0;$i -lt $count;$i++){ $arguments.Add([Environment]::GetEnvironmentVariable(('LIVARIANT_GUARDIAN_ELEVATED_ARG_' + $i))) }",
    "$p=Start-Process -FilePath $env:LIVARIANT_GUARDIAN_ELEVATED_NODE -ArgumentList $arguments.ToArray() -WorkingDirectory $env:LIVARIANT_GUARDIAN_ELEVATED_CWD -Verb RunAs -Wait -PassThru",
    "exit $p.ExitCode",
  ].join("; ");
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Protected Guardian UAC transition failed or was declined: ${failureDetail(result)}`);
  }
}

export async function runPrivilegedGuardianHelper(
  support: GuardianAuthoritySupport,
  args: readonly string[],
  options: { cwd?: string } = {},
): Promise<void> {
  assertSafeHelperArguments(args);
  if (process.platform === "linux") {
    const interpreter = await assertLinuxProtectedInterpreter();
    runLinux(interpreter, support, args, options.cwd);
    return;
  }
  if (process.platform === "win32") {
    const interpreter = await assertWindowsProtectedInterpreter();
    runWindows(interpreter, support, args, options.cwd);
    return;
  }
  throw new Error("Guardian privileged Authority transitions support Windows and Linux only.");
}
