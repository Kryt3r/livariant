import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ProjectFindingCategory = "security" | "quality";
export type ProjectFindingSeverity = "critical" | "high" | "medium" | "low";
export type ProjectFindingConfidence = "strong" | "moderate";

export interface ProjectFindingEvidence {
  path: string;
  detail: string;
}

export interface ProjectFinding {
  id: string;
  ruleId: string;
  category: ProjectFindingCategory;
  severity: ProjectFindingSeverity;
  confidence: ProjectFindingConfidence;
  title: string;
  explanation: string;
  evidence: ProjectFindingEvidence[];
  nextStep: string;
}

export interface ProjectFindingsReport {
  schemaVersion: 1;
  projectRoot: string;
  state: "clear" | "findings-present";
  findings: ProjectFinding[];
  summary: Record<ProjectFindingSeverity, number>;
  limitations: string[];
  changesMade: 0;
}

const MAX_PACKAGE_BYTES = 256 * 1024;
const MAX_AGENT_GUIDANCE_BYTES = 128 * 1024;
const MAX_GITIGNORE_BYTES = 128 * 1024;
const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"] as const;
const SENSITIVE_ROOT_FILES = [".env", ".env.local", "credentials.json"] as const;
const severityRank: Record<ProjectFindingSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function fileState(path: string): { regular: boolean; symlink: boolean; size?: number } {
  try {
    const stat = lstatSync(path);
    return { regular: stat.isFile() && !stat.isSymbolicLink(), symlink: stat.isSymbolicLink(), size: stat.size };
  } catch {
    return { regular: false, symlink: false };
  }
}

function isRegularNonSymlinkFile(path: string, maxBytes?: number): boolean {
  const state = fileState(path);
  return state.regular && (maxBytes === undefined || (state.size ?? Number.POSITIVE_INFINITY) <= maxBytes);
}

