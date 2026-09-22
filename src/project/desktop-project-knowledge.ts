import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { discoverProject } from "./discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { parseDecisionsMarkdown, type DecisionRecord } from "../project-brain/decisions.js";
import { buildActionableProposal, parseActionableProposal, type ActionableProposal } from "../runtime/actionable-proposal.js";
import { parseSemanticProposalCandidate } from "../runtime/semantic-proposal.js";
import { authorizeActionableProposal } from "../runtime/authorization.js";
import { applyActionableProposal } from "../runtime/semantic-apply.js";
import { issueSemanticGuardianAuthority } from "../guardian/semantic-authority-transition.js";
import { runProtectedDoctor } from "../runtime/protected-doctor.js";

export type DesktopProjectKnowledgeAreaId = "purpose" | "direction" | "rules";

export interface DesktopProjectKnowledgeAreaSnapshot {
  id: DesktopProjectKnowledgeAreaId;
  state: "open" | "confirmed";
  confirmedValue: string;
  activeDecisionId: string | null;
  history: Array<{ decisionId: string; value: string; status: "superseded" }>;
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

export async function readDesktopProjectKnowledge(projectPath: string): Promise<DesktopProjectKnowledgeSnapshot> {
  const project = discoverProject(projectPath);
  const { stableProjectIdentity, records } = await projectRecords(project.root);
  return {
    schemaVersion: 1,
    state: "ready",
    stableProjectIdentity,
    areas: (["purpose", "direction", "rules"] as const).map((id) => areaSnapshot(id, records)),
    boundaries: {
      source: "project-brain",
      rendererOwnsTruth: false,
      readOnly: true,
      grantsAuthority: false,
      performsSemanticApply: false,
    },
  };
}

export async function prepareDesktopProjectKnowledgeProposal(
  projectPath: string,
  input: { areaId: unknown; value: unknown },
): Promise<DesktopProjectKnowledgePreparedProposal> {
  const project = discoverProject(projectPath);
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
  | { method: "read" }
  | { method: "prepare"; areaId: unknown; value: unknown }
  | { method: "apply"; areaId: unknown; proposal: unknown; confirmedProposalDigest: unknown };

async function readStdin(): Promise<string> {
  let data = "";
  stdin.setEncoding("utf8");
  for await (const chunk of stdin) data += chunk;
  return data;
}

async function main(): Promise<void> {
  const projectRoot = process.env.LIVARIANT_PROJECT_ROOT?.trim();
  if (!projectRoot) throw new Error("Fixed Desktop Project Knowledge project root is required.");
  const raw = await readStdin();
  const request = JSON.parse(raw) as HostRequest;
  let result: unknown;
  if (request.method === "read") result = await readDesktopProjectKnowledge(projectRoot);
  else if (request.method === "prepare") result = await prepareDesktopProjectKnowledgeProposal(projectRoot, request);
  else if (request.method === "apply") result = await applyDesktopProjectKnowledgeProposal(projectRoot, request);
  else throw new Error("Desktop Project Knowledge method is unsupported.");
  stdout.write(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1]).replace(/\\/g, "/")}`).href) {
  await main();
}
