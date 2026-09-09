import type { AdoptionAuthorizationConsumptionResult } from "./adoption-authorization-consumption.js";
import { buildAdoptionDesktopPresentation, type AdoptionDesktopPresentation } from "./adoption-desktop-presentation.js";
import type { AdoptionSemanticApplyResult } from "./adoption-semantic-apply.js";
import type { AdoptionContentReview } from "./adoption-review.js";
import type { AdoptionReviewDecisionRecord } from "./adoption-review-decisions.js";
import {
  buildProjectSourceCenterPresentation,
  type ProjectSourceCenterPresentation,
  type ProjectSourceObservation,
} from "./project-source-center-presentation.js";
import type { ProjectSourceRegistry } from "./source-registry.js";

export interface ProjectSourceReviewProducerInput {
  registry: ProjectSourceRegistry;
  observations?: readonly ProjectSourceObservation[];
  review?: AdoptionContentReview | null;
  decisions?: readonly AdoptionReviewDecisionRecord[];
  authorization?: AdoptionAuthorizationConsumptionResult;
  apply?: AdoptionSemanticApplyResult;
}

export interface ProjectSourceReviewSnapshot {
  schemaVersion: 1;
  presentation: ProjectSourceCenterPresentation;
  producedAt: string;
  boundaries: {
    snapshotIsProjectTruth: false;
    snapshotGrantsAuthority: false;
    producerChangesProjectOwnedFiles: false;
    producerPerformsSemanticApply: false;
  };
}

function reviewPresentation(input: ProjectSourceReviewProducerInput): AdoptionDesktopPresentation | null {
  if (!input.review) {
    if ((input.decisions?.length ?? 0) > 0 || input.authorization || input.apply) {
      throw new Error("Review decisions, authorization or apply evidence cannot be produced without a current adoption review.");
    }
    return null;
  }

  return buildAdoptionDesktopPresentation(
    input.review,
    input.decisions ?? [],
    input.authorization,
    input.apply,
  );
}

export function produceProjectSourceReviewPresentation(
  input: ProjectSourceReviewProducerInput,
): ProjectSourceCenterPresentation {
  return buildProjectSourceCenterPresentation(
    input.registry,
    input.observations ?? [],
    reviewPresentation(input),
  );
}

export function produceProjectSourceReviewSnapshot(
  input: ProjectSourceReviewProducerInput,
  producedAt: string,
): ProjectSourceReviewSnapshot {
  const normalizedProducedAt = producedAt.trim();
  if (!normalizedProducedAt) throw new Error("producedAt must not be empty.");

  return {
    schemaVersion: 1,
    presentation: produceProjectSourceReviewPresentation(input),
    producedAt: normalizedProducedAt,
    boundaries: {
      snapshotIsProjectTruth: false,
      snapshotGrantsAuthority: false,
      producerChangesProjectOwnedFiles: false,
      producerPerformsSemanticApply: false,
    },
  };
}

export function serializeProjectSourceReviewPresentation(
  input: ProjectSourceReviewProducerInput,
): string {
  return `${JSON.stringify(produceProjectSourceReviewPresentation(input), null, 2)}\n`;
}
