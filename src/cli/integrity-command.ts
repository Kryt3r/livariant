import { createInterface } from "node:readline/promises";
import { stdin, stderr } from "node:process";
import { inspectProjectBrainIntegrity, recordAcceptedProjectBrainState } from "../project-brain/integrity.js";
import { runDoctor } from "../runtime/doctor.js";

function hasFlag(args: string[], flag: string): boolean {
  return args.filter((value) => value === flag).length === 1;
}

function validateArgs(args: string[], allowed: ReadonlySet<string>): void {
  for (const value of args) if (!allowed.has(value)) throw new Error(`Unsupported integrity argument: ${value}`);
  for (const value of allowed) if (args.filter((candidate) => candidate === value).length > 1) throw new Error(`Integrity argument may appear only once: ${value}`);
}

function renderInspect(state: Awaited<ReturnType<typeof inspectProjectBrainIntegrity>>, json: boolean): void {
  if (json) {
    console.log(JSON.stringify({ ...state, changesMade: 0 }));
    return;
  }
  console.log("Project Brain integrity");
  console.log("");
  console.log(`State: ${state.state}`);
  if (state.current) console.log(`Current material: ${state.current.algorithm}:${state.current.digest}`);
  if (state.state === "match") console.log(`Accepted material: ${state.receipt.baseline.algorithm}:${state.receipt.baseline.digest}`);
  if (state.state === "mismatch") {
    console.log(`Accepted material: ${state.receipt.baseline.algorithm}:${state.receipt.baseline.digest}`);
    console.log(`Reason: ${state.reason}`);
  }
  if (state.state === "invalid") console.log(`Reason: ${state.reason}`);
  console.log("Machine-local integrity checkpoint: detection evidence only; it is not same-user Agent-resistant Authority.");
  console.log("Changes made: 0");
}

async function inspect(args: string[]): Promise<void> {
  validateArgs(args, new Set(["--json"]));
  const state = await inspectProjectBrainIntegrity();
  renderInspect(state, hasFlag(args, "--json"));
  if (state.state === "mismatch" || state.state === "invalid") process.exitCode = 3;
}

async function requireInteractiveBootstrapConfirmation(digest: string): Promise<void> {
  if (!stdin.isTTY || !stderr.isTTY) {
    throw new Error("Initial Project Brain integrity acceptance requires an interactive local terminal. Non-interactive agents, providers, scripts, redirected input, and CI cannot establish trusted-current material.");
  }
  const phrase = `ACCEPT PROJECT BRAIN ${digest.slice(0, 12)}`;
  stderr.write("Project Brain integrity bootstrap review\n");
  stderr.write(`Current material digest: ${digest}\n`);
  stderr.write("This accepts the current managed Project Brain semantic bytes as the starting canonical material state.\n");
  stderr.write("Do not continue if these bytes were changed by an agent or other process without your review.\n");
  stderr.write(`Type exactly: ${phrase}\n`);
  const terminal = createInterface({ input: stdin, output: stderr });
  try {
    const answer = await terminal.question("> ");
    if (answer !== phrase) throw new Error("Project Brain integrity bootstrap confirmation did not match the exact material challenge.");
  } finally {
    terminal.close();
  }
}

async function acceptCurrent(args: string[]): Promise<void> {
  validateArgs(args, new Set<string>());
  const state = await inspectProjectBrainIntegrity();
  if (state.state === "match") {
    console.log("Project Brain integrity checkpoint is already established for the current material state.");
    console.log("Changes made: 0");
    return;
  }
  if (state.state !== "missing") {
    throw new Error("Current Project Brain integrity evidence is mismatched or invalid. Refusing to bless divergent bytes through the bootstrap command; diagnose/recover the managed state instead.");
  }

  const doctor = await runDoctor();
  const disallowed = doctor.findings.filter((finding) => finding.code !== "project-brain-integrity-unestablished");
  if (doctor.state !== "drift-detected" || disallowed.length > 0) {
    const reason = doctor.findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
    throw new Error(`Initial integrity acceptance requires an otherwise healthy Project Brain: ${reason}`);
  }

  await requireInteractiveBootstrapConfirmation(state.current.digest);
  const receipt = await recordAcceptedProjectBrainState(process.cwd(), "manual-bootstrap");
  console.log("Initial machine-local Project Brain integrity checkpoint established.");
  console.log(`Accepted material: ${receipt.baseline.algorithm}:${receipt.baseline.digest}`);
  console.log("This checkpoint detects later project-local/direct-writer drift. It is not a same-user Agent-resistant Authority boundary.");
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
