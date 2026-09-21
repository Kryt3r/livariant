import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
  additionalWindowsCandidates?: readonly string[];
  additionalPackageRoots?: readonly string[];
  env?: NodeJS.ProcessEnv;
  fileExists?: (path: string) => boolean;
  readTextFile?: (path: string) => string;
  nodeExecutable?: string;
}

const MAX_SHIM_BYTES = 128 * 1024;

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

function uniquePaths(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = win32.normalize(trimmed).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function defaultWindowsDiscovery(commandName: string, env: NodeJS.ProcessEnv): {
  candidates: string[];
  packageRoots: string[];
} {
  const candidates: string[] = [];
  const packageRoots: string[] = [];
  const appData = env.APPDATA?.trim();
  const userProfile = env.USERPROFILE?.trim() || env.HOME?.trim();
  const pnpmHome = env.PNPM_HOME?.trim();
  const voltaHome = env.VOLTA_HOME?.trim();
  const npmPrefix = env.NPM_CONFIG_PREFIX?.trim();
  const nvmSymlink = env.NVM_SYMLINK?.trim();

  const addBinForms = (root: string) => {
    candidates.push(
      win32.join(root, `${commandName}.exe`),
      win32.join(root, `${commandName}.cmd`),
      win32.join(root, commandName),
    );
  };

  if (appData) {
    const npmRoot = win32.join(appData, "npm");
    addBinForms(npmRoot);
    packageRoots.push(npmRoot);
  }
  if (pnpmHome) addBinForms(pnpmHome);
  if (voltaHome) addBinForms(win32.join(voltaHome, "bin"));
  if (npmPrefix) {
    addBinForms(npmPrefix);
    packageRoots.push(npmPrefix);
  }
  if (nvmSymlink) {
    addBinForms(nvmSymlink);
    packageRoots.push(nvmSymlink);
  }
  if (userProfile) addBinForms(win32.join(userProfile, ".local", "bin"));

  return {
    candidates: uniquePaths(candidates),
    packageRoots: uniquePaths(packageRoots),
  };
}

function packageMarker(target: LocalCliPackageTarget): string {
  return win32.join("node_modules", ...target.packagePath).toLowerCase();
}

function shimEntrypointCandidates(
  shimPath: string,
  target: LocalCliPackageTarget,
  readTextFile: (path: string) => string,
): string[] {
  let content: string;
  try {
    content = readTextFile(shimPath);
  } catch {
    return [];
  }
  if (Buffer.byteLength(content, "utf8") > MAX_SHIM_BYTES || content.includes("\0")) return [];

  const root = win32.dirname(shimPath);
  const marker = packageMarker(target);
  const candidates: string[] = [];
  const patterns = [
    /%~?dp0%?[\\/]([^"\r\n]*?node_modules[\\/][^"\r\n]*?\.(?:mjs|cjs|js))/gi,
    /\$basedir[\\/]([^"'\r\n]*?node_modules[\\/][^"'\r\n]*?\.(?:mjs|cjs|js))/gi,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const relative = match[1]?.trim();
      if (!relative) continue;
      const resolved = win32.resolve(root, relative.replace(/\//g, "\\"));
      const normalized = win32.normalize(resolved).toLowerCase();
      if (!normalized.includes(marker)) continue;
      candidates.push(resolved);
    }
  }
  return uniquePaths(candidates);
}

export function resolveLocalCli(options: ResolveLocalCliOptions): LocalCliLaunch | undefined {
  const commandName = options.commandName.trim();
  if (!commandName) throw new Error("Local CLI command name must not be blank.");

  const platform = options.platform ?? process.platform;
  if (platform !== "win32") {
    return { command: commandName, argsPrefix: [], source: "path-command" };
  }

  const fileExists = options.fileExists ?? existsSync;
  const readTextFile = options.readTextFile ?? ((path: string) => readFileSync(path, "utf8"));
  const env = options.env ?? process.env;
  const defaults = defaultWindowsDiscovery(commandName, env);
  const discovered = options.pathCandidates ?? windowsPathCandidates(commandName);
  const candidates = uniquePaths([
    ...(options.additionalWindowsCandidates ?? []),
    ...defaults.candidates,
    ...discovered,
  ]);
  const packageRoots = uniquePaths([
    ...(options.additionalPackageRoots ?? []),
    ...defaults.packageRoots,
  ]);
  const nativeNames = new Set(
    (options.nativeWindowsBasenames ?? [`${commandName}.exe`]).map((value) => value.toLowerCase()),
  );

  for (const candidate of candidates) {
    if (nativeNames.has(win32.basename(candidate).toLowerCase()) && fileExists(candidate)) {
      return { command: candidate, argsPrefix: [], source: "native-executable" };
    }
  }

  const packageTargets = options.npmPackages ?? [];

  for (const packageBinRoot of packageRoots) {
    for (const target of packageTargets) {
      const packageRoot = win32.join(packageBinRoot, "node_modules", ...target.packagePath);
      for (const entrypoint of target.entrypoints) {
        const entry = win32.join(packageRoot, entrypoint);
        if (fileExists(entry)) {
          return {
            command: options.nodeExecutable ?? process.execPath,
            argsPrefix: [entry],
            source: "npm-package",
          };
        }
      }
    }
  }

  for (const shimPath of candidates) {
    if (!isWindowsShim(shimPath) || !fileExists(shimPath)) continue;

    for (const target of packageTargets) {
      for (const entry of shimEntrypointCandidates(shimPath, target, readTextFile)) {
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
