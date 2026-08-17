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

  const result: ProjectFinding[] = [];
  const lockfiles = LOCKFILES.filter((name) => isRegularNonSymlinkFile(resolve(root, name)));
  if (lockfiles.length === 0) {
    result.push(finding({
      ruleId: "LV-FND-QUAL-003",
      category: "quality",
      severity: "medium",
      confidence: "strong",
      title: "Node dependency resolution is not locked",
      explanation: "A package.json is present but Livariant found no supported Node lockfile. Fresh installs can therefore resolve different dependency versions over time or across machines.",
      evidence: [{ path: "package.json", detail: "manifest present while no supported Node lockfile is present" }],
      nextStep: "If this project installs Node dependencies, generate and commit the lockfile for the package manager the project intentionally uses.",
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

  const scripts = (parsed as { scripts?: unknown }).scripts;
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

function inspectSensitiveRepositoryRoot(root: string): ProjectFinding[] {
  if (!existsSync(resolve(root, ".git"))) return [];
  const present = SENSITIVE_ROOT_FILES.filter((name) => existsSync(resolve(root, name)));
  if (present.length === 0) return [];

  const ignorePath = resolve(root, ".gitignore");
  const ignoreState = existsSync(ignorePath) ? fileState(ignorePath) : undefined;
  if (ignoreState?.regular) return [];

  return [finding({
    ruleId: "LV-FND-SEC-003",
    category: "security",
    severity: "high",
    confidence: "moderate",
    title: "Sensitive root file has no visible repository-local ignore guard",
    explanation: "A commonly sensitive file is present in a Git workspace and Livariant found no regular project-root .gitignore file. This does not prove the sensitive file is committed or exposed, but it removes a common repository-local guard against accidental inclusion.",
    evidence: [
      ...present.map((path) => ({ path, detail: "sensitive filename present; file contents were not read" })),
      { path: ".gitignore", detail: ignoreState ? "present but not a regular non-symlink file" : "not present" },
    ],
    nextStep: "Verify whether the sensitive file is tracked or staged, confirm the repository's intended ignore policy, and rotate any secret that may already have been exposed.",
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
  const rootState = fileState(root);
  if (!rootState.regular) {
    try {
      const stat = lstatSync(root);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Project findings require a regular local project directory.");
    } catch (error) {
      if (error instanceof Error && error.message === "Project findings require a regular local project directory.") throw error;
      throw new Error("Project findings require an existing local project directory.");
    }
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
      "No finding grants mutation, Runtime, or Release Authority.",
      "Absence of findings does not prove absence of vulnerabilities or quality defects.",
    ],
    changesMade: 0,
  };
}
