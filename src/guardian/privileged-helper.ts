import { lstat, realpath } from "node:fs/promises";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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

  const nativeConfirmation = args.includes("--native-confirmation-language");
  const elevatedWorkingDirectory = cwd ?? process.cwd();
  const diagnosticDirectory = mkdtempSync(resolve(tmpdir(), "livariant-guardian-elevation-"));
  const diagnosticPath = resolve(diagnosticDirectory, "result.txt");

  try {
    // Everything required by the elevated process is embedded into the encoded
    // command. Do not depend on custom environment variables surviving RunAs/UAC.
    const payload = Buffer.from(JSON.stringify({
      node: interpreter,
      helper: support.helper,
      cwd: elevatedWorkingDirectory,
      args: [...args],
      diagnosticPath,
    }), "utf8").toString("base64");

    const elevatedScript = [
      "$ErrorActionPreference='Stop'",
      `$json=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}'))`,
      "$p=$json | ConvertFrom-Json",
      "try {",
      "Set-Location -LiteralPath ([string]$p.cwd)",
      "$argv=@([string]$p.helper)",
      "foreach($arg in $p.args){ $argv += [string]$arg }",
      "& ([string]$p.node) @argv",
      "$childExit=$LASTEXITCODE",
      "if($childExit -ne 0){ throw ('protected helper exited with code ' + $childExit) }",
      "Set-Content -LiteralPath ([string]$p.diagnosticPath) -Value 'ok' -Encoding UTF8",
      "exit 0",
      "} catch {",
      "$detail=$_.Exception.Message",
      "try { Set-Content -LiteralPath ([string]$p.diagnosticPath) -Value $detail -Encoding UTF8 } catch {}",
      "exit 1",
      "}",
    ].join("; ");
    const encodedCommand = Buffer.from(elevatedScript, "utf16le").toString("base64");

    const launcher = [
      "$ErrorActionPreference='Stop'",
      `$startArgs=@{FilePath='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';ArgumentList=@('-NoProfile','-NonInteractive','-Sta','-EncodedCommand','${encodedCommand}');Verb='RunAs';Wait=$true;PassThru=$true}`,
      nativeConfirmation ? "$startArgs.WindowStyle='Hidden'" : "",
      "$p=Start-Process @startArgs",
      "exit $p.ExitCode",
    ].filter(Boolean).join("; ");

    const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", launcher], {
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      timeout: 5 * 60 * 1000,
    });

    if (result.error || result.status !== 0) {
      let elevatedDetail = "";
      try {
        elevatedDetail = readFileSync(diagnosticPath, "utf8").trim();
      } catch {
        // UAC cancellation or pre-launch failure may produce no elevated diagnostic.
      }
      const detail = elevatedDetail || failureDetail(result);
      throw new Error(`Protected Guardian UAC transition failed or was declined: ${detail}`);
    }
  } finally {
    rmSync(diagnosticDirectory, { recursive: true, force: true });
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
