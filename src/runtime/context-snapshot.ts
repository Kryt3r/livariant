import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { parseDecisionsMarkdown } from "../project-brain/decisions.js";
import { FRAMEWORK_VERSION } from "../lifecycle/state.js";
import { getStatus } from "./index.js";
import { runDoctor, type DoctorFinding } from "./doctor.js";

const SNAPSHOT_SCHEMA_VERSION = 1;
const BASELINE_DOMAIN = "livariant:project-context-baseline:v1";
const MANAGED_INPUTS = ["decisions.md", "goals.md", "knowledge.md", "metadata.json", "project.md"] as const;

type ManagedInputName = typeof MANAGED_INPUTS[number];

export interface ProjectContextItem {
  value: string;
  authorityClass: "canonical-project" | "unresolved-project";
}

export interface ProjectContextSnapshotContext {
  projectIdentity: ProjectContextItem[];
  confirmedGoals: ProjectContextItem[];
  activeDecisions: ProjectContextItem[];
  knownFacts: ProjectContextItem[];
  unresolvedUnknowns: ProjectContextItem[];
}

export interface ProjectContextBaseline {
  algorithm: "sha256";
  domain: typeof BASELINE_DOMAIN;
  digest: string;
  schemaVersion: number;
}

export interface ProjectContextProjectionMetadata {
  derived: true;
  mutationAuthorization: false;
  returnedCopiesTrusted: false;
  materialActionsRequireRevalidation: true;
}

interface SnapshotBase {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  generatedAt: string;
  frameworkVersion: string;
  projectLocator: string;
  stableProjectIdentity: null;
  projection: ProjectContextProjectionMetadata;
  changesMade: 0;
}

export interface ClearProjectContextSnapshot extends SnapshotBase {
  safetyState: "clear";
  baseline: ProjectContextBaseline;
  context: ProjectContextSnapshotContext;
  findings: DoctorFinding[];
}

export interface BlockedProjectContextSnapshot extends SnapshotBase {
  safetyState: "blocked";
  baseline: ProjectContextBaseline | null;
  context: null;
  findings: DoctorFinding[];
}

export type ProjectContextSnapshot = ClearProjectContextSnapshot | BlockedProjectContextSnapshot;

export interface ProjectContextSnapshotBuildOptions {
  beforeRevalidate?: () => void | Promise<void>;
}

