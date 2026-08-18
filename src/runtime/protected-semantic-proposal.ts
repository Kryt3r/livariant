import {
  buildSemanticProposal,
  type BlockedSemanticProposalResult,
  type SemanticProposalBuildOptions,
  type SemanticProposalCandidate,
  type SemanticProposalResult,
} from "./semantic-proposal.js";
import { runProtectedDoctor } from "./protected-doctor.js";

function blocked(report: Awaited<ReturnType<typeof runProtectedDoctor>>): BlockedSemanticProposalResult {
  return {
    state: "blocked",
    projectLocator: report.projectRoot,
    stableProjectIdentity: null,
    baseline: null,
    proposal: null,
    findings: report.findings,
    reviewOnly: true,
    mutationAuthorization: false,
    applySupported: false,
    authorizationEligible: false,
    changesMade: 0,
  };
}

export async function buildProtectedSemanticProposal(
  candidate: SemanticProposalCandidate,
  projectPath: string = process.cwd(),
  options: SemanticProposalBuildOptions = {},
): Promise<SemanticProposalResult> {
  const before = await runProtectedDoctor(projectPath);
  if (before.state !== "healthy") return blocked(before);

  const result = await buildSemanticProposal(candidate, projectPath, options);
  if (result.state !== "proposal") return result;

  const after = await runProtectedDoctor(projectPath);
  if (after.state !== "healthy") return blocked(after);
  return result;
}
