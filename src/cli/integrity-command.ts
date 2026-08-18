import { createInterface } from "node:readline/promises";
import { stdin, stderr } from "node:process";
import {
  establishProtectedProjectBrainIntegrityState,
  inspectProtectedProjectBrainIntegrity,
  type ProtectedProjectBrainIntegrityState,
} from "../project-brain/protected-integrity.js";
import { runDoctor as runLocalEvidenceDoctor } from "../runtime/doctor.js";

function hasFlag(args: string[], flag: string): boolean {
  return args.filter((value) => value === flag).length === 1;
}

function validateArgs(args: string[], allowed: ReadonlySet<string>): void {
  for (const value of args) if (!allowed.has(value)) throw new Error(`Unsupported integrity argument: ${value}`);
  for (const value of allowed) if (args.filter((candidate) => candidate === value).length > 1) throw new Error(`Integrity argument may appear only once: ${value}`);
}

function localCurrent(state: ProtectedProjectBrainIntegrityState) {
  return state.local.current;
}

function renderInspect(state: ProtectedProjectBrainIntegrityState, json: boolean): void {
  if (json) {
    console.log(JSON.stringify({ ...state, changesMade: 0 }));
    return;
  }
  console.log("Project Brain integrity");
  console.log("");
  console.log(`State: ${state.state}`);
  const current = localCurrent(state);
  if (current) console.log(`Current material: ${current.algorithm}:${current.digest}`);
  if (state.local.state === "match" || state.local.state === "mismatch") {
    console.log(`Local evidence material: ${state.local.receipt.baseline.algorithm}:${state.local.receipt.baseline.digest}`);
  }
  if (state.state === "match") {
    console.log(`Guardian Authority record: ${state.guardian.recordId}`);
    console.log(`Guardian material: sha256:${state.guardian.materialSha256}`);
  }
  if (state.state === "mismatch" || state.state === "unprotected" || state.state === "invalid") {
    console.log(`Reason: ${state.state === "mismatch" ? state.local.reason : state.reason}`);
  }
  console.log("Machine-local integrity evidence is diagnostic/cache/recovery material only. Canonical accepted-state Authority requires an exact protected Guardian record.");
  console.log("Changes made: 0");
}

async function inspect(args: string[]): Promise<void> {
  validateArgs(args, new Set(["--json"]));
  const state = await inspectProtectedProjectBrainIntegrity();
  renderInspect(state, hasFlag(args, "--json"));
  if (state.state !== "match") process.exitCode = 3;
}

async function requireInteractiveBootstrapConfirmation(digest: string): Promise<void> {
  if (!stdin.isTTY || !stderr.isTTY) {
    throw new Error("Project Brain integrity acceptance requires an interactive local terminal. Non-interactive agents, providers, scripts, redirected input, and CI cannot establish trusted-current material.");
  }
  const phrase = `ACCEPT PROJECT BRAIN ${digest.slice(0, 12)}`;
  stderr.write("Project Brain integrity review\n");
  stderr.write(`Current material digest: ${digest}\n`);
  stderr.write("This prepares the exact current managed Project Brain semantic bytes for protected Guardian accepted-state Authority.\n");
  stderr.write("Do not continue if these bytes were changed by an agent or other process without your review.\n");
  stderr.write("A second protected Guardian confirmation follows at the operating-system privilege boundary.\n");
  stderr.write(`Type exactly: ${phrase}\n`);
  const terminal = createInterface({ input: stdin, output: stderr });
  try {
    const answer = await terminal.question("> ");
    if (answer !== phrase) throw new Error("Project Brain integrity confirmation did not match the exact material challenge.");
  } finally {
    terminal.close();
  }
}

async function acceptCurrent(args: string[]): Promise<void> {
  validateArgs(args, new Set<string>());
  const state = await inspectProtectedProjectBrainIntegrity();
  if (state.state === "match") {
    console.log("Protected Project Brain integrity Authority is already established for the exact current material state.");
    console.log("Changes made: 0");
    return;
  }
  if (state.state === "mismatch" || state.state === "invalid") {
    throw new Error("Current Project Brain integrity state is mismatched or protected evidence is invalid. Refusing to bless divergent or ambiguous bytes through the bootstrap command; diagnose/recover the managed state instead.");
  }

  const doctor = await runLocalEvidenceDoctor();
  if (state.state === "missing") {
    const disallowed = doctor.findings.filter((finding) => finding.code !== "project-brain-integrity-unestablished");
    if (doctor.state !== "drift-detected" || disallowed.length > 0) {
      const reason = doctor.findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
      throw new Error(`Initial integrity acceptance requires an otherwise healthy Project Brain: ${reason}`);
    }
  } else if (doctor.state !== "healthy") {
    const reason = doctor.findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
    throw new Error(`Protected integrity establishment requires coherent local Project Brain evidence before Guardian review: ${reason}`);
  }

  const current = localCurrent(state);
  if (!current) throw new Error("Current Project Brain integrity material is unavailable.");
  await requireInteractiveBootstrapConfirmation(current.digest);
  const established = await establishProtectedProjectBrainIntegrityState(process.cwd(), "manual-bootstrap");
  console.log("Protected Project Brain integrity Authority established.");
  console.log(`Accepted material: ${established.local.current.algorithm}:${established.local.current.digest}`);
  console.log(`Guardian Authority record: ${established.guardian.recordId}`);
  console.log("Machine-local receipt retained as diagnostic/cache/recovery evidence only; protected Guardian state is the accepted-state Authority.");
  console.log("Changes made: 0");
}

export async function handleIntegrityCommand(args: string[]): Promise<void> {
  const action = args[0] ?? "inspect";
  const rest = args.slice(1);
  if (action === "inspect") {
    await inspect(rest);
    return;
  }
  if (action === "accept-current") {
    await acceptCurrent(rest);
    return;
  }
  throw new Error("Integrity command supports 'inspect [--json]' or interactive 'accept-current'.");
}
