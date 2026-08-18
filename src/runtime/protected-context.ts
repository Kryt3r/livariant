import { FRAMEWORK_VERSION } from "../lifecycle/state.js";
import {
  buildProjectContextSnapshot,
  type BlockedProjectContextSnapshot,
  type ProjectContextSnapshot,
  type ProjectContextSnapshotBuildOptions,
} from "./context-snapshot.js";
import { runProtectedDoctor } from "./protected-doctor.js";
import type { DoctorReport } from "./doctor.js";

function blockedFromProtectedDoctor(report: DoctorReport): BlockedProjectContextSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    frameworkVersion: FRAMEWORK_VERSION,
    projectLocator: report.projectRoot,
    stableProjectIdentity: null,
    projection: {
      derived: true,
      mutationAuthorization: false,
      returnedCopiesTrusted: false,
      materialActionsRequireRevalidation: true,
    },
    safetyState: "blocked",
    baseline: null,
    context: null,
    findings: report.findings,
    changesMade: 0,
  };
}

export async function buildProtectedProjectContextSnapshot(
  projectPath: string = process.cwd(),
  options: ProjectContextSnapshotBuildOptions = {},
): Promise<ProjectContextSnapshot> {
  const before = await runProtectedDoctor(projectPath);
  if (before.state !== "healthy") return blockedFromProtectedDoctor(before);

  const snapshot = await buildProjectContextSnapshot(projectPath, options);
  if (snapshot.safetyState !== "clear") return snapshot;

  const after = await runProtectedDoctor(projectPath);
  if (after.state !== "healthy") return blockedFromProtectedDoctor(after);
  return snapshot;
}
