import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ProjectDiscovery } from "./discovery.js";

export type DiscoveryConfidence = "confirmed" | "strongly_inferred" | "uncertain" | "unknown";
export type DiscoveryEvidenceKind = "project" | "manifest" | "stack" | "tooling" | "documentation" | "agent-guidance" | "repository";

export interface BootstrapDiscoveryEvidence {
  kind: DiscoveryEvidenceKind;
  value: string;
  confidence: Exclude<DiscoveryConfidence, "unknown">;
  provenance: string;
}

export interface BootstrapDiscoveryAttention {
  code: string;
  severity: "info" | "review";
  message: string;
  provenance: string[];
}

export interface BootstrapDiscoveryReport {
  projectRoot: string;
  projectShape: ProjectDiscovery["shape"];
  evidence: BootstrapDiscoveryEvidence[];
  attention: BootstrapDiscoveryAttention[];
  unknowns: string[];
  changesMade: 0;
}

const ROOT_FILE_SIGNALS: ReadonlyArray<readonly [string, DiscoveryEvidenceKind, string]> = [
  ["package.json", "manifest", "Node.js package manifest"],
  ["tsconfig.json", "tooling", "TypeScript configuration"],
  ["pyproject.toml", "manifest", "Python project manifest"],
  ["requirements.txt", "manifest", "Python requirements manifest"],
  ["Cargo.toml", "manifest", "Rust package manifest"],
  ["go.mod", "manifest", "Go module manifest"],
  ["pom.xml", "manifest", "Maven project manifest"],
  ["build.gradle", "manifest", "Gradle build manifest"],
  ["build.gradle.kts", "manifest", "Gradle Kotlin build manifest"],
  ["Dockerfile", "tooling", "Docker build configuration"],
  ["docker-compose.yml", "tooling", "Docker Compose configuration"],
  ["docker-compose.yaml", "tooling", "Docker Compose configuration"],
  ["compose.yml", "tooling", "Compose configuration"],
  ["compose.yaml", "tooling", "Compose configuration"],
  ["README.md", "documentation", "README documentation"],
  ["CLAUDE.md", "agent-guidance", "Claude Code project guidance"],
  ["AGENTS.md", "agent-guidance", "Agent project guidance"],
];

const LOCKFILES: ReadonlyArray<readonly [string, string]> = [
  ["package-lock.json", "npm"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "Yarn"],
  ["bun.lock", "Bun"],
  ["bun.lockb", "Bun"],
];

