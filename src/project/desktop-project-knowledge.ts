import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { discoverProject } from "./discovery.js";
import { ensureDesktopProjectBrainStorage } from "./desktop-project-brain-storage.js";
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
  unexpectedChangeReview?: {
    areas: Array<{
      id: DesktopProjectKnowledgeAreaId;
      before: string;
      after: string;
      changed: boolean;
    }>;
  };
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

function areasFromDecisionsMarkdown(markdown: string): DesktopProjectKnowledgeAreaSnapshot[] {
  const parsed = parseDecisionsMarkdown(markdown);
  if (parsed.issues.length > 0) throw new Error(`Project Brain comparison found ambiguous decision history: ${parsed.issues.join("; ")}`);
  return projectKnowledgeAreasFromDecisionRecords(parsed.records);
}

async function unexpectedChangeReview(
  projectRoot: string,
  integrity: Awaited<ReturnType<typeof inspectProtectedProjectBrainIntegrity>>,
): Promise<DesktopProjectKnowledgeProtectionStatus["unexpectedChangeReview"]> {
  if (integrity.state !== "mismatch" || !integrity.local.receipt.managedSnapshot) return undefined;
  const beforeAreas = areasFromDecisionsMarkdown(integrity.local.receipt.managedSnapshot.decisionsMd);
  const store = new ProjectBrainStore(projectRoot);
  const afterAreas = areasFromDecisionsMarkdown(await store.readDecisionsDocument());
  return {
    areas: beforeAreas.map((before) => {
      const after = afterAreas.find((candidate) => candidate.id === before.id)!;
      return {
        id: before.id,
        before: before.confirmedValue,
        after: after.confirmedValue,
        changed: before.confirmedValue !== after.confirmedValue,
      };
    }),
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
    return {
      schemaVersion: 1,
      state: "integrity-recovery-required",
      canonicalReadReady: false,
      guardian,
      integrity: {
        state: "missing-project-brain",
        digest: null,
        reason: "Machine-local Project Brain storage is missing after project setup; activation/setup recovery is required.",
      },
      initialization: null,
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

  const review = await unexpectedChangeReview(project.root, integrity);
  return {
    schemaVersion: 1,
    state,
    canonicalReadReady: state === "ready",
    guardian,
    integrity: { state: integrity.state, digest, reason },
    initialization: null,
    ...(review ? { unexpectedChangeReview: review } : {}),
  };
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
  language: "de" | "en" = "en",
): Promise<DesktopProjectKnowledgeProtectionStatus> {
  const project = discoverProject(projectPath);
  const before = await projectKnowledgeProtectionStatus(project.root);
  if (before.guardian.state !== "ready") {
    throw new Error(`Protected Guardian must be ready before Project Brain integrity acceptance; current state is ${before.guardian.state}.`);
  }
  if (before.state === "ready") return before;
  const initialAcceptance = before.state === "integrity-acceptance-required";
  const reviewedMismatch = before.state === "integrity-recovery-required"
    && before.integrity.state === "mismatch"
    && before.unexpectedChangeReview !== undefined;
  if ((!initialAcceptance && !reviewedMismatch) || !before.integrity.digest) {
    throw new Error(`Project Brain integrity cannot be accepted from state ${before.state}; damaged or ambiguous state requires recovery instead.`);
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
  } else if (before.integrity.state === "mismatch") {
    const disallowed = doctor.findings.filter((finding) => finding.code !== "project-brain-integrity-mismatch");
    if (doctor.state !== "drift-detected" || disallowed.length > 0) {
      const detail = doctor.findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
      throw new Error(`Reviewed Project Brain change contains additional unresolved findings: ${detail}`);
    }
  } else if (doctor.state !== "healthy") {
    const detail = doctor.findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
    throw new Error(`Protected integrity acceptance requires coherent local Project Brain evidence: ${detail}`);
  }

  await establishProtectedProjectBrainIntegrityState(project.root, "manual-bootstrap", {
    nativeConfirmationLanguage: language,
  });
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
  input: { areaId: unknown; proposal: unknown; confirmedProposalDigest: unknown; language?: unknown },
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
  const language = input.language === "de" ? "de" : "en";
  await issueSemanticGuardianAuthority(
    authorization.authorization.authorizationId,
    proposal,
    project.root,
    { nativeConfirmationLanguage: language },
  );
  const applied = await applyActionableProposal(authorization.authorization.authorizationId, proposal, project.root);
  if (applied.state !== "completed" || applied.actionableProposalId !== proposal.actionableProposalId) {
    throw new Error("Desktop Project Knowledge apply did not complete for the exact reviewed proposal.");
  }
  const postProtection = await inspectProtectedProjectBrainIntegrity(project.root);
  if (postProtection.state !== "match") {
    throw new Error(`Protected Semantic Authority did not establish the reviewed Project Brain as the trusted post-state: ${postProtection.state}.`);
  }
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
  | { method: "accept-integrity"; confirmedDigest: unknown; language?: unknown }
  | { method: "prepare"; areaId: unknown; value: unknown }
  | { method: "apply"; areaId: unknown; proposal: unknown; confirmedProposalDigest: unknown; language?: unknown };

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
  else if (request.method === "accept-integrity") {
    if (typeof request.confirmedDigest !== "string") throw new Error("Project Brain integrity confirmation digest is invalid.");
    result = await establishDesktopProjectKnowledgeIntegrity(
      projectBrainRoot,
      request.confirmedDigest,
      request.language === "de" ? "de" : "en",
    );
  }
  else if (request.method === "prepare") result = await prepareDesktopProjectKnowledgeProposal(projectBrainRoot, request);
  else if (request.method === "apply") result = await applyDesktopProjectKnowledgeProposal(projectBrainRoot, request);
  else throw new Error("Desktop Project Knowledge method is unsupported.");
  stdout.write(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1]).replace(/\\/g, "/")}`).href) {
  await main();
}
