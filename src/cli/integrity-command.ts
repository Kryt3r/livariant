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

async function acceptCurrent(args: string[]): Promise<void> {
  validateArgs(args, new Set(["--acknowledge-current-state", "--json"]));
  const json = hasFlag(args, "--json");
  if (!hasFlag(args, "--acknowledge-current-state")) {
    throw new Error("Establishing the initial Project Brain integrity checkpoint requires --acknowledge-current-state after reviewing the current bytes/state.");
  }

  const state = await inspectProjectBrainIntegrity();
  if (state.state === "match") {
    if (json) console.log(JSON.stringify({ state: "already-established", baseline: state.current, changesMade: 0 }));
    else {
      console.log("Project Brain integrity checkpoint is already established for the current material state.");
      console.log("Changes made: 0");
    }
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

  const receipt = await recordAcceptedProjectBrainState(process.cwd(), "manual-bootstrap");
  if (json) {
    console.log(JSON.stringify({
      state: "established",
      baseline: receipt.baseline,
      stableProjectIdentity: receipt.stableProjectIdentity,
      sameUserAgentResistantAuthority: false,
      changesMade: 0,
    }));
    return;
  }
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
  throw new Error("Integrity command supports 'inspect [--json]' or 'accept-current --acknowledge-current-state [--json]'.");
}
