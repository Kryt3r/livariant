import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, extname, join, win32 } from "node:path";

export interface CodexCommandResolution {
  command: string;
  source: "path-command" | "native-executable" | "npm-native-package";
  shimPath?: string;
}

export interface CodexCommandResolutionOptions {
  platform?: NodeJS.Platform;
  arch?: string;
  pathCandidates?: readonly string[];
  fileExists?: (path: string) => boolean;
}

function windowsPathCandidates(): string[] {
  const result = spawnSync("where.exe", ["codex"], {
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

function windowsTarget(arch: string): { packageName: string; triple: string } | undefined {
  if (arch === "x64") return { packageName: "codex-win32-x64", triple: "x86_64-pc-windows-msvc" };
  if (arch === "arm64") return { packageName: "codex-win32-arm64", triple: "aarch64-pc-windows-msvc" };
  return undefined;
}

/**
 * Resolves the actual Codex executable without invoking an npm `.cmd` shim.
 *
 * The official `@openai/codex` package exposes `bin/codex.js`, which in turn
 * launches the platform-specific native package. npm commonly exposes that
 * entrypoint as `codex.cmd` on Windows. Livariant deliberately avoids routing
 * that shim through cmd.exe; for standard npm global layouts it derives the
 * native optional-dependency binary and launches that executable directly.
 */
export function resolveCodexCommand(options: CodexCommandResolutionOptions = {}): CodexCommandResolution | undefined {
  const platform = options.platform ?? process.platform;
  if (platform !== "win32") return { command: "codex", source: "path-command" };

  const fileExists = options.fileExists ?? existsSync;
  const candidates = options.pathCandidates ?? windowsPathCandidates();
  for (const candidate of candidates) {
    if (extname(candidate).toLowerCase() === ".exe" && fileExists(candidate)) {
      return { command: candidate, source: "native-executable" };
    }
  }

  const target = windowsTarget(options.arch ?? process.arch);
  if (!target) return undefined;

  for (const shimPath of candidates) {
    if (extname(shimPath).toLowerCase() !== ".cmd") continue;
    const binRoot = dirname(shimPath);
    const packageRoots = [
      win32.join(binRoot, "node_modules", "@openai", target.packageName),
      win32.join(binRoot, "node_modules", "@openai", "codex", "node_modules", "@openai", target.packageName),
      win32.join(binRoot, "node_modules", "@openai", "codex"),
    ];
    for (const packageRoot of packageRoots) {
      const native = win32.join(packageRoot, "vendor", target.triple, "bin", "codex.exe");
      if (fileExists(native)) {
        return { command: native, source: "npm-native-package", shimPath };
      }
    }
  }

  return undefined;
}
