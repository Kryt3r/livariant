import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

export interface ProjectDiscovery {
  root: string;
  shape: "empty" | "existing";
  entries: string[];
  signals: string[];
  packageName?: string;
  directoryName: string;
}

function isRegularNonSymlink(path: string): boolean {
  try {
    const stats = lstatSync(path);
    return stats.isFile() && !stats.isSymbolicLink();
  } catch {
    return false;
  }
}

export function discoverProject(projectPath: string = process.cwd()): ProjectDiscovery {
  const root = resolve(projectPath);
  const entries = readdirSync(root).filter((entry) => entry !== ".project-brain").sort();
  const signals: string[] = [];
  let packageName: string | undefined;

  const packagePath = resolve(root, "package.json");
  if (existsSync(packagePath)) {
    signals.push("package.json");
    if (!isRegularNonSymlink(packagePath)) {
      signals.push("package.json:unsafe");
    } else {
      try {
        const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: unknown };
        if (typeof parsed.name === "string" && parsed.name.trim().length > 0) {
          packageName = parsed.name.trim();
        }
      } catch {
        signals.push("package.json:unreadable");
      }
    }
  }

  if (existsSync(resolve(root, ".git"))) signals.push("git");
  if (existsSync(resolve(root, "tsconfig.json"))) signals.push("typescript");
  if (existsSync(resolve(root, "README.md"))) signals.push("README.md");
  if (existsSync(resolve(root, "src"))) signals.push("src-directory");
  if (existsSync(resolve(root, "CLAUDE.md"))) signals.push("native-agent-instructions:CLAUDE.md");
  if (existsSync(resolve(root, "AGENTS.md"))) signals.push("native-agent-instructions:AGENTS.md");

  for (const sensitiveName of [".env", ".env.local", "credentials.json"]) {
    if (existsSync(resolve(root, sensitiveName))) {
      signals.push(`sensitive-file-present:${sensitiveName}`);
    }
  }

  return {
    root,
    shape: entries.length === 0 ? "empty" : "existing",
    entries,
    signals,
    packageName,
    directoryName: basename(root),
  };
}
