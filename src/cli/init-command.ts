import { realpath } from "node:fs/promises";
import {
  initializeProject,
  inspectInitialization,
  type InitializationPlan,
} from "../runtime/index.js";
import {
  buildLifecycleGuardianAuthorityRequest,
  lifecycleMaterialSha256,
} from "../guardian/lifecycle-authority.js";
import {
  consumeLifecycleGuardianAuthority,
  issueLifecycleGuardianAuthority,
} from "../guardian/lifecycle-authority-transition.js";

function mode(args: string[]): "plan" | "authorize" | "apply" {
  const authorize = args.includes("--authorize");
  const apply = args.includes("--apply");
  const unknown = args.filter((arg) => arg !== "--authorize" && arg !== "--apply");
  if (unknown.length > 0) throw new Error(`Init contains unsupported argument: ${unknown[0]}.`);
  if (authorize && apply) throw new Error("Init --authorize and --apply are separate phases and may not be supplied together.");
  return authorize ? "authorize" : apply ? "apply" : "plan";
}

function printInitializationPlan(plan: InitializationPlan): void {
  console.log("Initialization assessment");
  console.log("");
  console.log(`Project: ${plan.projectState}`);
  console.log(`Project Brain: ${plan.projectBrainHealth}`);
  console.log(`Action: ${plan.action}`);
  console.log("");
  console.log("Verified evidence:");
  if (plan.evidence.length === 0) console.log("- none");
  else for (const evidence of plan.evidence) console.log(`- ${evidence}`);
  console.log("");
  console.log("Project files to modify:");
  console.log(plan.projectFilesToModify.length === 0 ? "- none" : plan.projectFilesToModify.map((file) => `- ${file}`).join("\n"));
  console.log("");
  console.log("Project Brain files to create:");
  console.log(plan.filesToCreate.length === 0 ? "- none" : plan.filesToCreate.map((file) => `- ${file}`).join("\n"));
  if (plan.reason) {
    console.log("");
    console.log(`Reason: ${plan.reason}`);
  }
}

async function authorityMaterial(plan: InitializationPlan) {
  const stablePlan = {
    projectState: plan.projectState,
    projectBrainHealth: plan.projectBrainHealth,
    evidence: plan.evidence,
    filesToCreate: plan.filesToCreate,
    projectFilesToModify: plan.projectFilesToModify,
    unknowns: plan.unknowns,
    action: plan.action,
    confirmedProjectName: plan.confirmedProjectName ?? null,
    reason: plan.reason ?? null,
    discovery: plan.discovery,
  };
  return buildLifecycleGuardianAuthorityRequest({
    operation: "initialize",
    physicalProjectRoot: await realpath(plan.projectRoot),
    materialFields: [
      { label: "project-state", value: plan.projectState },
      { label: "project-brain-health", value: plan.projectBrainHealth },
      { label: "initialization-action", value: plan.action },
      { label: "plan-sha256", value: lifecycleMaterialSha256(stablePlan) },
    ],
  });
}

export async function handleInitCommand(args: string[]): Promise<void> {
  const selectedMode = mode(args);
  const plan = await inspectInitialization();
  printInitializationPlan(plan);

  if (plan.action !== "initialize") {
    if (selectedMode !== "plan") process.exitCode = 3;
    return;
  }

  const material = await authorityMaterial(plan);
  console.log("");
  console.log("Independent lifecycle authorization required: yes");

  if (selectedMode === "plan") {
    console.log("No changes applied. Rerun with 'livariant init --authorize' to request exact protected Guardian lifecycle Authority, then rerun with --apply.");
    return;
  }

  if (selectedMode === "authorize") {
    const issued = await issueLifecycleGuardianAuthority(material);
    console.log("Protected Guardian lifecycle Authority issued.");
    console.log(`Guardian record: ${issued.record.recordId}`);
    console.log(`Exact material SHA-256: ${material.materialSha256}`);
    console.log("Lifecycle changes made: 0");
    return;
  }

  await consumeLifecycleGuardianAuthority(material);
  const result = await initializeProject(process.cwd(), { authorized: true });
  console.log("");
  console.log(`Project Brain initialized: ${result.projectBrainPath}`);
  console.log("Protected integrity: required before canonical Project Brain reads.");
  console.log("Review with 'livariant integrity inspect', then run 'livariant integrity accept-current'.");
}
