import { existsSync, lstatSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

export type AdoptionSurfaceKind =
  | "agent-guidance"
  | "project-rules"
  | "architecture"
  | "decision-record"
  | "documentation"
  | "ci"
  | "tests"
  | "tooling";

export interface AdoptionSurfaceEvidence {
  kind: AdoptionSurfaceKind;
  path: string;
  trust: "evidence-only";
}

export interface AdoptionInventoryAttention {
  code: string;
  severity: "review";
  message: string;
  provenance: string[];
}

export interface AdoptionSurfaceInventory {
  surfaces: AdoptionSurfaceEvidence[];
  attention: AdoptionInventoryAttention[];
  boundaries: {
    evidenceIsProjectTruth: false;
    contentsInterpreted: false;
    grantsAuthority: false;
    changesMade: 0;
  };
}

const ROOT_SURFACES: ReadonlyArray<readonly [string, AdoptionSurfaceKind]> = [
  ["AGENTS.md", "agent-guidance"],
  ["CLAUDE.md", "agent-guidance"],
  ["CONTRIBUTING.md", "project-rules"],
  ["DEVELOPMENT.md", "project-rules"],
  ["GOVERNANCE.md", "project-rules"],
  ["SECURITY.md", "project-rules"],
  ["ARCHITECTURE.md", "architecture"],
  ["DECISIONS.md", "decision-record"],
  ["ADR.md", "decision-record"],
  ["README.md", "documentation"],
  [".gitlab-ci.yml", "ci"],
  ["azure-pipelines.yml", "ci"],
  ["Jenkinsfile", "ci"],
  [".circleci/config.yml", "ci"],
  [".github/CODEOWNERS", "project-rules"],
  ["package.json", "tooling"],
  ["pyproject.toml", "tooling"],
  ["Cargo.toml", "tooling"],
  ["go.mod", "tooling"],
  ["pom.xml", "tooling"],
  ["build.gradle", "tooling"],
  ["build.gradle.kts", "tooling"],
  ["Makefile", "tooling"],
  ["tsconfig.json", "tooling"],
];

function toProjectPath(root: string, absolutePath: string): string {
  return relative(root, absolutePath).replaceAll("\\", "/");
}

function inspectRegularFile(root: string, projectPath: string): "regular" | "unsafe" | "missing" {
  const path = resolve(root, projectPath);
  if (!existsSync(path)) return "missing";
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink() ? "regular" : "unsafe";
  } catch {
    return "unsafe";
  }
}

function inspectDirectory(root: string, projectPath: string): "directory" | "unsafe" | "missing" {
  const path = resolve(root, projectPath);
  if (!existsSync(path)) return "missing";
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink() ? "directory" : "unsafe";
  } catch {
    return "unsafe";
  }
}

function addSurface(surfaces: AdoptionSurfaceEvidence[], kind: AdoptionSurfaceKind, path: string): void {
  if (!surfaces.some((surface) => surface.kind === kind && surface.path === path)) {
    surfaces.push({ kind, path, trust: "evidence-only" });
  }
}

function unsafeAttention(attention: AdoptionInventoryAttention[], projectPath: string): void {
  attention.push({
    code: "adoption-unsafe-surface-path",
    severity: "review",
    message: `${projectPath} exists but is not a regular non-symlink adoption surface; Livariant did not interpret it.`,
    provenance: [projectPath],
  });
}

function classifyDocumentationFile(fileName: string): AdoptionSurfaceKind {
  const lower = fileName.toLowerCase();
  if (/(^|[-_.])(architecture|architectural|design|system-design)([-_.]|$)/.test(lower)) return "architecture";
  if (/(^|[-_.])(adr|decision|decisions|decision-log)([-_.]|$)/.test(lower)) return "decision-record";
  if (lower === "agents.md" || lower === "claude.md") return "agent-guidance";
  if (["contributing.md", "development.md", "governance.md", "security.md"].includes(lower)) return "project-rules";
  return "documentation";
}

function inspectDocsDirectory(root: string, surfaces: AdoptionSurfaceEvidence[], attention: AdoptionInventoryAttention[]): void {
  const state = inspectDirectory(root, "docs");
  if (state === "missing") return;
  if (state === "unsafe") {
    unsafeAttention(attention, "docs");
    return;
  }

  const docsPath = resolve(root, "docs");
  let entries;
  try {
    entries = readdirSync(docsPath, { withFileTypes: true });
  } catch {
    attention.push({
      code: "adoption-unreadable-surface-directory",
      severity: "review",
      message: "docs exists but could not be enumerated; Livariant did not infer its contents.",
      provenance: ["docs"],
    });
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;
    const projectPath = toProjectPath(root, resolve(docsPath, entry.name));
    if (!/\.(md|mdx|txt)$/i.test(entry.name)) continue;
    if (inspectRegularFile(root, projectPath) === "regular") {
      addSurface(surfaces, classifyDocumentationFile(entry.name), projectPath);
    } else {
      unsafeAttention(attention, projectPath);
    }
  }
}

