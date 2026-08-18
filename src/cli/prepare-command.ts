import { buildActionableProposal } from "../runtime/actionable-proposal.js";
import { readSemanticProposalCandidateFile } from "../runtime/semantic-proposal.js";
import { parseProposalAuthorityArgs } from "./proposal-authority-args.js";
import { requireProtectedCanonicalProject } from "./protected-project-gate.js";

export async function handlePrepareCommand(args: string[]): Promise<void> {
  let json = args.includes("--json");
  try {
    const parsed = parseProposalAuthorityArgs(args);
    json = parsed.json;
    await requireProtectedCanonicalProject();
    const candidate = await readSemanticProposalCandidateFile(parsed.inputPath);
    const result = await buildActionableProposal(candidate);
    if (json) console.log(JSON.stringify(result));
    else if (result.state === "actionable-proposal") {
      const proposal = result.proposal;
      console.log("Actionable proposal prepared");
      console.log(`ID: ${proposal.actionableProposalId}`);
      console.log(`Project: ${proposal.stableProjectIdentity}`);
      console.log(`Baseline: ${proposal.baseline.digest}`);
      console.log(`Scope: ${proposal.mutationScope.domain}/${proposal.mutationScope.changeKind}`);
      console.log(`Statement: ${proposal.mutationScope.proposedStatement.replace(/[\r\n\u0000-\u001f\u007f]/g, " ")}`);
      console.log("Authorization eligible: yes");
      console.log("Mutation authorization: no");
      console.log("Apply supported: no");
      console.log("Changes made: 0");
    } else {
      console.log("Actionable proposal blocked");
      for (const finding of result.findings) console.log(`- ${finding.message}`);
      console.log("Changes made: 0");
      process.exitCode = 3;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prepare input is invalid.";
    if (json) console.log(JSON.stringify({ state: "invalid-input", error: { code: "prepare-invalid", message }, changesMade: 0 }));
    else {
      console.log("Prepare input invalid");
      console.log(`Reason: ${message}`);
      console.log("Changes made: 0");
    }
    process.exitCode = 2;
  }
}