import { autonomyPolicy, isAutonomyProfile, readAutonomyProfile, writeAutonomyProfile, type AutonomyProfile } from "../autonomy/profile.js";

interface ParsedAutonomyArgs {
  action: "show" | "set";
  profile?: AutonomyProfile;
  acknowledgeRisk: boolean;
  json: boolean;
}

function parseArgs(args: string[]): ParsedAutonomyArgs {
  const action = args[0];
  if (action !== "show" && action !== "set") throw new Error("Autonomy command must be 'show' or 'set'.");
  let profile: AutonomyProfile | undefined;
  let acknowledgeRisk = false;
  let json = false;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      if (json) throw new Error("Autonomy accepts --json at most once.");
      json = true;
      continue;
    }
    if (arg === "--acknowledge-risk") {
      if (acknowledgeRisk) throw new Error("Autonomy accepts --acknowledge-risk at most once.");
      acknowledgeRisk = true;
      continue;
    }
    if (arg === "--profile") {
      if (profile !== undefined) throw new Error("Autonomy accepts --profile at most once.");
      const value = args[index + 1];
      if (!isAutonomyProfile(value)) throw new Error("Autonomy profile must be 'ask-always', 'ask-important', or 'continue-without-confirmation'.");
      profile = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown autonomy argument: ${arg}`);
  }

  if (action === "show" && profile !== undefined) throw new Error("Autonomy show does not accept --profile.");
  if (action === "show" && acknowledgeRisk) throw new Error("Autonomy show does not accept --acknowledge-risk.");
  if (action === "set" && profile === undefined) throw new Error("Autonomy set requires --profile <profile>.");
  if (profile === "continue-without-confirmation" && !acknowledgeRisk) {
    throw new Error("The continue-without-confirmation profile requires --acknowledge-risk after reviewing its safety warning.");
  }
  if (profile !== "continue-without-confirmation" && acknowledgeRisk) {
    throw new Error("--acknowledge-risk is only valid with continue-without-confirmation.");
  }

  return { action, profile, acknowledgeRisk, json };
}

function printPolicy(profile: AutonomyProfile): void {
  const policy = autonomyPolicy(profile);
  console.log(`Profile: ${policy.profile}`);
  console.log(`Mode: ${policy.label}`);
  console.log(`Behavior: ${policy.summary}`);
  if (policy.warning) console.log(`Warning: ${policy.warning}`);
  console.log(`Ask before routine discretionary steps: ${policy.confirmation.routine ? "yes" : "no"}`);
  console.log(`Ask before important discretionary steps: ${policy.confirmation.important ? "yes" : "no"}`);
  console.log("Hard authority confirmation remains required: yes");
  console.log("Grants mutation/runtime/release authority: no");
}

export async function handleAutonomyCommand(args: string[]): Promise<void> {
  let json = args.includes("--json");
  try {
    const parsed = parseArgs(args);
    json = parsed.json;
    if (parsed.action === "show") {
      const state = await readAutonomyProfile(process.cwd());
      if (json) console.log(JSON.stringify(state));
      else {
        console.log("Livariant autonomy profile");
        printPolicy(state.profile);
        console.log(`Source: ${state.source}`);
        console.log(`Persisted: ${state.persisted ? "yes" : "no"}`);
        if (state.stableProjectIdentity) console.log(`Project: ${state.stableProjectIdentity}`);
        if (state.reason) console.log(`Note: ${state.reason}`);
      }
      return;
    }

    const profile = parsed.profile as AutonomyProfile;
    const state = await writeAutonomyProfile(profile, process.cwd());
    if (json) console.log(JSON.stringify({ state: "saved", ...state }));
    else {
      console.log("Autonomy profile saved");
      printPolicy(state.profile);
      console.log(`Project: ${state.stableProjectIdentity}`);
      console.log("Storage: machine-local, project-bound");
      console.log("Project files changed: 0");
      console.log("Authority granted: no");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autonomy profile input is invalid.";
    if (json) console.log(JSON.stringify({ state: "blocked", error: { code: "autonomy-profile-blocked", message }, projectFilesChanged: 0, authorityGranted: false }));
    else {
      console.log("Autonomy profile blocked");
      console.log(`Reason: ${message}`);
      console.log("Project files changed: 0");
      console.log("Authority granted: no");
    }
    process.exitCode = 2;
  }
}
