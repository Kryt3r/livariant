import { readFile } from "node:fs/promises";
import { projectSourceReviewConfigurationFromFirstRun } from "./first-run-source-review-configuration.js";
import type { FirstRunOnboardingState } from "./first-run-onboarding.js";
import type { ProjectSourceReviewDecisionConfiguration } from "./first-run-source-review-configuration.js";

export interface DesktopFirstRunSourceReviewProjectionRequest {
  schemaVersion: 1;
  onboardingState: FirstRunOnboardingState;
  selectedReviewPaths?: readonly string[];
  decisions?: readonly ProjectSourceReviewDecisionConfiguration[];
}

function requestFrom(value: unknown): DesktopFirstRunSourceReviewProjectionRequest {
  if (!value || typeof value !== "object") throw new Error("First-run projection request must be a JSON object.");
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 1) throw new Error("First-run projection request schemaVersion must be 1.");
  if (!candidate.onboardingState || typeof candidate.onboardingState !== "object") {
    throw new Error("First-run projection request requires onboardingState.");
  }
  if (candidate.selectedReviewPaths !== undefined && !Array.isArray(candidate.selectedReviewPaths)) {
    throw new Error("selectedReviewPaths must be an array when provided.");
  }
  if (candidate.decisions !== undefined && !Array.isArray(candidate.decisions)) {
    throw new Error("decisions must be an array when provided.");
  }
  return candidate as unknown as DesktopFirstRunSourceReviewProjectionRequest;
}

export function projectDesktopFirstRunSourceReviewRequest(value: unknown) {
  const request = requestFrom(value);
  const projected = projectSourceReviewConfigurationFromFirstRun(request.onboardingState, {
    selectedReviewPaths: request.selectedReviewPaths,
    decisions: request.decisions,
  });
  const { boundaries: _boundaries, ...configuration } = projected;
  return configuration;
}

async function main(requestPath: string) {
  const request = JSON.parse(await readFile(requestPath, "utf8"));
  process.stdout.write(`${JSON.stringify(projectDesktopFirstRunSourceReviewRequest(request))}\n`);
}

const runtimeRequestPath = process.env.LIVARIANT_FIRST_RUN_SOURCE_REVIEW_REQUEST?.trim();
if (runtimeRequestPath) {
  main(runtimeRequestPath).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
