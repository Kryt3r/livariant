import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildUnderstandingReview, type UnderstandingReviewInput } from "../project/understanding-review.js";
import { buildUnderstandingAdoptionProposal } from "../project/understanding-adoption.js";
import { inspectInitialization } from "../runtime/index.js";
import { escapeTerminalControlText } from "./understand-command.js";

const REVIEW_INPUT_MAX_BYTES = 64 * 1024;

function parseArgs(args: string[]): { json: boolean; inputPath: string; selectedCandidateId: string } {
  let json = false;
  let inputPath: string | undefined;
  let selectedCandidateId: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      if (json) throw new Error("Adopt-understanding accepts --json at most once.");
      json = true;
      continue;
    }
    if (arg === "--input" || arg === "--select") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`Adopt-understanding ${arg} requires a value.`);
      if (arg === "--input") {
        if (inputPath !== undefined) throw new Error("Adopt-understanding accepts --input at most once.");
        inputPath = value;
      } else {
        if (selectedCandidateId !== undefined) throw new Error("Adopt-understanding accepts --select at most once.");
        selectedCandidateId = value;
      }
      i += 1;
      continue;
    }
    throw new Error(`Unknown adopt-understanding argument: ${arg}`);
  }

  if (!inputPath) throw new Error("Adopt-understanding requires --input <review.json>.");
  if (!selectedCandidateId) throw new Error("Adopt-understanding requires --select <candidate-id>.");
  if (!/^candidate-evidence-v1:[a-f0-9]{64}$/.test(selectedCandidateId)) throw new Error("Adopt-understanding --select requires a valid candidate material id.");
  return { json, inputPath, selectedCandidateId };
}

function readReviewInput(inputPath: string): UnderstandingReviewInput {
  const path = resolve(process.cwd(), inputPath);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Understanding adoption input must be a regular non-symlink file.");
  if (stat.size > REVIEW_INPUT_MAX_BYTES) throw new Error(`Understanding adoption input exceeds ${REVIEW_INPUT_MAX_BYTES} bytes.`);

  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Understanding adoption input must be a JSON object.");
  const record = parsed as Record<string, unknown>;
  const allowed = new Set(["schemaVersion", "responses", "corrections"]);
  for (const key of Object.keys(record)) if (!allowed.has(key)) throw new Error(`Unknown understanding adoption input field: ${key}`);
  if (record.schemaVersion !== 1) throw new Error("Understanding adoption input schemaVersion must be 1.");
  if (record.responses !== undefined && !Array.isArray(record.responses)) throw new Error("Understanding adoption responses must be an array.");
  if (record.corrections !== undefined && !Array.isArray(record.corrections)) throw new Error("Understanding adoption corrections must be an array.");

  const responses = (record.responses as unknown[] | undefined)?.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Each understanding adoption response must be an object.");
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some((key) => !["questionId", "statement"].includes(key))) throw new Error("Understanding adoption response contains an unknown field.");
    if (typeof item.questionId !== "string" || typeof item.statement !== "string") throw new Error("Understanding adoption response requires string questionId and statement.");
    return { questionId: item.questionId, statement: item.statement };
  });

  const corrections = (record.corrections as unknown[] | undefined)?.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Each understanding adoption correction must be an object.");
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some((key) => !["target", "statement"].includes(key))) throw new Error("Understanding adoption correction contains an unknown field.");
    if (typeof item.target !== "string" || typeof item.statement !== "string") throw new Error("Understanding adoption correction requires string target and statement.");
    return { target: item.target, statement: item.statement };
  });

  return { schemaVersion: 1, responses, corrections };
}

export async function handleAdoptUnderstandingCommand(args: string[]): Promise<void> {
  let json = args.includes("--json");
  try {
    const parsed = parseArgs(args);
    json = parsed.json;
    const input = readReviewInput(parsed.inputPath);
    const plan = await inspectInitialization();
    const review = buildUnderstandingReview(plan.discovery, input);
    const selected = review.candidateEvidence.find((item) => item.candidateId === parsed.selectedCandidateId);
    if (!selected) throw new Error("Selected candidate material id is not present in the current reconstructed review.");
    const result = await buildUnderstandingAdoptionProposal(review, parsed.selectedCandidateId);

    if (json) {
      console.log(JSON.stringify(result));
      return;
    }

    if (result.state !== "actionable-proposal") {
      console.log("Understanding adoption blocked");
      for (const finding of result.findings) console.log(`- ${escapeTerminalControlText(finding.message)}`);
      console.log("Changes made: 0");
      process.exitCode = 3;
      return;
    }

    const proposal = result.proposal;
    console.log("Controlled understanding adoption proposal prepared");
    console.log(`Selected candidate: ${escapeTerminalControlText(selected.candidateId)}`);
    console.log(`Source target: ${escapeTerminalControlText(selected.target)}`);
    console.log(`Proposal: ${proposal.actionableProposalId}`);
    console.log(`Project: ${proposal.stableProjectIdentity}`);
    console.log(`Baseline: ${proposal.baseline.digest}`);
    console.log(`Scope: ${proposal.mutationScope.domain}/${proposal.mutationScope.changeKind}`);
    console.log(`Statement: ${escapeTerminalControlText(proposal.mutationScope.proposedStatement)}`);
    console.log("Selection is intent: yes");
    console.log("Mutation authorization: no");
    console.log("Authorization required: yes");
    console.log("Changes made: 0");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Understanding adoption input is invalid.";
    if (json) console.log(JSON.stringify({ state: "invalid-input", error: { code: "understanding-adoption-invalid", message }, changesMade: 0 }));
    else {
      console.log("Understanding adoption invalid");
      console.log(`Reason: ${escapeTerminalControlText(message)}`);
      console.log("Changes made: 0");
    }
    process.exitCode = 2;
  }
}
