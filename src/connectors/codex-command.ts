import { existsSync, readFileSync } from "node:fs";
import { win32 } from "node:path";
import { resolveLocalCli } from "./local-cli-command.js";

export interface CodexCommandResolution {
  command: string;
  argsPrefix: readonly string[];
  source: "path-command" | "native-executable" | "npm-package" | "npm-native-package";
  shimPath?: string;
}

export interface CodexCommandResolutionOptions {
  platform?: NodeJS.Platform;
  arch?: string;
  pathCandidates?: readonly string[];
  fileExists?: (path: string) => boolean;
  readTextFile?: (path: string) => string;
  nodeExecutable?: string;
  env?: NodeJS.ProcessEnv;
}

function windowsTarget(arch: string): { packageName: string; triple: string } | undefined {
  if (arch === "x64") return { packageName: "codex-win32-x64", triple: "x86_64-pc-windows-msvc" };
  if (arch === "arm64") return { packageName: "codex-win32-arm64", triple: "aarch64-pc-windows-msvc" };
  return undefined;
}

function isWindowsNpmShim(path: string): boolean {
  const extension = win32.extname(path).toLowerCase();
  return extension === ".cmd" || extension === "";
}

function officialWindowsCandidates(env: NodeJS.ProcessEnv): string[] {
  const result: string[] = [];
  const localAppData = env.LOCALAPPDATA?.trim();
  const codexInstallDir = env.CODEX_INSTALL_DIR?.trim();
  const codexHome = env.CODEX_HOME?.trim() || (env.USERPROFILE?.trim() ? win32.join(env.USERPROFILE.trim(), ".codex") : undefined);

  if (codexInstallDir) result.push(win32.join(codexInstallDir, "codex.exe"));
  if (localAppData) result.push(win32.join(localAppData, "Programs", "OpenAI", "Codex", "bin", "codex.exe"));
  if (codexHome) result.push(win32.join(codexHome, "packages", "standalone", "current", "codex.exe"));
  return result;
}

/**
 * Resolves a local Codex installation without executing command shims through a shell.
 *
 * Resolution order:
 * 1. official standalone/native locations;
 * 2. native executables already exposed through PATH;
 * 3. the actual @openai/codex JS entry referenced by an npm-style shim, run through
 *    Livariant's bundled Node runtime;
 * 4. older known npm optional-dependency native layouts.
 */
export function resolveCodexCommand(options: CodexCommandResolutionOptions = {}): CodexCommandResolution | undefined {
  const platform = options.platform ?? process.platform;
  if (platform !== "win32") {
    return { command: "codex", argsPrefix: [], source: "path-command" };
  }

  const fileExists = options.fileExists ?? existsSync;
  const readTextFile = options.readTextFile ?? ((path: string) => readFileSync(path, "utf8"));
  const env = options.env ?? process.env;

  const generic = resolveLocalCli({
    commandName: "codex",
    nativeWindowsBasenames: ["codex.exe"],
    npmPackages: [{ packagePath: ["@openai", "codex"], entrypoints: ["bin\\codex.js"] }],
    platform,
    pathCandidates: options.pathCandidates,
    additionalWindowsCandidates: officialWindowsCandidates(env),
    fileExists,
    readTextFile,
    nodeExecutable: options.nodeExecutable ?? process.execPath,
  });
  if (generic) {
    return {
      command: generic.command,
      argsPrefix: generic.argsPrefix,
      source: generic.source,
      ...(generic.shimPath ? { shimPath: generic.shimPath } : {}),
    };
  }

  const target = windowsTarget(options.arch ?? process.arch);
  if (!target) return undefined;

  for (const shimPath of options.pathCandidates ?? []) {
    if (!isWindowsNpmShim(shimPath)) continue;
    const binRoot = win32.dirname(shimPath);
    const packageRoots = [
      win32.join(binRoot, "node_modules", "@openai", target.packageName),
      win32.join(binRoot, "node_modules", "@openai", "codex", "node_modules", "@openai", target.packageName),
      win32.join(binRoot, "node_modules", "@openai", "codex"),
    ];
    for (const packageRoot of packageRoots) {
      const nativeCandidates = [
        win32.join(packageRoot, "vendor", target.triple, "bin", "codex.exe"),
        win32.join(packageRoot, "vendor", target.triple, "codex", "codex.exe"),
      ];
      for (const native of nativeCandidates) {
        if (fileExists(native)) {
          return { command: native, argsPrefix: [], source: "npm-native-package", shimPath };
        }
      }
    }
  }

  return undefined;
}
