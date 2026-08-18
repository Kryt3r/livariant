import { lstat, readFile } from "node:fs/promises";
import {
  PROVIDER_CONTEXT_COPY_FILE_MAX_BYTES,
  PROVIDER_RETURN_FILE_MAX_BYTES,
} from "../runtime/provider-return.js";
import { processProtectedProviderReturn } from "../runtime/protected-provider-return.js";
import { parseProviderReturnArgs } from "./provider-return-args.js";

async function readBoundedJson(path: string, maxBytes: number, label: string): Promise<unknown> {
  const stat = await lstat(path);
  if (!stat.isFile()) throw new Error(`${label} path must reference a regular file.`);
  if (stat.size > maxBytes) throw new Error(`${label} exceeds the supported size limit.`);
  const bytes = await readFile(path);
  if (bytes.length > maxBytes) throw new Error(`${label} exceeds the supported size limit.`);
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new Error(`${label} must contain valid JSON.`);
  }
}

export async function handleProviderReturnCommand(args: string[]): Promise<void> {
  let json = args.includes("--json");
  try {
    const parsed = parseProviderReturnArgs(args);
    json = parsed.json;
    const [contextValue, returnValue] = await Promise.all([
      readBoundedJson(parsed.contextPath, PROVIDER_CONTEXT_COPY_FILE_MAX_BYTES, "Provider Context copy"),
      readBoundedJson(parsed.inputPath, PROVIDER_RETURN_FILE_MAX_BYTES, "Provider return input"),
    ]);
    const result = await processProtectedProviderReturn(contextValue, returnValue, parsed.authorizationId);

    if (json) {
      console.log(JSON.stringify(result));
    } else if (result.state === "no-candidate") {
      console.log("Provider return contains no durable-change candidate");
      console.log(`Provider: ${result.provider}`);
      console.log(`Context packet: ${result.contextPacketId}`);
      console.log("Semantic changes made: 0");
    } else if (result.state === "stale-context") {
      console.log("Provider return is stale");
      console.log(`Provider: ${result.provider}`);
      console.log(`Issued/supplied baseline: ${result.suppliedBaselineDigest}`);
      console.log(`Current baseline: ${result.currentBaseline.digest}`);
      console.log(`Reason: ${result.message}`);
      console.log("Semantic changes made: 0");
    } else if (result.state === "mismatched-context") {
      console.log("Provider return does not match its context");
      console.log(`Phase: ${result.phase}`);
      console.log(`Reason: ${result.message}`);
      console.log("Semantic changes made: 0");
    } else if (result.state === "blocked") {
      console.log("Provider return processing blocked");
      console.log(`Phase: ${result.phase}`);
      console.log(`Reason: ${result.message}`);
      console.log(`Recovery required: ${result.recoveryRequired ? "yes" : "no"}`);
      console.log(`Semantic changes made: ${result.semanticChangesMade}`);
    } else {
      console.log("Provider return candidate received");
      console.log(`Provider: ${result.provider}`);
      console.log(`Context packet: ${result.contextPacketId}`);
      console.log(`Maintenance state: ${result.maintenance.state}`);
      console.log(`Semantic changes made: ${result.semanticChangesMade}`);
      if (result.maintenance.state === "authorization-required") {
        console.log("Next: authorize the exact Actionable Proposal through livariant authorize, then rerun provider-return with --authorization <id>.");
      } else if (result.maintenance.state === "completed-context-blocked") {
        console.log("Protected integrity: required before the changed Project Brain can become canonical context.");
        console.log("Next: review the resulting Project Brain and run 'livariant integrity accept-current'.");
      }
    }

    if (result.state === "mismatched-context" || result.state === "stale-context" || result.state === "blocked") process.exitCode = 2;
    else if (result.state === "candidate-received"
      && (result.maintenance.state === "review-required" || result.maintenance.state === "authorization-required")) process.exitCode = 3;
    else if (result.state === "candidate-received" && result.maintenance.state === "completed-context-blocked") process.exitCode = 4;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider return input is invalid.";
    if (json) {
      console.log(JSON.stringify({
        state: "blocked",
        phase: "input",
        message,
        recoveryRequired: false,
        semanticChangesMade: 0,
      }));
    } else {
      console.log("Provider return processing blocked");
      console.log(`Reason: ${message}`);
      console.log("Semantic changes made: 0");
    }
    process.exitCode = 2;
  }
}