function inspectGithubWorkflows(root: string, surfaces: AdoptionSurfaceEvidence[], attention: AdoptionInventoryAttention[]): void {
  const projectDirectory = ".github/workflows";
  const state = inspectDirectory(root, projectDirectory);
  if (state === "missing") return;
  if (state === "unsafe") {
    unsafeAttention(attention, projectDirectory);
    return;
  }

  const workflowRoot = resolve(root, projectDirectory);
  let entries;
  try {
    entries = readdirSync(workflowRoot, { withFileTypes: true });
  } catch {
    attention.push({
      code: "adoption-unreadable-surface-directory",
      severity: "review",
      message: ".github/workflows exists but could not be enumerated; Livariant did not infer its contents.",
      provenance: [projectDirectory],
    });
    return;
  }

  for (const entry of entries) {
    if (!/\.ya?ml$/i.test(entry.name)) continue;
    const projectPath = toProjectPath(root, resolve(workflowRoot, entry.name));
    if (inspectRegularFile(root, projectPath) === "regular") {
      addSurface(surfaces, "ci", projectPath);
    } else {
      unsafeAttention(attention, projectPath);
    }
  }
}

function inspectTestDirectories(root: string, surfaces: AdoptionSurfaceEvidence[], attention: AdoptionInventoryAttention[]): void {
  for (const projectPath of ["test", "tests", "__tests__"]) {
    const state = inspectDirectory(root, projectPath);
    if (state === "directory") {
      addSurface(surfaces, "tests", projectPath);
    } else if (state === "unsafe") {
      unsafeAttention(attention, projectPath);
    }
  }
}

function addAmbiguityAttention(surfaces: AdoptionSurfaceEvidence[], attention: AdoptionInventoryAttention[]): void {
  const agentGuidance = surfaces.filter((surface) => surface.kind === "agent-guidance").map((surface) => surface.path);
  if (agentGuidance.length > 1) {
    attention.push({
      code: "adoption-multiple-agent-guidance-surfaces",
      severity: "review",
      message: "Multiple project-local agent-guidance surfaces are present. Livariant does not assume precedence, equivalence or canonical truth between them.",
      provenance: agentGuidance,
    });
  }

  const ciPaths = surfaces.filter((surface) => surface.kind === "ci").map((surface) => surface.path);
  const ciFamilies = new Set(ciPaths.map((path) => {
    if (path.startsWith(".github/workflows/")) return "github-actions";
    if (path === ".gitlab-ci.yml") return "gitlab-ci";
    if (path === ".circleci/config.yml") return "circleci";
    if (path === "azure-pipelines.yml") return "azure-pipelines";
    if (path === "Jenkinsfile") return "jenkins";
    return path;
  }));
  if (ciFamilies.size > 1) {
    attention.push({
      code: "adoption-multiple-ci-systems",
      severity: "review",
      message: "Multiple CI systems are present. Livariant records them as evidence and does not guess which one is authoritative.",
      provenance: ciPaths,
    });
  }
}

export function buildAdoptionSurfaceInventory(root: string): AdoptionSurfaceInventory {
  const surfaces: AdoptionSurfaceEvidence[] = [];
  const attention: AdoptionInventoryAttention[] = [];

  for (const [projectPath, kind] of ROOT_SURFACES) {
    const state = inspectRegularFile(root, projectPath);
    if (state === "regular") addSurface(surfaces, kind, projectPath);
    else if (state === "unsafe") unsafeAttention(attention, projectPath);
  }

  inspectDocsDirectory(root, surfaces, attention);
  inspectGithubWorkflows(root, surfaces, attention);
  inspectTestDirectories(root, surfaces, attention);
  addAmbiguityAttention(surfaces, attention);

  surfaces.sort((a, b) => `${a.kind}:${a.path}`.localeCompare(`${b.kind}:${b.path}`));
  attention.sort((a, b) => `${a.code}:${a.provenance.join(",")}`.localeCompare(`${b.code}:${b.provenance.join(",")}`));

  return {
    surfaces,
    attention,
    boundaries: {
      evidenceIsProjectTruth: false,
      contentsInterpreted: false,
      grantsAuthority: false,
      changesMade: 0,
    },
  };
}
