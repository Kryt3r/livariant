import { readFile, realpath } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { discoverProject } from "./discovery.js";
import { ensureDesktopProjectBrainStorage } from "./desktop-project-brain-storage.js";
import { initializeProject, inspectInitialization, type InitializationPlan } from "../runtime/initialization.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { parseDecisionsMarkdown, type DecisionRecord } from "../project-brain/decisions.js";
import { buildActionableProposal, parseActionableProposal, type ActionableProposal } from "../runtime/actionable-proposal.js";
import { parseSemanticProposalCandidate } from "../runtime/semantic-proposal.js";
import { authorizeActionableProposal } from "../runtime/authorization.js";
import { applyActionableProposal } from "../runtime/semantic-apply.js";
import { issueSemanticGuardianAuthority } from "../guardian/semantic-authority-transition.js";
import { runProtectedDoctor } from "../runtime/protected-doctor.js";
import { runDoctor as runLocalEvidenceDoctor } from "../runtime/doctor.js";
import { inspectGuardianMachineReadiness } from "../guardian/readiness.js";
import {
  buildLifecycleGuardianAuthorityRequest,
  lifecycleMaterialSha256,
  type LifecycleGuardianAuthorityMaterial,
} from "../guardian/lifecycle-authority.js";
import {
  consumeLifecycleGuardianAuthority,
  issueLifecycleGuardianAuthority,
} from "../guardian/lifecycle-authority-transition.js";
import { findMatchingActiveGuardianAuthority } from "../guardian/authority-client.js";
import {
  establishProtectedProjectBrainIntegrityState,
  inspectProtectedProjectBrainIntegrity,
} from "../project-brain/protected-integrity.js";

export type DesktopProjectKnowledgeAreaId = "purpose" | "direction" | "rules";

export interface DesktopProjectKnowledgeAreaSnapshot {
  id: DesktopProjectKnowledgeAreaId;
  state: "open" | "confirmed";
  confirmedValue: string;
  activeDecisionId: string | null;
  history: Array<{ decisionId: string; value: string; status: "superseded" }>;
}

export interface DesktopProjectKnowledgeProtectionStatus {
  schemaVersion: 1;
  state:
    | "ready"
    | "protected-source-required"
    | "guardian-bootstrap-required"
    | "project-brain-initialization-required"
    | "integrity-acceptance-required"
    | "integrity-recovery-required"
    | "unsafe"
    | "unsupported-platform";
  canonicalReadReady: boolean;
  guardian: Awaited<ReturnType<typeof inspectGuardianMachineReadiness>>;
  integrity: {
    state: string;
    digest: string | null;
    reason: string | null;
  };
  initialization: {
    action: string;
    projectState: string;
    materialSha256: string | null;
    authorized: boolean;
    filesToCreate: string[];
    reason: string | null;
  } | null;
}

export interface DesktopProjectKnowledgeSnapshot {
  schemaVersion: 1;
  state: "ready";
  stableProjectIdentity: string;
  areas: DesktopProjectKnowledgeAreaSnapshot[];
  boundaries: {
    source: "project-brain";
    rendererOwnsTruth: false;
    readOnly: true;
    grantsAuthority: false;
    performsSemanticApply: false;
  };
}

export interface DesktopProjectKnowledgeApplyResult {
  schemaVersion: 1;
  state: "completed";
  areaId: DesktopProjectKnowledgeAreaId;
  appliedProposalId: string;
  snapshot: DesktopProjectKnowledgeSnapshot;
}

export interface DesktopProjectKnowledgePreparedProposal {
  schemaVersion: 1;
  state: "proposal-ready";
  areaId: DesktopProjectKnowledgeAreaId;
  displayValue: string;
  proposal: ActionableProposal;
  boundaries: {
    source: "project-brain";
    proposalIsTruth: false;
    grantsAuthority: false;
    performsSemanticApply: false;
  };
}

const AREA_PREFIX: Record<DesktopProjectKnowledgeAreaId, string> = {
  purpose: "Project purpose:",
  direction: "Current direction:",
  rules: "Project rules and constraints:",
};