function isRegularNonSymlinkDirectory(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function stableFindingId(ruleId: string, evidence: ProjectFindingEvidence[]): string {
  const canonicalEvidence = evidence
    .map((item) => `${item.path}:${item.detail}`)
    .sort()
    .join("|");
  return createHash("sha256").update(`${ruleId}|${canonicalEvidence}`, "utf8").digest("hex").slice(0, 16);
}

function finding(input: Omit<ProjectFinding, "id">): ProjectFinding {
  return { ...input, id: stableFindingId(input.ruleId, input.evidence) };
}

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hasDeclaredInstallDependencies(parsed: Record<string, unknown>): boolean {
  for (const key of ["dependencies", "devDependencies", "optionalDependencies"] as const) {
    const value = parsed[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) return true;
  }
  return false;
}

function inspectPackageManifest(root: string): ProjectFinding[] {
  const packagePath = resolve(root, "package.json");
  if (!existsSync(packagePath)) return [];

  const packageState = fileState(packagePath);
  if (!packageState.regular) {
    return [finding({
      ruleId: "LV-FND-SEC-001",
      category: "security",
      severity: "high",
      confidence: "strong",
      title: "Package manifest is not a regular local file",
      explanation: "Livariant refuses to interpret package.json because it is a directory, symlink, or another unsupported file type. A manifest that resolves outside the expected project-local file boundary can make project inspection and tooling reason about different bytes than the user expects.",
      evidence: [{ path: "package.json", detail: packageState.symlink ? "symbolic link" : "not a regular file" }],
      nextStep: "Replace the manifest path with the intended regular project-local package.json file, then inspect the project again.",
    })];
  }

  if ((packageState.size ?? 0) > MAX_PACKAGE_BYTES) {
    return [finding({
      ruleId: "LV-FND-QUAL-005",
      category: "quality",
      severity: "high",
      confidence: "strong",
      title: "Package manifest exceeds the bounded inspection limit",
      explanation: `package.json is larger than Livariant's v1 inspection ceiling of ${MAX_PACKAGE_BYTES} bytes. Livariant did not read or interpret the file, so package-script and dependency findings would otherwise be incomplete.`,
      evidence: [{ path: "package.json", detail: `size=${String(packageState.size)} bytes; inspection-limit=${MAX_PACKAGE_BYTES} bytes` }],
      nextStep: "Review why package.json is unusually large and reduce it or inspect it separately before relying on findings that require manifest interpretation.",
    })];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(packagePath, "utf8"));
  } catch {
    return [finding({
      ruleId: "LV-FND-QUAL-001",
      category: "quality",
      severity: "high",
      confidence: "strong",
      title: "Package manifest cannot be parsed",
      explanation: "package.json exists but cannot be parsed as JSON. Dependency, script, packaging, and project identity checks therefore cannot reliably use the manifest.",
      evidence: [{ path: "package.json", detail: "JSON parsing failed" }],
      nextStep: "Validate and repair package.json before relying on package, dependency, or script automation.",
    })];
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return [finding({
      ruleId: "LV-FND-QUAL-001",
      category: "quality",
      severity: "high",
      confidence: "strong",
      title: "Package manifest has an unsupported JSON shape",
      explanation: "package.json parsed successfully but its top-level JSON value is not an object, so normal Node package metadata cannot be interpreted reliably.",
      evidence: [{ path: "package.json", detail: "top-level JSON value is not an object" }],
      nextStep: "Restore package.json to a normal object-shaped Node package manifest.",
    })];
  }

  const manifest = parsed as Record<string, unknown>;
  const result: ProjectFinding[] = [];
  const lockfiles = LOCKFILES.filter((name) => isRegularNonSymlinkFile(resolve(root, name)));
  if (lockfiles.length === 0 && hasDeclaredInstallDependencies(manifest)) {
    result.push(finding({
      ruleId: "LV-FND-QUAL-003",
      category: "quality",
      severity: "medium",
      confidence: "strong",
      title: "Declared Node dependencies are not locked",
      explanation: "package.json declares installable dependencies but Livariant found no supported Node lockfile. Fresh installs can therefore resolve different dependency versions over time or across machines.",
      evidence: [{ path: "package.json", detail: "installable dependencies declared while no supported Node lockfile is present" }],
      nextStep: "Generate and commit the lockfile for the package manager the project intentionally uses, unless the project has an explicit documented reason not to lock installations.",
    }));
  } else if (lockfiles.length > 1) {
    result.push(finding({
      ruleId: "LV-FND-QUAL-002",
      category: "quality",
      severity: "medium",
      confidence: "strong",
      title: "Multiple Node package-manager lockfiles are present",
      explanation: "Multiple package-manager lockfiles make the intended dependency resolution path ambiguous and can produce different installations across tools or contributors.",
      evidence: lockfiles.map((path) => ({ path, detail: "package-manager lockfile present" })),
      nextStep: "Confirm the intended package manager and remove stale lockfiles only after verifying they are not part of an intentional multi-tool workflow.",
    }));
  }

  const scripts = manifest.scripts;
  if (typeof scripts === "object" && scripts !== null && !Array.isArray(scripts)) {
    for (const [name, command] of Object.entries(scripts as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) {
      if (typeof command !== "string") continue;
      const detectors: string[] = [];
      if (/(?:curl|wget)\b[^|\r\n]{0,240}\|\s*(?:sh|bash)\b/iu.test(command)) detectors.push("remote download piped directly to a shell");
      if (/(?:iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^\r\n]{0,240}(?:\||;)\s*(?:iex|Invoke-Expression)\b/iu.test(command)) detectors.push("remote PowerShell content passed directly to Invoke-Expression");
      if (detectors.length === 0) continue;

      result.push(finding({
        ruleId: "LV-FND-SEC-002",
        category: "security",
        severity: "high",
        confidence: "strong",
        title: `Package script '${name}' executes downloaded content directly`,
        explanation: "The script contains a deterministic download-and-immediate-execution pattern. If the remote content or delivery path is compromised, the downloaded bytes execute with the privileges of the package script without a local review boundary.",
        evidence: detectors.map((detail) => ({ path: `package.json#scripts.${name}`, detail })),
        nextStep: "Pin and verify the downloaded artifact or script before execution, and avoid directly piping remote content into a shell or expression evaluator.",
      }));
    }
  }

  return result;
}

function explicitlyIgnoredSensitiveFiles(root: string, present: readonly string[]): Set<string> {
  const ignorePath = resolve(root, ".gitignore");
  if (!isRegularNonSymlinkFile(ignorePath, MAX_GITIGNORE_BYTES)) return new Set();

  const ignored = new Set<string>();
  const lines = readFileSync(ignorePath, "utf8").split(/\r?\n/u);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    const normalized = line.startsWith("/") ? line.slice(1) : line;
    for (const name of present) {
      if (normalized === name) ignored.add(name);
    }
  }
  return ignored;
}

