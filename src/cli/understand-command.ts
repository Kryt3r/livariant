import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inspectInitialization } from "../runtime/index.js";
import { buildUnderstandingReview, type UnderstandingReviewInput } from "../project/understanding-review.js";

const REVIEW_INPUT_MAX_BYTES = 64 * 1024;

export function escapeTerminalControlText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return `\\u${code.toString(16).padStart(4, "0")}`;
  });
}

function parseArgs(args: string[]): { json: boolean; inputPath?: string } {
  let json = false;
  let inputPath: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      if (json) throw new Error("Understand accepts --json at most once.");
      json = true;
      continue;
    }
    if (arg === "--input") {
      if (inputPath !== undefined) throw new Error("Understand accepts --input at most once.");
      const value = args[i + 1];
      if (!value || value.startsWith("--")) throw new Error("Understand --input requires a file path.");
      inputPath = value;
      i += 1;
      continue;
    }
    throw new Error(`Unknown understand argument: ${arg}`);
  }
  return { json, inputPath };
}

function readReviewInput(inputPath: string): UnderstandingReviewInput {
  const path = resolve(process.cwd(), inputPath);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Understanding review input must be a regular non-symlink file.");
  if (stat.size > REVIEW_INPUT_MAX_BYTES) throw new Error(`Understanding review input exceeds ${REVIEW_INPUT_MAX_BYTES} bytes.`);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Understanding review input must be a JSON object.");
  const record = parsed as Record<string, unknown>;
  const allowed = new Set(["schemaVersion", "responses", "corrections"]);
  for (const key of Object.keys(record)) if (!allowed.has(key)) throw new Error(`Unknown understanding review input field: ${key}`);
  if (record.schemaVersion !== 1) throw new Error("Understanding review input schemaVersion must be 1.");
  if (record.responses !== undefined && !Array.isArray(record.responses)) throw new Error("Understanding review responses must be an array.");
  if (record.corrections !== undefined && !Array.isArray(record.corrections)) throw new Error("Understanding review corrections must be an array.");

  const responses = (record.responses as unknown[] | undefined)?.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Each understanding review response must be an object.");
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some((key) => !["questionId", "statement"].includes(key))) throw new Error("Understanding review response contains an unknown field.");
    if (typeof item.questionId !== "string" || typeof item.statement !== "string") throw new Error("Understanding review response requires string questionId and statement.");
    return { questionId: item.questionId, statement: item.statement };
  });

  const corrections = (record.corrections as unknown[] | undefined)?.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Each understanding review correction must be an object.");
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some((key) => !["target", "statement"].includes(key))) throw new Error("Understanding review correction contains an unknown field.");
    if (typeof item.target !== "string" || typeof item.statement !== "string") throw new Error("Understanding review correction requires string target and statement.");
    return { target: item.target, statement: item.statement };
  });

  return { schemaVersion: 1, responses, corrections };
}

function printEvidence(title: string, items: ReturnType<typeof buildUnderstandingReview>["confirmed"]): void {
  console.log(title);
  if (items.length === 0) console.log("- none");
  else for (const item of items) {
    console.log(`- ${escapeTerminalControlText(item.value)} [${item.confidence}] (${escapeTerminalControlText(item.provenance)})`);
  }
  console.log("");
}

export async function handleUnderstandCommand(args: string[]): Promise<void> {
  const { json, inputPath } = parseArgs(args);
  const plan = await inspectInitialization();
  const input = inputPath ? readReviewInput(inputPath) : undefined;
  const report = buildUnderstandingReview(plan.discovery, input);

  if (json) {
    console.log(JSON.stringify(report));
    return;
  }

  console.log("Guided project understanding review");
  console.log("");
  console.log(`Project: ${escapeTerminalControlText(report.projectRoot)}`);
  console.log(`Workspace: ${report.projectShape}`);
  console.log("");
  printEvidence("What Livariant can confirm:", report.confirmed);
  printEvidence("What Livariant strongly infers:", report.stronglyInferred);
  printEvidence("What remains uncertain:", report.uncertain);

  console.log("Needs attention:");
  if (report.attention.length === 0) console.log("- none");
  else for (const item of report.attention) {
    console.log(`- ${escapeTerminalControlText(item.message)} (${item.provenance.map(escapeTerminalControlText).join(", ")})`);
  }
  console.log("");

  console.log("Questions that would improve understanding:");
  if (report.questions.length === 0) console.log("- none");
  else for (const question of report.questions) {
    console.log(`- ${escapeTerminalControlText(question.id)}: ${escapeTerminalControlText(question.prompt)}`);
  }
  console.log("");

  console.log("Candidate review evidence:");
  if (report.candidateEvidence.length === 0) console.log("- none supplied");
  else for (const item of report.candidateEvidence) {
    console.log(`- ${escapeTerminalControlText(item.candidateId)} [candidate-evidence] ${escapeTerminalControlText(item.target)}: ${escapeTerminalControlText(item.statement)}`);
  }
  console.log("");

  console.log("Discovery and review input remain evidence, not Project Brain truth or Authority.");
  console.log("Changes made: 0");
}