function areaId(value: unknown): DesktopProjectKnowledgeAreaId {
  if (value === "purpose" || value === "direction" || value === "rules") return value;
  throw new Error("Desktop Project Knowledge area is unsupported.");
}

function normalizedValue(value: unknown): string {
  if (typeof value !== "string") throw new Error("Desktop Project Knowledge value must be text.");
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("Desktop Project Knowledge value must not be empty.");
  if (Buffer.byteLength(normalized, "utf8") > 8192) throw new Error("Desktop Project Knowledge value exceeds the supported size.");
  return normalized;
}

function taggedValue(id: DesktopProjectKnowledgeAreaId, record: DecisionRecord): string | null {
  const prefix = AREA_PREFIX[id];
  if (!record.text.startsWith(prefix)) return null;
  const value = record.text.slice(prefix.length).trim();
  return value || null;
}

async function projectRecords(projectRoot: string): Promise<{ stableProjectIdentity: string; records: DecisionRecord[] }> {
  const store = new ProjectBrainStore(projectRoot);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error(`Project Knowledge requires a valid Project Brain; current state is ${inspection.health}.`);
  const metadata = await store.readMetadata();
  const stableProjectIdentity = metadata.projectBrain.projectId;
  if (typeof stableProjectIdentity !== "string" || !stableProjectIdentity) {
    throw new Error("Project Knowledge requires a stable schema-2 Project Brain identity.");
  }
  const parsed = parseDecisionsMarkdown(await store.readDecisionsDocument());
  if (parsed.issues.length > 0) {
    throw new Error(`Project Knowledge cannot use ambiguous decision history: ${parsed.issues.join("; ")}`);
  }
  return { stableProjectIdentity, records: parsed.records };
}

export function projectKnowledgeAreasFromDecisionRecords(records: DecisionRecord[]): DesktopProjectKnowledgeAreaSnapshot[] {
  return (["purpose", "direction", "rules"] as const).map((id) => areaSnapshot(id, records));
}

function areaSnapshot(id: DesktopProjectKnowledgeAreaId, records: DecisionRecord[]): DesktopProjectKnowledgeAreaSnapshot {
  const matching = records
    .map((record) => ({ record, value: taggedValue(id, record) }))
    .filter((entry): entry is { record: DecisionRecord; value: string } => entry.value !== null);
  const active = matching.filter(({ record }) => record.status === "active");
  if (active.length > 1) throw new Error(`Project Brain contains multiple active Desktop Project Knowledge records for '${id}'.`);
  const current = active[0];
  return {
    id,
    state: current ? "confirmed" : "open",
    confirmedValue: current?.value ?? "",
    activeDecisionId: current?.record.id ?? null,
    history: matching
      .filter(({ record }) => record.status === "superseded")
      .map(({ record, value }) => ({ decisionId: record.id, value, status: "superseded" as const })),
  };
}

async function localProjectKnowledgeSnapshot(projectPath: string): Promise<DesktopProjectKnowledgeSnapshot> {
  const project = discoverProject(projectPath);
  const { stableProjectIdentity, records } = await projectRecords(project.root);
  return {
    schemaVersion: 1,
    state: "ready",
    stableProjectIdentity,
    areas: projectKnowledgeAreasFromDecisionRecords(records),
    boundaries: {
      source: "project-brain",
      rendererOwnsTruth: false,
      readOnly: true,
      grantsAuthority: false,
      performsSemanticApply: false,
    },
  };
}

async function desktopInitializationMaterial(plan: InitializationPlan): Promise<LifecycleGuardianAuthorityMaterial> {
  const stablePlan = {
    projectState: plan.projectState,
    projectBrainHealth: plan.projectBrainHealth,
    evidence: plan.evidence,
    filesToCreate: plan.filesToCreate,
    projectFilesToModify: plan.projectFilesToModify,
    unknowns: plan.unknowns,
    action: plan.action,
    confirmedProjectName: plan.confirmedProjectName ?? null,
    reason: plan.reason ?? null,
    discovery: plan.discovery,
  };
  const displayProjectName = plan.confirmedProjectName?.trim() || basename(plan.projectRoot);
  return buildLifecycleGuardianAuthorityRequest({
    operation: "initialize",
    physicalProjectRoot: await realpath(plan.projectRoot),
    materialFields: [
      { label: "display-project-name", value: displayProjectName },
      { label: "project-state", value: plan.projectState },
      { label: "project-brain-health", value: plan.projectBrainHealth },
      { label: "initialization-action", value: plan.action },
      { label: "files-to-create-json", value: JSON.stringify([...plan.filesToCreate].sort()) },
      { label: "project-files-to-modify-json", value: JSON.stringify([...plan.projectFilesToModify].sort()) },
      { label: "plan-sha256", value: lifecycleMaterialSha256(stablePlan) },
    ],
  });
}

