import { readActionableProposalFile } from "../runtime/actionable-proposal.js";
import { inspectAuthorizationAudit } from "../runtime/authorization.js";
import { applyActionableProposal } from "../runtime/semantic-apply.js";
import { parseSemanticApplyArgs } from "./apply-args.js";
import { requireProtectedCanonicalProject } from "./protected-project-gate.js";

interface ApplyFailureOutcome {
  recoveryRequired: boolean;
  mutationOutcome: "not-applied" | "unknown-recovery-required";
  semanticChangesMade: 0 | "unknown";
}

async function classifyApplyFailure(authorizationId: string | undefined, actionableProposalParsed: boolean): Promise<ApplyFailureOutcome> {
  if (!authorizationId || !actionableProposalParsed) {
    return { recoveryRequired: false, mutationOutcome: "not-applied", semanticChangesMade: 0 };
  }

  try {
    const audit = await inspectAuthorizationAudit();
    const active = audit.active?.authorizationId === authorizationId ? audit.active : null;
    const terminal = audit.history.find((record) => record.authorizationId === authorizationId);

    if (active || terminal?.state === "failed-recovery-required") {
      return {
        recoveryRequired: true,
        mutationOutcome: "unknown-recovery-required",
        semanticChangesMade: "unknown",
      };
    }

    return { recoveryRequired: false, mutationOutcome: "not-applied", semanticChangesMade: 0 };
  } catch {
    return {
      recoveryRequired: true,
      mutationOutcome: "unknown-recovery-required",
      semanticChangesMade: "unknown",
    };
  }
}

export async function handleApplyCommand(args: string[]): Promise<void> {
  let json = args.includes("--json");
  let authorizationId: string | undefined;
  let actionableProposalParsed = false;
  try {
    const parsed = parseSemanticApplyArgs(args);
    json = parsed.json;
    authorizationId = parsed.authorizationId;
    const proposal = await readActionableProposalFile(parsed.inputPath);
    actionableProposalParsed = true;
    await requireProtectedCanonicalProject();
    const result = await applyActionableProposal(parsed.authorizationId, proposal);
    if (json) {
      console.log(JSON.stringify({
        ...result,
        protectedIntegrityRequired: true,
        canonicalContextReady: false,
        next: "livariant integrity accept-current",
      }));
      return;
    }

    console.log("Semantic apply completed");
    console.log(`Authorization: ${result.authorizationId}`);
    console.log(`Project: ${result.stableProjectIdentity}`);
    console.log(`Proposal: ${result.actionableProposalId}`);
    console.log(`Scope: ${result.mutationScope.domain}/${result.mutationScope.changeKind}`);
    console.log("Mutation authorization consumed: yes");
    console.log(`Semantic changes made: ${result.semanticChangesMade}`);
    console.log("Protected integrity: required for the new Project Brain state.");
    console.log("Canonical context remains blocked until 'livariant integrity accept-current' succeeds after review.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Semantic apply input is invalid.";
    const outcome = await classifyApplyFailure(authorizationId, actionableProposalParsed);
    if (json) {
      console.log(JSON.stringify({
        state: "blocked",
        error: { code: "semantic-apply-blocked", message },
        ...outcome,
      }));
    } else {
      console.log("Semantic apply blocked");
      console.log(`Reason: ${message}`);
      console.log(`Recovery required: ${outcome.recoveryRequired ? "yes" : "no"}`);
      console.log(`Mutation outcome: ${outcome.mutationOutcome}`);
      console.log(`Semantic changes made: ${outcome.semanticChangesMade}`);
    }
    process.exitCode = 2;
  }
}
