import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { discoverProject } from "./discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { parseDecisionsMarkdown, type DecisionRecord } from "../project-brain/decisions.js";
import { buildActionableProposal, type ActionableProposal } from "../runtime/actionable-proposal.js";
import { parseSemanticProposalCandidate } from "../runtime/semantic-proposal.js";

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

type HostRequest =
  | { method: "read" }
  | { method: "prepare"; areaId: unknown; value: unknown };

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
  else throw new Error("Desktop Project Knowledge method is unsupported.");
  stdout.write(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1]).replace(/\\/g, "/")}`).href) {
  await main();
}