async function initializationStatus(projectRoot: string) {
  const plan = await inspectInitialization(projectRoot);
  if (plan.action !== "initialize") {
    return {
      plan,
      material: null,
      authorized: false,
    };
  }
  const material = await desktopInitializationMaterial(plan);
  const active = await findMatchingActiveGuardianAuthority({
    consumer: "lifecycle-mutation",
    mode: "one-shot",
    materialSha256: material.materialSha256,
    projectPath: projectRoot,
  });
  return {
    plan,
    material,
    authorized: active !== null,
  };
}

export async function projectKnowledgeProtectionStatus(projectPath: string): Promise<DesktopProjectKnowledgeProtectionStatus> {
  const project = discoverProject(projectPath);
  const guardian = await inspectGuardianMachineReadiness(project.root, process.platform, process.execPath);
  const store = new ProjectBrainStore(project.root);
  const brain = await store.inspect();

  if (guardian.state !== "ready") {
    return {
      schemaVersion: 1,
      state: guardian.state,
      canonicalReadReady: false,
      guardian,
      integrity: { state: "unavailable", digest: null, reason: null },
      initialization: null,
    };
  }

  if (brain.health === "not-found") {
    const initialization = await initializationStatus(project.root);
    if (initialization.plan.action !== "initialize" || !initialization.material) {
      return {
        schemaVersion: 1,
        state: "integrity-recovery-required",
        canonicalReadReady: false,
        guardian,
        integrity: { state: "unavailable", digest: null, reason: initialization.plan.reason ?? "Project Brain initialization is blocked." },
        initialization: {
          action: initialization.plan.action,
          projectState: initialization.plan.projectState,
          materialSha256: null,
          authorized: false,
          filesToCreate: initialization.plan.filesToCreate,
          reason: initialization.plan.reason ?? null,
        },
      };
    }
    return {
      schemaVersion: 1,
      state: "project-brain-initialization-required",
      canonicalReadReady: false,
      guardian,
      integrity: { state: "missing-project-brain", digest: null, reason: null },
      initialization: {
        action: initialization.plan.action,
        projectState: initialization.plan.projectState,
        materialSha256: initialization.material.materialSha256,
        authorized: initialization.authorized,
        filesToCreate: initialization.plan.filesToCreate,
        reason: initialization.plan.reason ?? null,
      },
    };
  }

  if (brain.health !== "valid") {
    return {
      schemaVersion: 1,
      state: "integrity-recovery-required",
      canonicalReadReady: false,
      guardian,
      integrity: { state: brain.health, digest: null, reason: brain.reason ?? "Project Brain requires diagnosis before canonical use." },
      initialization: null,
    };
  }

  let integrity;
  try {
    integrity = await inspectProtectedProjectBrainIntegrity(project.root);
  } catch (error) {
    return {
      schemaVersion: 1,
      state: "integrity-recovery-required",
      canonicalReadReady: false,
      guardian,
      integrity: {
        state: "invalid",
        digest: null,
        reason: error instanceof Error ? error.message : "Project Brain integrity inspection failed.",
      },
      initialization: null,
    };
  }

  const digest = integrity.local.current?.digest ?? null;
  const reason = integrity.state === "mismatch"
    ? integrity.local.reason
    : integrity.state === "unprotected" || integrity.state === "invalid"
      ? integrity.reason
      : null;

  let state: DesktopProjectKnowledgeProtectionStatus["state"];
  if (integrity.state === "match") state = "ready";
  else if (integrity.state === "missing" || integrity.state === "unprotected") state = "integrity-acceptance-required";
  else state = "integrity-recovery-required";

  return {
    schemaVersion: 1,
    state,
    canonicalReadReady: state === "ready",
    guardian,
    integrity: { state: integrity.state, digest, reason },
    initialization: null,
  };
}

