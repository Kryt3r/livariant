import { bootstrapProductionGuardian } from "../guardian/bootstrap.js";
import { inspectProductionGuardianRoot } from "../guardian/trust-root.js";

function jsonRequested(args: string[]): boolean {
  return args.includes("--json");
}

function validateArgs(args: string[], subcommand: "status" | "bootstrap"): void {
  const unknown = args.filter((arg) => arg !== subcommand && arg !== "--json");
  if (unknown.length > 0) throw new Error(`Guardian ${subcommand} contains unsupported argument: ${unknown[0]}.`);
}

export async function handleGuardianCommand(args: string[]): Promise<void> {
  const [subcommand] = args;
  if (subcommand !== "status" && subcommand !== "bootstrap") {
    throw new Error("Guardian command requires: guardian status [--json] or guardian bootstrap [--json].");
  }
  validateArgs(args, subcommand);

  if (subcommand === "bootstrap") {
    const result = await bootstrapProductionGuardian();
    if (jsonRequested(args)) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    console.log("Livariant Guardian bootstrap");
    console.log(`State: ${result.state}`);
    console.log(`Platform: ${result.platform}`);
    console.log(`Root: ${result.root}`);
    console.log(`Helper SHA-256: ${result.helperSha256}`);
    console.log("Authority issued: no");
    console.log(`Changes made: ${result.changesMade}`);
    console.log(`Next: ${result.nextStep}`);
    console.log(`Bootstrap trust assumption: ${result.bootstrapTrustAssumption}`);
    return;
  }

  const inspection = await inspectProductionGuardianRoot(process.cwd());
  if (jsonRequested(args)) {
    process.stdout.write(`${JSON.stringify(inspection, null, 2)}\n`);
    return;
  }

  console.log("Livariant Guardian");
  console.log(`State: ${inspection.state}`);
  console.log(`Platform: ${inspection.platform}`);
  console.log(`Root: ${inspection.root ?? "unsupported"}`);
  console.log(`Guardian ready: ${inspection.guardianReady ? "yes" : "no"}`);
  console.log(`Reason: ${inspection.reason}`);
  console.log("Authority granted: no");
  console.log("Changes made: 0");
  for (const limitation of inspection.limitations) console.log(`- ${limitation}`);
}
