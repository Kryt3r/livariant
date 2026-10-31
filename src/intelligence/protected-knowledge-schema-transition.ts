import { ProjectBrainStore } from "../project-brain/store.js";
import { buildProjectKnowledgeProjection } from "./knowledge-projection.js";
import {
  assertKnowledgeSchemaTransitionPlanCurrent,
  planKnowledgeSchemaTransition,
  type KnowledgeSchemaTransitionPlan,
} from "./knowledge-schema-transition-plan.js";
import { runProtectedDoctor } from "../runtime/protected-doctor.js";
import { readProjectContextManagedInputs } from "../runtime/project-context-material.js";

/**
 * Guardian-gated in-memory review of the proposed schema-2 -> v3 material.
 *
 * No schema-3 parser/writer, persistent migration, Guardian Authority minting,
 * proposal approval, semantic apply, recovery or integrity checkpoint exists
 * here. Do not use this function's result as permission to mutate Project Truth.
 */
export interface ProtectedKnowledgeTransitionPlan {
  state: "protected-plan-only";
  plan: KnowledgeSchemaTransitionPlan;
  grantsAuthority: false;
  acceptsTargetSchema: false;
  writesPerformed: false;
  changesMade: 0;
}

export interface BlockedProtectedKnowledgeTransitionPlan {
  state: "blocked";
  reason: string;
  plan: null;
  grantsAuthority: false;
  acceptsTargetSchema: false;
  writesPerformed: false;
  changesMade: 0;
}

export type ProtectedKnowledgeTransitionPlanResult =
  | ProtectedKnowledgeTransitionPlan
  | BlockedProtectedKnowledgeTransitionPlan;

export interface ProtectedKnowledgeTransitionOptions {
  // Test-only fail-closed concurrency seam; never grants or bypasses authority.
  beforeRevalidate?: () => Promise<void> | void;
}

function blocked(reason: string): BlockedProtectedKnowledgeTransitionPlan {
  return {
    state: "blocked",
    reason,
    plan: null,
    grantsAuthority: false,
    acceptsTargetSchema: false,
    writesPerformed: false,
    changesMade: 0,
  };
}

/**
 * Two independent Guardian-bound checks enclose the source projection and
 * prospective output calculation. The second plan is computed from freshly
 * read material and must equal the first, byte-for-byte and project-for-project.
 */
export async function prepareProtectedKnowledgeSchemaTransition(
  projectPath: string,
  options: ProtectedKnowledgeTransitionOptions = {},
): Promise<ProtectedKnowledgeTransitionPlanResult> {
  try {
    const before = await runProtectedDoctor(projectPath);
    if (before.state !== "healthy") {
      return blocked("Guardian-protected Project Brain integrity is unavailable.");
    }
    const store = new ProjectBrainStore(projectPath);
    const initialInspection = await store.inspect();
    if (initialInspection.health !== "valid") {
      return blocked("Canonical Project Brain is not a valid managed schema-2 source.");
    }
    const projection = await buildProjectKnowledgeProjection(projectPath);
    if (projection.state !== "ready") {
      return blocked("Canonical Project Brain cannot be projected: " + projection.reason);
    }
    const inputs = await readProjectContextManagedInputs(initialInspection.path);
    const proposed = planKnowledgeSchemaTransition(projection, inputs);

    await options.beforeRevalidate?.();

    const after = await runProtectedDoctor(projectPath);
    if (after.state !== "healthy") {
      return blocked("Guardian-protected Project Brain changed during transition planning.");
    }
    const afterInspection = await store.inspect();
    if (afterInspection.health !== "valid") {
      return blocked("Project Brain became invalid during protected transition planning.");
    }
    const latestProjection = await buildProjectKnowledgeProjection(projectPath);
    if (latestProjection.state !== "ready") {
      return blocked("Canonical projection became unavailable during transition planning.");
    }
    const latestInputs = await readProjectContextManagedInputs(afterInspection.path);
    assertKnowledgeSchemaTransitionPlanCurrent(proposed, latestProjection, latestInputs);

    return {
      state: "protected-plan-only",
      plan: proposed,
      grantsAuthority: false,
      acceptsTargetSchema: false,
      writesPerformed: false,
      changesMade: 0,
    };
  } catch (error) {
    return blocked("Protected schema transition planning failed closed: "
      + (error instanceof Error ? error.message : "unknown error"));
  }
}