function inspectSensitiveRepositoryRoot(root: string): ProjectFinding[] {
  if (!isRegularNonSymlinkDirectory(resolve(root, ".git"))) return [];
  const present = SENSITIVE_ROOT_FILES.filter((name) => isRegularNonSymlinkFile(resolve(root, name)));
  if (present.length === 0) return [];

  const explicitlyIgnored = explicitlyIgnoredSensitiveFiles(root, present);
  const unguarded = present.filter((name) => !explicitlyIgnored.has(name));
  if (unguarded.length === 0) return [];

  const ignorePath = resolve(root, ".gitignore");
  const ignoreState = existsSync(ignorePath) ? fileState(ignorePath) : undefined;
  const ignoreDetail = !ignoreState
    ? "not present"
    : !ignoreState.regular
      ? "present but not a regular non-symlink file"
      : (ignoreState.size ?? 0) > MAX_GITIGNORE_BYTES
        ? `exceeds bounded inspection limit of ${MAX_GITIGNORE_BYTES} bytes`
        : "does not explicitly ignore every reported sensitive root file";

  return [finding({
    ruleId: "LV-FND-SEC-003",
    category: "security",
    severity: "high",
    confidence: "moderate",
    title: "Sensitive root file lacks an explicit repository-local ignore guard",
    explanation: "A commonly sensitive regular file is present in a Git workspace and Livariant could not confirm an exact root-level .gitignore entry for every reported file. This does not prove the file is committed or exposed; v1 intentionally recognizes only simple exact ignore entries instead of pretending to implement the full gitignore language.",
    evidence: [
      ...unguarded.map((path) => ({ path, detail: "sensitive filename present; file contents were not read; no exact root .gitignore entry confirmed" })),
      { path: ".gitignore", detail: ignoreDetail },
    ],
    nextStep: "Verify whether each reported file is tracked or staged, add an intentional ignore rule where appropriate, and rotate any secret that may already have been exposed.",
  })];
}

function inspectAgentGuidance(root: string): ProjectFinding[] {
  const claudePath = resolve(root, "CLAUDE.md");
  const agentsPath = resolve(root, "AGENTS.md");
  if (!existsSync(claudePath) || !existsSync(agentsPath)) return [];
  if (!isRegularNonSymlinkFile(claudePath, MAX_AGENT_GUIDANCE_BYTES) || !isRegularNonSymlinkFile(agentsPath, MAX_AGENT_GUIDANCE_BYTES)) return [];

  const claudeHash = hashFile(claudePath);
  const agentsHash = hashFile(agentsPath);
  if (claudeHash === agentsHash) return [];

  return [finding({
    ruleId: "LV-FND-QUAL-004",
    category: "quality",
    severity: "medium",
    confidence: "moderate",
    title: "Native agent instruction files differ",
    explanation: "CLAUDE.md and AGENTS.md are both present but contain different bytes. This can be intentional, but different providers may otherwise receive conflicting project rules and produce inconsistent behavior.",
    evidence: [
      { path: "CLAUDE.md", detail: `sha256:${claudeHash}` },
      { path: "AGENTS.md", detail: `sha256:${agentsHash}` },
    ],
    nextStep: "Review whether the differences are intentional. Keep shared non-negotiable project rules aligned across provider-specific instruction files.",
  })];
}

export function scanProjectFindings(projectPath: string = process.cwd()): ProjectFindingsReport {
  const root = resolve(projectPath);
  if (!isRegularNonSymlinkDirectory(root)) {
    throw new Error("Project findings require an existing regular non-symlink local project directory.");
  }

  const findings = [
    ...inspectPackageManifest(root),
    ...inspectSensitiveRepositoryRoot(root),
    ...inspectAgentGuidance(root),
  ].sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.ruleId.localeCompare(b.ruleId) || a.id.localeCompare(b.id));

  const summary: Record<ProjectFindingSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const item of findings) summary[item.severity] += 1;

  return {
    schemaVersion: 1,
    projectRoot: root,
    state: findings.length === 0 ? "clear" : "findings-present",
    findings,
    summary,
    limitations: [
      "v1 uses a deliberately small deterministic high-signal rule set and is not a complete security audit.",
      "The sensitive-file rule recognizes only exact root-level .gitignore entries, not the full gitignore pattern language.",
      "No finding grants mutation, Runtime, or Release Authority.",
      "Absence of findings does not prove absence of vulnerabilities or quality defects.",
    ],
    changesMade: 0,
  };
}
