import { inspectProductionGuardianRoot } from "../guardian/trust-root.js";

function jsonRequested(args: string[]): boolean {
  return args.includes("--json");
}

function unknownArgs(args: string[]): string[] {
  return args.filter((arg) => arg !== "status" && arg !== "--json");
}

export async function handleGuardianCommand(args: string[]): Promise<void> {
  const [subcommand] = args;
  if (subcommand !== "status") {
    throw new Error("Guardian command requires: guardian status [--json].");
  }
  const unknown = unknownArgs(args);
  if (unknown.length > 0) throw new Error(`Guardian status contains unsupported argument: ${unknown[0]}.`);

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