const DEPENDENCY_STACK_SIGNALS: ReadonlyArray<readonly [string, string]> = [
  ["next", "Next.js"],
  ["react", "React"],
  ["vue", "Vue"],
  ["@angular/core", "Angular"],
  ["svelte", "Svelte"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["@nestjs/core", "NestJS"],
  ["@supabase/supabase-js", "Supabase client"],
  ["typescript", "TypeScript"],
];

function regularNonSymlink(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function directoryNonSymlink(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function addEvidence(target: BootstrapDiscoveryEvidence[], evidence: BootstrapDiscoveryEvidence): void {
  if (!target.some((item) => item.kind === evidence.kind && item.value === evidence.value && item.provenance === evidence.provenance)) {
    target.push(evidence);
  }
}

function inspectPackageJson(root: string, evidence: BootstrapDiscoveryEvidence[], attention: BootstrapDiscoveryAttention[]): void {
  const path = resolve(root, "package.json");
  if (!existsSync(path)) return;
  if (!regularNonSymlink(path)) {
    attention.push({
      code: "discovery-unsafe-package-manifest",
      severity: "review",
      message: "package.json exists but is not a regular non-symlink file; Livariant did not interpret it.",
      provenance: ["package.json"],
    });
    return;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
      scripts?: Record<string, unknown>;
    };
    const dependencies = { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) };
    for (const [dependency, label] of DEPENDENCY_STACK_SIGNALS) {
      if (typeof dependencies[dependency] === "string") {
        addEvidence(evidence, {
          kind: "stack",
          value: label,
          confidence: "strongly_inferred",
          provenance: `package.json dependency:${dependency}`,
        });
      }
    }
    if (parsed.scripts && typeof parsed.scripts.test === "string") {
      addEvidence(evidence, {
        kind: "tooling",
        value: "test script declared",
        confidence: "confirmed",
        provenance: "package.json scripts.test",
      });
    }
    if (parsed.scripts && typeof parsed.scripts.build === "string") {
      addEvidence(evidence, {
        kind: "tooling",
        value: "build script declared",
        confidence: "confirmed",
        provenance: "package.json scripts.build",
      });
    }
  } catch {
    attention.push({
      code: "discovery-unreadable-package-manifest",
      severity: "review",
      message: "package.json could not be parsed as JSON; dependency and script evidence was not inferred.",
      provenance: ["package.json"],
    });
  }
}

export function buildBootstrapDiscovery(project: ProjectDiscovery): BootstrapDiscoveryReport {
  const evidence: BootstrapDiscoveryEvidence[] = [];
  const attention: BootstrapDiscoveryAttention[] = [];
  const root = project.root;

  addEvidence(evidence, {
    kind: "project",
    value: project.shape === "empty" ? "empty workspace" : "existing project workspace",
    confidence: "confirmed",
    provenance: "workspace entries",
  });

  if (existsSync(resolve(root, ".git"))) {
    addEvidence(evidence, { kind: "repository", value: "Git metadata present", confidence: "confirmed", provenance: ".git" });
  }

  for (const [file, kind, value] of ROOT_FILE_SIGNALS) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    if (regularNonSymlink(path)) {
      addEvidence(evidence, { kind, value, confidence: "confirmed", provenance: file });
    } else {
      attention.push({
        code: "discovery-unsafe-high-signal-file",
        severity: "review",
        message: `${file} exists but is not a regular non-symlink file; Livariant did not interpret it.`,
        provenance: [file],
      });
    }
  }

  for (const directory of ["docs", "src", "test", "tests"]) {
    const path = resolve(root, directory);
    if (existsSync(path) && directoryNonSymlink(path)) {
      addEvidence(evidence, {
        kind: directory === "docs" ? "documentation" : "project",
        value: directory === "docs" ? "documentation directory present" : `${directory} directory present`,
        confidence: "confirmed",
        provenance: directory,
      });
    }
  }

  const lockfiles = LOCKFILES.filter(([file]) => regularNonSymlink(resolve(root, file)));
  for (const [file, manager] of lockfiles) {
    addEvidence(evidence, { kind: "tooling", value: `${manager} lockfile`, confidence: "confirmed", provenance: file });
  }
  if (new Set(lockfiles.map(([, manager]) => manager)).size > 1) {
    attention.push({
      code: "discovery-multiple-node-lockfiles",
      severity: "review",
      message: "Multiple Node package-manager lockfiles are present; the active package-manager convention is uncertain.",
      provenance: lockfiles.map(([file]) => file),
    });
  }

  for (const sensitiveName of [".env", ".env.local", "credentials.json"]) {
    if (existsSync(resolve(root, sensitiveName))) {
      attention.push({
        code: "discovery-sensitive-file-present",
        severity: "review",
        message: `${sensitiveName} is present. Discovery records presence only and does not read or classify its contents.`,
        provenance: [sensitiveName],
      });
    }
  }

  inspectPackageJson(root, evidence, attention);

  const unknowns = project.shape === "empty"
    ? ["project purpose", "project goals", "preferred technical direction"]
    : ["project purpose", "current product direction", "non-negotiable project rules"];

  evidence.sort((a, b) => `${a.kind}:${a.value}:${a.provenance}`.localeCompare(`${b.kind}:${b.value}:${b.provenance}`));
  attention.sort((a, b) => `${a.code}:${a.provenance.join(",")}`.localeCompare(`${b.code}:${b.provenance.join(",")}`));

  return {
    projectRoot: root,
    projectShape: project.shape,
    evidence,
    attention,
    unknowns,
    changesMade: 0,
  };
}
