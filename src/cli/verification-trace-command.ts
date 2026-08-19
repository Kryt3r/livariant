import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assessVerificationTrace } from "../verification/index.js";

interface VerificationTraceArgs {
  inputPath: string;
  json: boolean;
}

function parseArgs(args: string[]): VerificationTraceArgs {
  let inputPath: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--input") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--input requires a JSON file path.");
      if (inputPath !== undefined) throw new Error("--input may only be provided once.");
      inputPath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unsupported verification-trace argument: ${arg}.`);
  }

  if (!inputPath) throw new Error("verification-trace requires --input <trace.json>.");
  return { inputPath, json };
}

function renderText(result: ReturnType<typeof assessVerificationTrace>): void {
  console.log("Livariant verification trace");
  console.log(`Coverage: ${result.coverage}`);
  console.log(`Supported: ${result.counts.supported}`);
  console.log(`Contradicted: ${result.counts.contradicted}`);
  console.log(`Unproven: ${result.counts.unproven}`);
  console.log("");

  for (const item of result.items) {
    console.log(`${item.target.id} — ${item.target.title}`);
    console.log(`Assessment: ${item.assessment.toUpperCase()}`);
    console.log(`Reason: ${item.reason}`);
    if (item.implementationClaimIds.length > 0) {
      console.log(`Implementation claims: ${item.implementationClaimIds.join(", ")}`);
    }
    if (item.sourceReferences.length > 0) {
      console.log(`Evidence sources: ${item.sourceReferences.join(", ")}`);
    }
    console.log("");
  }

  if (result.coverage === "attention-required") {
    console.log("Not all requested work is sufficiently evidenced. This assessment is read-only and does not set project completion state.");
  } else {
    console.log("All traced targets have supporting verification evidence. This is evidence coverage, not accepted completion.");
  }
  console.log("Changes made: 0");
}

export async function handleVerificationTraceCommand(args: string[]): Promise<void> {
  let parsed: VerificationTraceArgs | undefined;
  try {
    parsed = parseArgs(args);
    const raw = await readFile(resolve(parsed.inputPath), "utf8");
    const input = JSON.parse(raw) as unknown;
    const result = assessVerificationTrace(input);
    if (parsed.json) {
      console.log(JSON.stringify({ state: "assessed", result, changesMade: 0 }));
    } else {
      renderText(result);
    }
  } catch (error) {
    const json = parsed?.json ?? args.includes("--json");
    const message = error instanceof Error ? error.message : "Verification trace input is invalid.";
    if (json) {
      console.log(JSON.stringify({ state: "invalid-input", error: { code: "verification-trace-invalid", message }, changesMade: 0 }));
    } else {
      console.log("Verification trace input invalid");
      console.log(`Reason: ${message}`);
      console.log("Changes made: 0");
    }
    process.exitCode = 2;
  }
}
