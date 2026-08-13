import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { FRAMEWORK_VERSION } from "../lifecycle/state.js";
import { runDoctor, type DoctorFinding } from "./doctor.js";
import {
  buildProjectContextBaseline,
  projectContextManagedInputsEqual,
  readProjectContextManagedInputs,
  type ProjectContextBaseline,
  type ProjectContextManagedInputName,
} from "./project-context-material.js";
import { readProjectBrainSemanticRegions } from "./project-brain-semantics.js";

export type { ProjectContextBaseline } from "./project-context-material.js";

const SNAPSHOT_SCHEMA_VERSION = 1;

type ManagedInputName = ProjectContextManagedInputName;

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
  const semantic = readProjectBrainSemanticRegions(inputs);
  if (semantic.decisionIssues.length > 0) {
    throw new Error(`ambiguous decision history: ${semantic.decisionIssues.join("; ")}`);
  }

  const canonical = (values: string[]): ProjectContextItem[] => values.map((value) => ({ value, authorityClass: "canonical-project" }));
  const unknown = (values: string[]): ProjectContextItem[] => values.map((value) => ({ value, authorityClass: "unresolved-project" }));

  return {
    projectIdentity: canonical(semantic.projectIdentity),
    confirmedGoals: canonical(semantic.confirmedGoals),
    activeDecisions: canonical(semantic.decisionRecords.filter((record) => record.status === "active").map((record) => record.text)),
    knownFacts: canonical(semantic.knownFacts),
    unresolvedUnknowns: unknown(semantic.unresolvedUnknowns),
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

  const doctorBefore = await runDoctor(project.root);
  if (doctorBefore.state !== "healthy") return blocked(project.root, doctorBefore.findings);

  let captured: Map<ManagedInputName, Buffer>;
  let context: ProjectContextSnapshotContext;
  let baseline: ProjectContextBaseline;
  try {
    captured = await readProjectContextManagedInputs(inspection.path);
    const metadata = JSON.parse(captured.get("metadata.json")!.toString("utf8")) as { projectBrain?: { schemaVersion?: unknown } };
    const schemaVersion = metadata.projectBrain?.schemaVersion;
    if (typeof schemaVersion !== "number") {
      return blocked(project.root, [{ code: "snapshot-metadata-invalid", severity: "error", message: "Project Brain schema version is unavailable for snapshot baseline construction." }]);
    }
    context = parseContext(captured);
    baseline = buildProjectContextBaseline(captured, schemaVersion);
  } catch (error) {
    return blocked(project.root, [{ code: "snapshot-read-invalid", severity: "error", message: `Project context cannot be derived safely: ${error instanceof Error ? error.message : "unknown snapshot read failure"}` }]);
  }

  await options.beforeRevalidate?.();

  const inspectionAfter = await store.inspect();
  if (inspectionAfter.health !== "valid") {
    const doctor = await runDoctor(project.root);
    return blocked(project.root, doctor.findings, baseline);
  }

  const recaptured = await readProjectContextManagedInputs(inspectionAfter.path);
  if (!projectContextManagedInputsEqual(captured, recaptured)) {
    return blocked(project.root, [{ code: "snapshot-concurrent-change", severity: "error", message: "Project Brain changed while the context snapshot was being built. Retry from a fresh baseline." }], baseline);
  }

  const doctorAfter = await runDoctor(project.root);
  if (doctorAfter.state !== "healthy") return blocked(project.root, doctorAfter.findings, baseline);

  return {
    ...base(project.root),
    safetyState: "clear",
    baseline,
    context,
    findings: doctorAfter.findings,
  };
}
