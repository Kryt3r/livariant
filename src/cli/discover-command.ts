import { inspectInitialization } from "../runtime/index.js";

function parseArgs(args: string[]): { json: boolean } {
  if (args.length === 0) return { json: false };
  if (args.length === 1 && args[0] === "--json") return { json: true };
  throw new Error("Discover supports only optional --json.");
}

export async function handleDiscoverCommand(args: string[]): Promise<void> {
  const { json } = parseArgs(args);
  const plan = await inspectInitialization();
  const report = plan.discovery;

  if (json) {
    console.log(JSON.stringify(report));
    return;
  }

  console.log("Read-only project discovery");
  console.log("");
  console.log(`Project: ${report.projectRoot}`);
  console.log(`Workspace: ${report.projectShape}`);
  console.log("");
  console.log("Observed evidence:");
  if (report.evidence.length === 0) {
    console.log("- none");
  } else {
    for (const item of report.evidence) {
      console.log(`- [${item.confidence}] ${item.value} (${item.provenance})`);
    }
  }

  console.log("");
  console.log("Needs attention:");
  if (report.attention.length === 0) {
    console.log("- none");
  } else {
    for (const item of report.attention) {
      console.log(`- [${item.severity}] ${item.code}: ${item.message} (${item.provenance.join(", ")})`);
    }
  }

  console.log("");
  console.log("Still unknown:");
  console.log(report.unknowns.length === 0 ? "- none" : report.unknowns.map((item) => `- ${item}`).join("\n"));
  console.log("");
  console.log("Evidence is not automatically accepted as Project Brain truth.");
  console.log("Changes made: 0");
}
