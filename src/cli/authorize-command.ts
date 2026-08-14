import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { readActionableProposalFile } from "../runtime/actionable-proposal.js";
import { authorizeActionableProposal } from "../runtime/authorization.js";
import { parseProposalAuthorityArgs } from "./proposal-authority-args.js";

function displaySafe(value: string): string {
  return value.replace(/[\r\n\u0000-\u001f\u007f]/g, " ");
}

async function requireInteractiveConfirmation(proposal: Awaited<ReturnType<typeof readActionableProposalFile>>): Promise<void> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Authorization requires an interactive local terminal. Non-interactive callers, providers, scripts, redirected input, and CI cannot create mutation authority.");
  }

  const phrase = `AUTHORIZE ${proposal.materialDigest.digest.slice(0, 12)}`;
  console.log("Authorization review");
  console.log(`Project: ${proposal.stableProjectIdentity}`);
  console.log(`Proposal: ${proposal.actionableProposalId}`);
  console.log(`Proposal digest: ${proposal.materialDigest.digest}`);
  console.log(`Baseline: ${proposal.baseline.digest}`);
  console.log(`Scope: ${proposal.mutationScope.domain}/${proposal.mutationScope.changeKind}`);
  console.log(`Statement: ${displaySafe(proposal.mutationScope.proposedStatement)}`);
  if (proposal.mutationScope.targetDecisionId) console.log(`Target: ${displaySafe(proposal.mutationScope.targetDecisionId)}`);
  console.log("This records narrow authority only. It does not apply the semantic change.");
  console.log(`Type exactly: ${phrase}`);

  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await terminal.question("> ");
    if (answer !== phrase) throw new Error("Authorization confirmation did not match the exact proposal challenge.");
  } finally {
    terminal.close();
  }
}

export async function handleAuthorizeCommand(args: string[]): Promise<void> {
  let json = args.includes("--json");
  try {
    const parsed = parseProposalAuthorityArgs(args);
    json = parsed.json;
    const proposal = await readActionableProposalFile(parsed.inputPath);
    await requireInteractiveConfirmation(proposal);
    const result = await authorizeActionableProposal(proposal);
    if (json) console.log(JSON.stringify(result));
    else {
      console.log("Action authorized");
      console.log(`Authorization: ${result.authorization.authorizationId}`);
      console.log(`Project: ${result.authorization.stableProjectIdentity}`);
      console.log(`Proposal: ${result.authorization.actionableProposalId}`);
      console.log(`Baseline: ${result.authorization.baseline.digest}`);
      console.log(`Scope: ${result.authorization.mutationScope.domain}/${result.authorization.mutationScope.changeKind}`);
      console.log("Independent machine-local authority: verified");
      console.log("Semantic changes made: 0");
      console.log(`Authorization state changes made: ${result.authorizationStateChangesMade}`);
      console.log("Apply supported: no");
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