export async function authorizeDesktopProjectKnowledgeInitialization(
  projectPath: string,
  confirmedMaterialSha256: string,
  uiLanguage: "de" | "en",
): Promise<DesktopProjectKnowledgeProtectionStatus> {
  const project = discoverProject(projectPath);
  const before = await projectKnowledgeProtectionStatus(project.root);
  if (before.state !== "project-brain-initialization-required" || !before.initialization?.materialSha256) {
    throw new Error(`Project Brain initialization authorization is not available from state ${before.state}.`);
  }
  if (confirmedMaterialSha256 !== before.initialization.materialSha256) {
    throw new Error("Project Brain initialization confirmation does not match the exact reviewed lifecycle material.");
  }
  const current = await initializationStatus(project.root);
  if (current.plan.action !== "initialize" || !current.material || current.material.materialSha256 !== confirmedMaterialSha256) {
    throw new Error("Project Brain initialization plan changed before protected authorization; review the current plan again.");
  }
  if (!current.authorized) {
    await issueLifecycleGuardianAuthority(current.material, project.root, { nativeConfirmationLanguage: uiLanguage });
  }
  const after = await projectKnowledgeProtectionStatus(project.root);
  if (after.state !== "project-brain-initialization-required" || after.initialization?.authorized !== true) {
    throw new Error("Protected lifecycle authorization was not verified for the exact Project Brain initialization plan.");
  }
  return after;
}

export async function applyDesktopProjectKnowledgeInitialization(
  projectPath: string,
  confirmedMaterialSha256: string,
): Promise<DesktopProjectKnowledgeProtectionStatus> {
  const project = discoverProject(projectPath);
  const current = await initializationStatus(project.root);
  if (current.plan.action !== "initialize" || !current.material || current.material.materialSha256 !== confirmedMaterialSha256) {
    throw new Error("Project Brain initialization plan changed before apply; stale lifecycle authorization cannot be consumed.");
  }
  if (!current.authorized) {
    throw new Error("Project Brain initialization requires matching protected lifecycle authorization before apply.");
  }
  await consumeLifecycleGuardianAuthority(current.material, project.root);
  await initializeProject(project.root, { authorized: true });
  const after = await projectKnowledgeProtectionStatus(project.root);
  if (after.state !== "integrity-acceptance-required") {
    throw new Error(`Project Brain initialization completed, but expected protected-integrity acceptance state was not observed; current state is ${after.state}.`);
  }
  return after;
}

export async function readDesktopProjectKnowledge(projectPath: string): Promise<DesktopProjectKnowledgeSnapshot> {
  const status = await projectKnowledgeProtectionStatus(projectPath);
  if (!status.canonicalReadReady) {
    throw new Error(`Canonical Project Knowledge is blocked until protected Project Brain integrity is ready; current protection state is ${status.state}.`);
  }
  return localProjectKnowledgeSnapshot(projectPath);
}

export async function establishDesktopProjectKnowledgeIntegrity(
  projectPath: string,
  confirmedDigest: string,
): Promise<DesktopProjectKnowledgeProtectionStatus> {
  const project = discoverProject(projectPath);
  const before = await projectKnowledgeProtectionStatus(project.root);
  if (before.guardian.state !== "ready") {
    throw new Error(`Protected Guardian must be ready before Project Brain integrity acceptance; current state is ${before.guardian.state}.`);
  }
  if (before.state === "ready") return before;
  if (before.state !== "integrity-acceptance-required" || !before.integrity.digest) {
    throw new Error(`Project Brain integrity cannot be accepted from state ${before.state}; recovery is required instead.`);
  }
  if (confirmedDigest !== before.integrity.digest) {
    throw new Error("Project Brain integrity confirmation does not match the exact current managed material digest.");
  }

  const doctor = await runLocalEvidenceDoctor(project.root);
  if (before.integrity.state === "missing") {
    const disallowed = doctor.findings.filter((finding) => finding.code !== "project-brain-integrity-unestablished");
    if (doctor.state !== "drift-detected" || disallowed.length > 0) {
      const detail = doctor.findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
      throw new Error(`Initial integrity acceptance requires an otherwise healthy Project Brain: ${detail}`);
    }
  } else if (doctor.state !== "healthy") {
    const detail = doctor.findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
    throw new Error(`Protected integrity acceptance requires coherent local Project Brain evidence: ${detail}`);
  }

  await establishProtectedProjectBrainIntegrityState(project.root, "manual-bootstrap");
  const after = await projectKnowledgeProtectionStatus(project.root);
  if (!after.canonicalReadReady) {
    throw new Error(`Protected Project Brain integrity did not become ready after acceptance; current state is ${after.state}.`);
  }
  return after;
}

