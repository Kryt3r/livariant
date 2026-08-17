import { recordAcceptedProjectBrainState } from "../src/project-brain/integrity.js";

/**
 * Test-only helper for fixtures that intentionally construct canonical Project Brain state
 * through direct internal writers. Product code must never infer acceptance from these calls.
 * Tests that exercise stale, concurrent, hostile, or unaccepted mutation must NOT call this.
 */
export async function acceptFixtureProjectBrain(projectPath: string): Promise<void> {
  await recordAcceptedProjectBrainState(projectPath, "manual-bootstrap");
}

export async function mutateAcceptedFixture(
  projectPath: string,
  mutation: () => void | Promise<void>,
): Promise<void> {
  await mutation();
  await acceptFixtureProjectBrain(projectPath);
}
