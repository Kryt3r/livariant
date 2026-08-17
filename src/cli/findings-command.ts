import { scanProjectFindings, type ProjectFindingSeverity } from "../findings/project-findings.js";

function parseArgs(args: string[]): { json: boolean } {
  if (args.length === 0) return { json: false };
  if (args.length === 1 && args[0] === "--json") return { json: true };
  throw new Error("Findings supports only optional --json.");
}

const severityOrder: ProjectFindingSeverity[] = ["critical", "high", "medium", "low"];

export async function handleFindingsCommand(args: string[]): Promise<void> {
  const { json } = parseArgs(args);
  const report = scanProjectFindings();

  if (json) {
    console.log(JSON.stringify(report));
    return;
  }

  console.log("Evidence-backed project findings");
  console.log("");
  console.log(`Project: ${report.projectRoot}`);
  console.log(`Findings: ${report.findings.length}`);
  console.log(`Severity: ${severityOrder.map((severity) => `${severity}=${report.summary[severity]}`).join(", ")}`);
  console.log("");

  if (report.findings.length === 0) {
    console.log("No findings from the supported v1 deterministic rules.");
  } else {
    for (const item of report.findings) {
      console.log(`[${item.severity.toUpperCase()}] ${item.ruleId} - ${item.title}`);
      console.log(`  Category: ${item.category}`);
      console.log(`  Confidence: ${item.confidence}`);
      console.log(`  Why: ${item.explanation}`);
      console.log("  Evidence:");
      for (const evidence of item.evidence) console.log(`  - ${evidence.path}: ${evidence.detail}`);
      console.log(`  Next: ${item.nextStep}`);
      console.log("");
    }
  }

  console.log("Important limits:");
  for (const limitation of report.limitations) console.log(`- ${limitation}`);
  console.log("");
  console.log("Finding != Truth != Authority.");
  console.log("Changes made: 0");
}