export async function prepareDesktopProjectKnowledgeProposal(
  projectPath: string,
  input: { areaId: unknown; value: unknown },
): Promise<DesktopProjectKnowledgePreparedProposal> {
  const project = discoverProject(projectPath);
  const protection = await projectKnowledgeProtectionStatus(project.root);
  if (!protection.canonicalReadReady) {
    throw new Error(`Project Knowledge proposal preparation requires protected canonical state; current protection state is ${protection.state}.`);
  }
  const id = areaId(input.areaId);
  const displayValue = normalizedValue(input.value);
  const { records } = await projectRecords(project.root);
  const current = areaSnapshot(id, records);
  const proposedStatement = `${AREA_PREFIX[id]} ${displayValue}`;

  const candidate = parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-decision",
    changeKind: current.activeDecisionId ? "supersede" : "add",
    proposedStatement,
    rationale: `Explicit Desktop user review for curated Project Knowledge area '${id}'.`,
    origin: "explicit-user",
    ...(current.activeDecisionId ? { targetDecisionId: current.activeDecisionId } : {}),
  });
  const built = await buildActionableProposal(candidate, project.root);
  if (built.state !== "actionable-proposal") {
    const detail = built.findings.map((finding) => finding.message).join("; ");
    throw new Error(detail || "Project Knowledge proposal is not currently authorization-eligible.");
  }

  return {
    schemaVersion: 1,
    state: "proposal-ready",
    areaId: id,
    displayValue,
    proposal: built.proposal,
    boundaries: {
      source: "project-brain",
      proposalIsTruth: false,
      grantsAuthority: false,
      performsSemanticApply: false,
    },
  };
}

function assertAreaProposal(area: DesktopProjectKnowledgeAreaId, proposal: ActionableProposal): void {
  if (proposal.mutationScope.domain !== "project-decision") {
    throw new Error("Desktop Project Knowledge apply requires a project-decision proposal.");
  }
  const prefix = AREA_PREFIX[area];
  if (!proposal.mutationScope.proposedStatement.startsWith(`${prefix} `)) {
    throw new Error("Desktop Project Knowledge proposal does not match the selected curated area.");
  }
}

export async function applyDesktopProjectKnowledgeProposal(
  projectPath: string,
  input: { areaId: unknown; proposal: unknown; confirmedProposalDigest: unknown },
): Promise<DesktopProjectKnowledgeApplyResult> {
  const project = discoverProject(projectPath);
  const id = areaId(input.areaId);
  const proposal = parseActionableProposal(input.proposal);
  assertAreaProposal(id, proposal);
  if (typeof input.confirmedProposalDigest !== "string" || input.confirmedProposalDigest !== proposal.materialDigest.digest) {
    throw new Error("Desktop Project Knowledge confirmation does not match the exact reviewed proposal.");
  }

  const protectedState = await runProtectedDoctor(project.root);
  if (protectedState.state !== "healthy") {
    const detail = protectedState.findings.map((finding) => finding.message).join("; ");
    throw new Error(`Protected Project Brain integrity is not ready for canonical apply.${detail ? ` ${detail}` : ""}`);
  }

  const authorization = await authorizeActionableProposal(proposal, project.root, {
    localUserConfirmation: {
      source: "desktop-local-ui",
      proposalDigest: proposal.materialDigest.digest,
    },
  });
  await issueSemanticGuardianAuthority(authorization.authorization.authorizationId, proposal, project.root);
  const applied = await applyActionableProposal(authorization.authorization.authorizationId, proposal, project.root);
  if (applied.state !== "completed" || applied.actionableProposalId !== proposal.actionableProposalId) {
    throw new Error("Desktop Project Knowledge apply did not complete for the exact reviewed proposal.");
  }
  await establishProtectedProjectBrainIntegrityState(project.root, "semantic-apply");
  const snapshot = await readDesktopProjectKnowledge(project.root);
  const area = snapshot.areas.find((candidate) => candidate.id === id);
  const expected = taggedValue(id, {
    id: "expected",
    status: "active",
    text: proposal.mutationScope.proposedStatement,
    legacy: false,
  });
  if (!area || area.state !== "confirmed" || !expected || area.confirmedValue !== expected) {
    throw new Error("Desktop Project Knowledge post-apply re-read did not prove the expected canonical value.");
  }
  return {
    schemaVersion: 1,
    state: "completed",
    areaId: id,
    appliedProposalId: proposal.actionableProposalId,
    snapshot,
  };
}