function bullets(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

function beforeFirstSubheading(markdown: string): string {
  const index = markdown.search(/\n##\s/);
  return index < 0 ? markdown : markdown.slice(0, index);
}

function frame(hash: ReturnType<typeof createHash>, label: string, bytes: Buffer): void {
  const labelBytes = Buffer.from(label, "utf8");
  const lengths = Buffer.allocUnsafe(8);
  lengths.writeUInt32BE(labelBytes.length, 0);
  lengths.writeUInt32BE(bytes.length, 4);
  hash.update(lengths);
  hash.update(labelBytes);
  hash.update(bytes);
}

function baselineFor(inputs: ReadonlyMap<ManagedInputName, Buffer>, schemaVersion: number): ProjectContextBaseline {
  const hash = createHash("sha256");
  frame(hash, "domain", Buffer.from(BASELINE_DOMAIN, "utf8"));
  frame(hash, "schema-version", Buffer.from(String(schemaVersion), "utf8"));
  for (const name of MANAGED_INPUTS) frame(hash, `managed:${name}`, inputs.get(name)!);
  return {
    algorithm: "sha256",
    domain: BASELINE_DOMAIN,
    digest: hash.digest("hex"),
    schemaVersion,
  };
}

async function readManagedInputs(brainPath: string): Promise<Map<ManagedInputName, Buffer>> {
  const entries = await Promise.all(
    MANAGED_INPUTS.map(async (name) => [name, await readFile(resolve(brainPath, name))] as const),
  );
  return new Map(entries);
}

function equalInputs(left: ReadonlyMap<ManagedInputName, Buffer>, right: ReadonlyMap<ManagedInputName, Buffer>): boolean {
  return MANAGED_INPUTS.every((name) => left.get(name)!.equals(right.get(name)!));
}

function base(projectLocator: string): SnapshotBase {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    frameworkVersion: FRAMEWORK_VERSION,
    projectLocator,
    stableProjectIdentity: null,
    projection: {
      derived: true,
      mutationAuthorization: false,
      returnedCopiesTrusted: false,
      materialActionsRequireRevalidation: true,
    },
    changesMade: 0,
  };
}

function blocked(projectLocator: string, findings: DoctorFinding[], baseline: ProjectContextBaseline | null = null): BlockedProjectContextSnapshot {
  return {
    ...base(projectLocator),
    safetyState: "blocked",
    baseline,
    context: null,
    findings,
  };
}

function parseContext(inputs: ReadonlyMap<ManagedInputName, Buffer>): ProjectContextSnapshotContext {
  const projectDoc = inputs.get("project.md")!.toString("utf8");
  const goals = inputs.get("goals.md")!.toString("utf8");
  const decisions = inputs.get("decisions.md")!.toString("utf8");
  const knowledge = inputs.get("knowledge.md")!.toString("utf8");
  const parsedDecisions = parseDecisionsMarkdown(decisions);
  if (parsedDecisions.issues.length > 0) {
    throw new Error(`ambiguous decision history: ${parsedDecisions.issues.join("; ")}`);
  }

  const marker = "## Known unknowns";
  const markerIndex = knowledge.indexOf(marker);
  const evidencePart = markerIndex >= 0 ? knowledge.slice(0, markerIndex) : knowledge;
  const unknownPart = markerIndex >= 0 ? knowledge.slice(markerIndex) : "";
  const canonical = (values: string[]): ProjectContextItem[] => values.map((value) => ({ value, authorityClass: "canonical-project" }));
  const unknown = (values: string[]): ProjectContextItem[] => values.map((value) => ({ value, authorityClass: "unresolved-project" }));

  return {
    projectIdentity: canonical(bullets(projectDoc)),
    confirmedGoals: canonical(bullets(beforeFirstSubheading(goals))),
    activeDecisions: canonical(parsedDecisions.records.filter((record) => record.status === "active").map((record) => record.text)),
    knownFacts: canonical(bullets(evidencePart)),
    unresolvedUnknowns: unknown(bullets(unknownPart)),
  };
}

export async function buildProjectContextSnapshot(
  projectPath: string = process.cwd(),
  options: ProjectContextSnapshotBuildOptions = {},
): Promise<ProjectContextSnapshot> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const inspection = await store.inspect();

  if (inspection.health !== "valid") {
    const doctor = await runDoctor(project.root);
    return blocked(project.root, doctor.findings);
  }

  const statusBefore = await getStatus(project.root);
  const doctorBefore = await runDoctor(project.root);
  if (statusBefore.lifecycle !== "initialized" || doctorBefore.state !== "healthy") {
    return blocked(project.root, doctorBefore.findings);
  }

  let captured: Map<ManagedInputName, Buffer>;
  let context: ProjectContextSnapshotContext;
  let baseline: ProjectContextBaseline;
  try {
    captured = await readManagedInputs(inspection.path);
    const metadata = JSON.parse(captured.get("metadata.json")!.toString("utf8")) as { projectBrain?: { schemaVersion?: unknown } };
    const schemaVersion = metadata.projectBrain?.schemaVersion;
    if (typeof schemaVersion !== "number") {
      return blocked(project.root, [{ code: "snapshot-metadata-invalid", severity: "error", message: "Project Brain schema version is unavailable for snapshot baseline construction." }]);
    }
    context = parseContext(captured);
    baseline = baselineFor(captured, schemaVersion);
  } catch (error) {
    return blocked(project.root, [{ code: "snapshot-read-invalid", severity: "error", message: `Project context cannot be derived safely: ${error instanceof Error ? error.message : "unknown snapshot read failure"}` }]);
  }

  await options.beforeRevalidate?.();

  const inspectionAfter = await store.inspect();
  if (inspectionAfter.health !== "valid") {
    const doctor = await runDoctor(project.root);
    return blocked(project.root, doctor.findings, baseline);
  }

  const recaptured = await readManagedInputs(inspectionAfter.path);
  if (!equalInputs(captured, recaptured)) {
    return blocked(project.root, [{ code: "snapshot-concurrent-change", severity: "error", message: "Project Brain changed while the context snapshot was being built. Retry from a fresh baseline." }], baseline);
  }

  const statusAfter = await getStatus(project.root);
  const doctorAfter = await runDoctor(project.root);
  if (statusAfter.lifecycle !== "initialized" || doctorAfter.state !== "healthy") {
    return blocked(project.root, doctorAfter.findings, baseline);
  }

  return {
    ...base(project.root),
    safetyState: "clear",
    baseline,
    context,
    findings: doctorAfter.findings,
  };
}
