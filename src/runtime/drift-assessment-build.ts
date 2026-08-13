import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { runDoctor } from "./doctor.js";
import {
  buildProjectContextBaseline,
  projectContextManagedInputsEqual,
  readProjectContextManagedInputs,
  type ProjectContextBaseline,
} from "./project-context-material.js";
import { readProjectBrainSemanticRegions } from "./project-brain-semantics.js";
import type { DriftObservation } from "./drift-observation.js";
import type { DriftFinding } from "./drift-assessment-types.js";
import type { DriftAssessmentBuildOptions, DriftAssessmentResult } from "./drift-assessment-result.js";
import { compareDecision } from "./drift-decision-final.js";
import { compareScalarObservation } from "./drift-compare-scalar.js";
import { DRIFT_DIGEST_DOMAIN, driftAssessmentDigest } from "./drift-assessment-hash.js";

const ACTIONABILITY = {
  reviewOnly: true,
  mutationAuthorization: false,
  applySupported: false,
  authorizationEligible: false,
} as const;

function localFinding(code: string, message: string): DriftFinding {
  return { category: "insufficient-evidence", code, effect: "review-required", message };
}

function blocked(projectLocator: string, findings: DriftAssessmentResult extends infer _ ? any[] : never, baseline: ProjectContextBaseline | null = null): DriftAssessmentResult {
  return {
    state: "blocked",
    projectLocator,
    stableProjectIdentity: null,
    baseline,
    assessment: null,
    findings,
    reviewOnly: true,
    mutationAuthorization: false,
    applySupported: false,
    authorizationEligible: false,
    changesMade: 0,
  };
}

export async function buildConflictDriftAssessment(
  observation: DriftObservation,
  projectPath: string = process.cwd(),
  options: DriftAssessmentBuildOptions = {},
): Promise<DriftAssessmentResult> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") return blocked(project.root, (await runDoctor(project.root)).findings);

  const doctorBefore = await runDoctor(project.root);
  if (doctorBefore.state !== "healthy") return blocked(project.root, doctorBefore.findings);

  let captured;
  let baseline: ProjectContextBaseline;
  let semantic;
  try {
    captured = await readProjectContextManagedInputs(inspection.path);
    const metadata = JSON.parse(captured.get("metadata.json")!.toString("utf8")) as { projectBrain?: { schemaVersion?: unknown } };
    const schemaVersion = metadata.projectBrain?.schemaVersion;
    if (typeof schemaVersion !== "number") throw new Error("missing schema version");
    baseline = buildProjectContextBaseline(captured, schemaVersion);
    semantic = readProjectBrainSemanticRegions(captured);
    if (semantic.decisionIssues.length > 0) {
      return blocked(project.root, [localFinding("assessment-decision-history-ambiguous", "Decision history is ambiguous and cannot support a clean assessment.")], baseline);
    }
  } catch {
    return blocked(project.root, [localFinding("assessment-capture-failed", "Project semantic evidence could not be captured safely.")]);
  }

  const comparison = observation.domain === "project-decision"
    ? compareDecision(observation, semantic.decisionRecords)
    : observation.domain === "project-goal"
      ? compareScalarObservation(observation, semantic.confirmedGoals)
      : compareScalarObservation(observation, semantic.knownFacts, semantic.unresolvedUnknowns);

  await options.beforeRevalidate?.();

  const inspectionAfter = await store.inspect();
  if (inspectionAfter.health !== "valid") return blocked(project.root, (await runDoctor(project.root)).findings, baseline);

  let recaptured;
  try { recaptured = await readProjectContextManagedInputs(inspectionAfter.path); }
  catch { return blocked(project.root, [localFinding("assessment-revalidation-failed", "Project Brain could not be revalidated after assessment analysis.")], baseline); }

  if (!projectContextManagedInputsEqual(captured, recaptured)) {
    return blocked(project.root, [localFinding("assessment-concurrent-change", "Project Brain changed while the assessment was being built. Retry from a fresh baseline.")], baseline);
  }

  const doctorAfter = await runDoctor(project.root);
  if (doctorAfter.state !== "healthy") return blocked(project.root, doctorAfter.findings, baseline);

  const material = {
    schemaVersion: 1 as const,
    assessmentVersion: 1 as const,
    projectLocator: project.root,
    stableProjectIdentity: null,
    baseline,
    observation,
    comparisonEvidence: comparison.evidence,
    diagnosis: comparison.diagnosis,
    findings: comparison.findings,
    actionability: ACTIONABILITY,
    changesMade: 0 as const,
  };
  const digest = driftAssessmentDigest(material);
  return {
    state: "assessment",
    assessment: {
      ...material,
      assessmentId: "drift-assessment-v1:" + digest,
      materialDigest: { algorithm: "sha256", domain: DRIFT_DIGEST_DOMAIN, digest },
      generatedAt: new Date().toISOString(),
    },
    changesMade: 0,
  };
}