type HostRequest =
  | { method: "ensure-storage" }
  | { method: "read" }
  | { method: "protection" }
  | { method: "authorize-initialization"; confirmedMaterialSha256: unknown; uiLanguage: unknown }
  | { method: "apply-initialization"; confirmedMaterialSha256: unknown }
  | { method: "accept-integrity"; confirmedDigest: unknown }
  | { method: "prepare"; areaId: unknown; value: unknown }
  | { method: "apply"; areaId: unknown; proposal: unknown; confirmedProposalDigest: unknown };

async function readStdin(): Promise<string> {
  let data = "";
  stdin.setEncoding("utf8");
  for await (const chunk of stdin) data += chunk;
  return data;
}

async function main(): Promise<void> {
  const checkoutRoot = process.env.LIVARIANT_PROJECT_ROOT?.trim();
  const projectBrainRoot = process.env.LIVARIANT_PROJECT_BRAIN_ROOT?.trim();
  if (!checkoutRoot) throw new Error("Fixed Desktop Project Knowledge checkout root is required.");
  if (!projectBrainRoot) throw new Error("Fixed Desktop Project Brain storage root is required.");
  const raw = await readStdin();
  const request = JSON.parse(raw) as HostRequest;
  const storage = await ensureDesktopProjectBrainStorage(checkoutRoot, projectBrainRoot);
  let result: unknown;
  if (request.method === "ensure-storage") result = storage;
  else if (request.method === "read") result = await readDesktopProjectKnowledge(projectBrainRoot);
  else if (request.method === "protection") result = await projectKnowledgeProtectionStatus(projectBrainRoot);
  else if (request.method === "authorize-initialization") {
    if (typeof request.confirmedMaterialSha256 !== "string") throw new Error("Project Brain initialization material digest is invalid.");
    if (request.uiLanguage !== "de" && request.uiLanguage !== "en") throw new Error("Project Brain authorization UI language is invalid.");
    result = await authorizeDesktopProjectKnowledgeInitialization(projectBrainRoot, request.confirmedMaterialSha256, request.uiLanguage);
  }
  else if (request.method === "apply-initialization") {
    if (typeof request.confirmedMaterialSha256 !== "string") throw new Error("Project Brain initialization material digest is invalid.");
    result = await applyDesktopProjectKnowledgeInitialization(projectBrainRoot, request.confirmedMaterialSha256);
  }
  else if (request.method === "accept-integrity") {
    if (typeof request.confirmedDigest !== "string") throw new Error("Project Brain integrity confirmation digest is invalid.");
    result = await establishDesktopProjectKnowledgeIntegrity(projectBrainRoot, request.confirmedDigest);
  }
  else if (request.method === "prepare") result = await prepareDesktopProjectKnowledgeProposal(projectBrainRoot, request);
  else if (request.method === "apply") result = await applyDesktopProjectKnowledgeProposal(projectBrainRoot, request);
  else throw new Error("Desktop Project Knowledge method is unsupported.");
  stdout.write(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1]).replace(/\\/g, "/")}`).href) {
  await main();
}
