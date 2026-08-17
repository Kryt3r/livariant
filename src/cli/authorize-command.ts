import { issueSemanticGuardianAuthority } from "../guardian/semantic-authority-transition.js";
import { readActionableProposalFile } from "../runtime/actionable-proposal.js";
import { authorizeActionableProposal } from "../runtime/authorization.js";
import { parseProposalAuthorityArgs } from "./proposal-authority-args.js";

export async function handleAuthorizeCommand(args: string[]): Promise<void> {
  let json = args.includes("--json");
  try {
    const parsed = parseProposalAuthorityArgs(args);
    json = parsed.json;
    const proposal = await readActionableProposalFile(parsed.inputPath);
    const result = await authorizeActionableProposal(proposal);
    const guardian = await issueSemanticGuardianAuthority(result.authorization.authorizationId, proposal);
    const output = {
      ...result,
      guardianAuthorityVerified: true as const,
      guardianRecordId: guardian.record.recordId,
      guardianMaterialSha256: guardian.material.materialSha256,
    };
    if (json) console.log(JSON.stringify(output));
    else {
      console.log("Action authorized");
      console.log(`Authorization: ${result.authorization.authorizationId}`);
      console.log(`Project: ${result.authorization.stableProjectIdentity}`);
      console.log(`Proposal: ${result.authorization.actionableProposalId}`);
      console.log(`Baseline: ${result.authorization.baseline.digest}`);
      console.log(`Scope: ${result.authorization.mutationScope.domain}/${result.authorization.mutationScope.changeKind}`);
      console.log("Protected Guardian authority: verified");
      console.log(`Guardian record: ${guardian.record.recordId}`);
      console.log("Legacy machine-local receipt: audit/recovery evidence only; not sufficient Authority");
      console.log("Semantic changes made: 0");
      console.log(`Authorization state changes made: ${result.authorizationStateChangesMade}`);
      console.log("Apply supported: yes, only with matching unconsumed Guardian Authority");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authorization input is invalid.";
    if (json) console.log(JSON.stringify({ state: "blocked", error: { code: "authorization-blocked", message }, semanticChangesMade: 0 }));
    else {
      console.log("Authorization blocked");
      console.log(`Reason: ${message}`);
      console.log("Semantic changes made: 0");
    }
    process.exitCode = 2;
  }
}
