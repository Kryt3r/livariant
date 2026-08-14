import { readActionableProposalFile } from "../runtime/actionable-proposal.js";
import { applyActionableProposal } from "../runtime/semantic-apply.js";
import { parseSemanticApplyArgs } from "./apply-args.js";

export async function handleApplyCommand(args: string[]): Promise<void> {
  let json = args.includes("--json");
  try {
    const parsed = parseSemanticApplyArgs(args);
    json = parsed.json;
    const proposal = await readActionableProposalFile(parsed.inputPath);
    const result = await applyActionableProposal(parsed.authorizationId, proposal);
    if (json) {
      console.log(JSON.stringify(result));
      return;
    }

    console.log("Semantic apply completed");
    console.log(`Authorization: ${result.authorizationId}`);
    console.log(`Project: ${result.stableProjectIdentity}`);
    console.log(`Proposal: ${result.actionableProposalId}`);
    console.log(`Scope: ${result.mutationScope.domain}/${result.mutationScope.changeKind}`);
    console.log("Mutation authorization consumed: yes");
    console.log(`Semantic changes made: ${result.semanticChangesMade}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Semantic apply input is invalid.";
    if (json) {
      console.log(JSON.stringify({
        state: "blocked",
        error: { code: "semantic-apply-blocked", message },
        semanticChangesMade: 0,
      }));
    } else {
      console.log("Semantic apply blocked");
      console.log(`Reason: ${message}`);
      console.log("Semantic changes made: 0");
    }
    process.exitCode = 2;
  }
}
