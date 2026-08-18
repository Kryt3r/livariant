import { discoverProject } from "../project/discovery.js";
import { establishProtectedProjectBrainIntegrityState } from "../project-brain/protected-integrity.js";
import {
  applyActionableProposal as applyActionableProposalCore,
  applyMigrationUpdate as applyMigrationUpdateCore,
  applyRecovery as applyRecoveryCore,
  initializeProject as initializeProjectCore,
} from "./index-core.js";

async function protectAcceptedState(projectRoot: string, source: "initialization" | "semantic-apply" | "lifecycle"): Promise<void> {
  try {
    await establishProtectedProjectBrainIntegrityState(projectRoot, source);
  } catch (error) {
    throw new Error(
      `Project Brain transition completed, but the resulting accepted state could not be established as protected Guardian truth. Canonical reads remain blocked until protected integrity is established: ${error instanceof Error ? error.message : "unknown Guardian protection failure"}`,
    );
  }
}

export async function initializeProtectedProject(
  ...args: Parameters<typeof initializeProjectCore>
): Promise<Awaited<ReturnType<typeof initializeProjectCore>>> {
  const result = await initializeProjectCore(...args);
  await protectAcceptedState(result.plan.projectRoot, "initialization");
  return result;
}

export async function applyProtectedActionableProposal(
  ...args: Parameters<typeof applyActionableProposalCore>
): Promise<Awaited<ReturnType<typeof applyActionableProposalCore>>> {
  const projectRoot = discoverProject(args[2] ?? process.cwd()).root;
  const result = await applyActionableProposalCore(...args);
  await protectAcceptedState(projectRoot, "semantic-apply");
  return result;
}

export async function applyProtectedMigrationUpdate(
  ...args: Parameters<typeof applyMigrationUpdateCore>
): Promise<Awaited<ReturnType<typeof applyMigrationUpdateCore>>> {
  const projectRoot = discoverProject(args[0]).root;
  const result = await applyMigrationUpdateCore(...args);
  await protectAcceptedState(projectRoot, "lifecycle");
  return result;
}

export async function applyProtectedRecovery(
  ...args: Parameters<typeof applyRecoveryCore>
): Promise<Awaited<ReturnType<typeof applyRecoveryCore>>> {
  const projectRoot = discoverProject(args[0]).root;
  const result = await applyRecoveryCore(...args);
  await protectAcceptedState(projectRoot, "lifecycle");
  return result;
}
