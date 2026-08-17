import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverProject } from "../project/discovery.js";
import { inspectProjectBrainIntegrity } from "../project-brain/integrity.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { readMigrationJournal } from "../lifecycle/migration.js";
import { findStrandedLifecycleArtifacts } from "../lifecycle/recovery.js";
import { FRAMEWORK_VERSION } from "../lifecycle/state.js";
import { readActiveRuntimePointer } from "../distribution/runtime-installation.js";

export type DoctorState = "healthy" | "drift-detected" | "unsupported-manual-state" | "partial-or-damaged" | "recovery-required";
export interface DoctorFinding { code: string; severity: "info" | "warning" | "error"; message: string; }
export interface DoctorReport { projectRoot: string; state: DoctorState; findings: DoctorFinding[]; changesMade: 0; }

function acceptedFrameworkVersion(version: string): boolean {
  return version === FRAMEWORK_VERSION || version === "0.0.0-development" || /^0\.0\.\d+-development(?:\.\d+)?$/.test(version);
}
function confirmedPackageName(projectMarkdown: string): string | undefined { return projectMarkdown.match(/^- Confirmed package name:\s*(.+)$/m)?.[1]?.trim(); }

export async function runDoctor(projectPath: string = process.cwd()): Promise<DoctorReport> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const inspection = await store.inspect();
  const findings: DoctorFinding[] = [];

  if (inspection.health === "not-found") {
    const stranded = await findStrandedLifecycleArtifacts(project.root);
    if (stranded.length > 0) {
      return {
        projectRoot: project.root,
        state: "recovery-required",
        findings: [{ code: "stranded-lifecycle-state", severity: "error", message: `Canonical Project Brain is missing while lifecycle artifacts remain: ${stranded.join(", ")}. Do not initialize a new brain; recovery/diagnosis is required.` }],
        changesMade: 0,
      };
    }
    return { projectRoot: project.root, state: "partial-or-damaged", findings: [{ code: "project-brain-missing", severity: "error", message: "Project Brain is not initialized." }], changesMade: 0 };
  }
  if (inspection.health !== "valid") return { projectRoot: project.root, state: "partial-or-damaged", findings: [{ code: "project-brain-invalid", severity: "error", message: inspection.reason ?? "Project Brain requires diagnosis." }], changesMade: 0 };

  let journal: Awaited<ReturnType<typeof readMigrationJournal>>;
  try { journal = await readMigrationJournal(project.root); }
  catch (error) {
    return { projectRoot: project.root, state: "recovery-required", findings: [{ code: "invalid-migration-evidence", severity: "error", message: `Migration lifecycle evidence is invalid and must not be guessed through: ${error instanceof Error ? error.message : "unknown journal failure"}` }], changesMade: 0 };
  }
  if (journal && journal.state !== "complete" && journal.state !== "failed") return { projectRoot: project.root, state: "recovery-required", findings: [{ code: "interrupted-migration", severity: "error", message: "Interrupted migration requires recovery before normal work continues." }], changesMade: 0 };

  try { await readActiveRuntimePointer(project.root); }
  catch (error) {
    return { projectRoot: project.root, state: "recovery-required", findings: [{ code: "invalid-runtime-evidence", severity: "error", message: `Installed Runtime evidence is invalid and execution must fail closed: ${error instanceof Error ? error.message : "unknown Runtime evidence failure"}` }], changesMade: 0 };
  }

  const metadata = await store.readMetadata();
  if (!acceptedFrameworkVersion(metadata.framework.version)) findings.push({ code: "unsupported-framework-state", severity: "error", message: `Unsupported manual Framework state detected: ${metadata.framework.version}. Use the supported update/migration lifecycle instead of replacing lifecycle metadata manually.` });
  if (!new Set(["stable", "preview", "development"]).has(metadata.framework.channel)) findings.push({ code: "unsupported-update-channel", severity: "error", message: `Unsupported update channel: ${metadata.framework.channel}.` });

  if (metadata.projectBrain.schemaVersion === 2) {
    if (!isStableProjectIdentity(metadata.projectBrain.projectId)) {
      findings.push({ code: "schema-postcondition-mismatch", severity: "error", message: "Project Brain schema 2 requires one canonical stable logical project identity." });
    }
  } else if (metadata.projectBrain.schemaVersion !== 1) {
    findings.push({ code: "unsupported-schema", severity: "error", message: `Unsupported Project Brain schema version: ${metadata.projectBrain.schemaVersion}.` });
  }

  if (project.packageName) {
    const projectMarkdown = await readFile(resolve(project.root, ".project-brain", "project.md"), "utf8");
    const brainPackageName = confirmedPackageName(projectMarkdown);
    if (brainPackageName && brainPackageName !== project.packageName) findings.push({ code: "identity-conflict", severity: "error", message: `Project identity conflict: package.json identifies '${project.packageName}' while Project Brain identifies '${brainPackageName}'.` });
  }

  if (findings.length === 0 && metadata.projectBrain.schemaVersion === 2 && isStableProjectIdentity(metadata.projectBrain.projectId)) {
    const integrity = await inspectProjectBrainIntegrity(project.root);
    if (integrity.state === "missing") {
      findings.push({ code: "project-brain-integrity-unestablished", severity: "error", message: "No machine-local accepted Project Brain integrity checkpoint exists for this physical project location. Inspect the current bytes and establish one explicitly before treating them as canonical Project Truth." });
    } else if (integrity.state === "mismatch") {
      findings.push({ code: "project-brain-integrity-mismatch", severity: "error", message: `Managed Project Brain bytes are not the last accepted canonical material state: ${integrity.reason}` });
    } else if (integrity.state === "invalid") {
      findings.push({ code: "project-brain-integrity-evidence-invalid", severity: "error", message: `Project Brain integrity evidence is invalid and must not be guessed through: ${integrity.reason}` });
    }
  }

  const state: DoctorState = findings.some((finding) => ["unsupported-framework-state", "unsupported-schema", "unsupported-update-channel"].includes(finding.code)) ? "unsupported-manual-state" : findings.length > 0 ? "drift-detected" : "healthy";
  if (state === "healthy") findings.push({ code: "healthy", severity: "info", message: "No supported lifecycle or accepted Project Brain integrity drift detected." });
  return { projectRoot: project.root, state, findings, changesMade: 0 };
}
