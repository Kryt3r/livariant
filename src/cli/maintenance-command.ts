import { readSemanticProposalCandidateFile } from "../runtime/semantic-proposal.js";
import { maintainSemanticProjectState } from "../runtime/semantic-maintenance.js";
import { parseSemanticMaintenanceArgs } from "./maintenance-args.js";

export async function handleMaintenanceCommand(args: string[]): Promise<void> {
  let json = args.includes("--json");
  try {
    const parsed = parseSemanticMaintenanceArgs(args);
    json = parsed.json;
    const candidate = await readSemanticProposalCandidateFile(parsed.inputPath);
    const result = await maintainSemanticProjectState(candidate, parsed.authorizationId);

    if (json) {
      console.log(JSON.stringify(result));
    } else if (result.state === "authorization-required") {
      console.log("Semantic maintenance requires separate authorization");
      console.log(`Project: ${result.actionableProposal.stableProjectIdentity}`);
      console.log(`Proposal: ${result.actionableProposal.actionableProposalId}`);
      console.log(`Scope: ${result.actionableProposal.mutationScope.domain}/${result.actionableProposal.mutationScope.changeKind}`);
      console.log("Semantic changes made: 0");
      console.log("Next: authorize the exact Actionable Proposal through the supported livariant authorize flow, then rerun maintain with --authorization <id>.");
    } else if (result.state === "review-required") {
      console.log("Semantic maintenance requires review; no mutation is needed or safely actionable from this candidate.");
      for (const finding of result.findings) console.log(`- ${finding.code}: ${finding.message}`);
      console.log("Semantic changes made: 0");
    } else if (result.state === "blocked") {
      console.log("Semantic maintenance blocked");
      console.log(`Phase: ${result.phase}`);
      console.log(`Reason: ${result.message}`);
      console.log(`Recovery required: ${result.recoveryRequired ? "yes" : "no"}`);
      console.log(`Semantic changes made: ${result.semanticChangesMade}`);
    } else if (result.state === "completed-context-blocked") {
      console.log("Semantic maintenance mutation completed, but refreshed context is blocked");
      console.log(`Authorization: ${result.apply.authorizationId}`);
      console.log(`Proposal: ${result.apply.actionableProposalId}`);
      console.log("Semantic changes made: 1");
      console.log("Refreshed context: blocked; inspect Doctor/context findings before continuing.");
    } else {
      console.log("Semantic maintenance completed");
      console.log(`Authorization: ${result.apply.authorizationId}`);
      console.log(`Proposal: ${result.apply.actionableProposalId}`);
      console.log(`Refreshed baseline: ${result.context.baseline.digest}`);
      console.log("Semantic changes made: 1");
    }

    if (result.state === "blocked") process.exitCode = 2;
    else if (result.state === "review-required" || result.state === "authorization-required") process.exitCode = 3;
    else if (result.state === "completed-context-blocked") process.exitCode = 4;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Semantic maintenance input is invalid.";
    if (json) {
      console.log(JSON.stringify({
        state: "blocked",
        phase: "input",
        message,
        recoveryRequired: false,
        mutationOutcome: "not-applied",
        semanticChangesMade: 0,
      }));
    } else {
      console.log("Semantic maintenance blocked");
      console.log(`Reason: ${message}`);
      console.log("Semantic changes made: 0");
    }
    process.exitCode = 2;
  }
}
