import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { win32 } from "node:path";

export type LocalCliLaunchSource = "path-command" | "native-executable" | "npm-package";

export interface LocalCliLaunch {
  command: string;
  argsPrefix: readonly string[];
  source: LocalCliLaunchSource;
  shimPath?: string;
}

export interface LocalCliPackageTarget {
  packagePath: readonly string[];
  entrypoints: readonly string[];
}

export interface ResolveLocalCliOptions {
  commandName: string;
  nativeWindowsBasenames?: readonly string[];
  npmPackages?: readonly LocalCliPackageTarget[];
  platform?: NodeJS.Platform;
  pathCandidates?: readonly string[];
  fileExists?: (path: string) => boolean;
  nodeExecutable?: string;
}

function windowsPathCandidates(commandName: string): string[] {
  const result = spawnSync("where.exe", [commandName], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return [];
  return (result.stdout ?? "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function isWindowsShim(path: string): boolean {
  const extension = win32.extname(path).toLowerCase();
  return extension === ".cmd" || extension === "";
}

export function resolveLocalCli(options: ResolveLocalCliOptions): LocalCliLaunch | undefined {
  const commandName = options.commandName.trim();
  if (!commandName) throw new Error("Local CLI command name must not be blank.");

  const platform = options.platform ?? process.platform;
  if (platform !== "win32") {
    return { command: commandName, argsPrefix: [], source: "path-command" };
  }

  const fileExists = options.fileExists ?? existsSync;
  const candidates = options.pathCandidates ?? windowsPathCandidates(commandName);
  const nativeNames = new Set(
    (options.nativeWindowsBasenames ?? [`${commandName}.exe`]).map((value) => value.toLowerCase()),
  );

  for (const candidate of candidates) {
    if (nativeNames.has(win32.basename(candidate).toLowerCase()) && fileExists(candidate)) {
      return { command: candidate, argsPrefix: [], source: "native-executable" };
    }
  }

  const packageTargets = options.npmPackages ?? [];
  for (const shimPath of candidates) {
    if (!isWindowsShim(shimPath)) continue;
    const binRoot = win32.dirname(shimPath);
    for (const target of packageTargets) {
      const packageRoot = win32.join(binRoot, "node_modules", ...target.packagePath);
      for (const entrypoint of target.entrypoints) {
        const entry = win32.join(packageRoot, entrypoint);
        if (fileExists(entry)) {
          return {
            command: options.nodeExecutable ?? process.execPath,
            argsPrefix: [entry],
            source: "npm-package",
            shimPath,
          };
        }
      }
    }
  }

  return undefined;
}

export function launchWithManualPath(path: string, nodeExecutable = process.execPath): LocalCliLaunch {
  const trimmed = path.trim();
  if (!trimmed) throw new Error("Manual local CLI path must not be blank.");
  const extension = win32.extname(trimmed).toLowerCase();
  if (extension === ".cmd" || extension === ".bat" || extension === ".ps1") {
    throw new Error("Shell script shims are not accepted as local provider executables.");
  }
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
    return { command: nodeExecutable, argsPrefix: [trimmed], source: "npm-package" };
  }
  return { command: trimmed, argsPrefix: [], source: "native-executable" };
}
