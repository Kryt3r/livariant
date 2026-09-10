import { readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildAdoptionSurfaceInventory } from "./adoption-inventory.js";
import { reviewAdoptionSurfaces } from "./adoption-review.js";
import { bindAdoptionReviewDecisions, type AdoptionReviewDecisionInput } from "./adoption-review-decisions.js";
import { produceProjectSourceReviewPresentation } from "./project-source-review-producer.js";
import { addAdditionalProjectRepository, createProjectSourceRegistry, type RepositoryIdentity } from "./source-registry.js";
import type { ProjectSourceObservation } from "./project-source-center-presentation.js";

interface RefreshInput {
  schemaVersion: 1;
  projectId: string;
  primary: { identity: RepositoryIdentity; localPath?: string };
  additional?: Array<{ identity: RepositoryIdentity; description: string; localPath?: string }>;
  observations?: ProjectSourceObservation[];
  selectedReviewPaths?: string[];
  decisions?: AdoptionReviewDecisionInput[];
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string.`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function identity(value: unknown, field: string): RepositoryIdentity {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object.`);
  const record = value as Record<string, unknown>;
  const provider = record.provider;
  if (provider !== "github" && provider !== "git") throw new Error(`${field}.provider is unsupported.`);
  const remoteUrl = optionalString(record.remoteUrl);
  return {
    provider,
    repositoryId: requiredString(record.repositoryId, `${field}.repositoryId`),
    displayName: requiredString(record.displayName, `${field}.displayName`),
    ...(remoteUrl ? { remoteUrl } : {}),
  };
}

function observations(value: unknown): ProjectSourceObservation[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("observations must be an array when supplied.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`observations[${index}] must be an object.`);
    const record = item as Record<string, unknown>;
    if (record.reachability !== "reachable" && record.reachability !== "unreachable") throw new Error(`observations[${index}].reachability is invalid.`);
    if (typeof record.stale !== "boolean") throw new Error(`observations[${index}].stale must be boolean.`);
    const attention = record.attention === undefined
      ? undefined
      : Array.isArray(record.attention) && record.attention.every((entry) => typeof entry === "string")
        ? record.attention as string[]
        : (() => { throw new Error(`observations[${index}].attention must contain only strings.`); })();
    return {
      identity: identity(record.identity, `observations[${index}].identity`),
      reachability: record.reachability,
      observedAt: requiredString(record.observedAt, `observations[${index}].observedAt`),
      stale: record.stale,
      ...(optionalString(record.branch) ? { branch: optionalString(record.branch) } : {}),
      ...(optionalString(record.revision) ? { revision: optionalString(record.revision) } : {}),
      ...(attention ? { attention } : {}),
    } as ProjectSourceObservation;
  });
}

function decisionInputs(value: unknown): AdoptionReviewDecisionInput[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("decisions must be an array when supplied.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`decisions[${index}] must be an object.`);
    const record = item as Record<string, unknown>;
    if (record.decision !== "accept-as-candidate" && record.decision !== "reject" && record.decision !== "defer") {
      throw new Error(`decisions[${index}].decision is invalid.`);
    }
    return {
      evidenceId: requiredString(record.evidenceId, `decisions[${index}].evidenceId`),
      materialDigest: requiredString(record.materialDigest, `decisions[${index}].materialDigest`),
      decision: record.decision,
    };
  });
}

export function parseDesktopProjectSourceReviewRefreshInput(value: unknown): RefreshInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Desktop Project Source & Review refresh input must be an object.");
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) throw new Error("Desktop Project Source & Review refresh schemaVersion must be 1.");
  if (!record.primary || typeof record.primary !== "object" || Array.isArray(record.primary)) throw new Error("primary must be an object.");
  const primary = record.primary as Record<string, unknown>;
  const additionalRaw = record.additional ?? [];
  if (!Array.isArray(additionalRaw)) throw new Error("additional must be an array when supplied.");
  const selectedReviewPaths = record.selectedReviewPaths === undefined
    ? []
    : Array.isArray(record.selectedReviewPaths) && record.selectedReviewPaths.every((entry) => typeof entry === "string" && entry.trim())
      ? (record.selectedReviewPaths as string[]).map((entry) => entry.trim())
      : (() => { throw new Error("selectedReviewPaths must contain only non-empty strings."); })();

  return {
    schemaVersion: 1,
    projectId: requiredString(record.projectId, "projectId"),
    primary: {
      identity: identity(primary.identity, "primary.identity"),
      ...(optionalString(primary.localPath) ? { localPath: optionalString(primary.localPath) } : {}),
    },
    additional: additionalRaw.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`additional[${index}] must be an object.`);
      const entry = item as Record<string, unknown>;
      const localPath = optionalString(entry.localPath);
      return {
        identity: identity(entry.identity, `additional[${index}].identity`),
        description: requiredString(entry.description, `additional[${index}].description`),
        ...(localPath ? { localPath } : {}),
      };
    }),
    observations: observations(record.observations),
    selectedReviewPaths,
    decisions: decisionInputs(record.decisions),
  };
}

export async function refreshDesktopProjectSourceReviewPresentation(inputPath: string, outputPath: string): Promise<void> {
  const parsed = parseDesktopProjectSourceReviewRefreshInput(JSON.parse(await readFile(inputPath, "utf8")));
  let registry = createProjectSourceRegistry(parsed.projectId, {
    identity: parsed.primary.identity,
    ...(parsed.primary.localPath ? { local: { localPath: parsed.primary.localPath } } : {}),
  });
  for (const additional of parsed.additional ?? []) {
    registry = addAdditionalProjectRepository(registry, {
      identity: additional.identity,
      description: additional.description,
      ...(additional.localPath ? { local: { localPath: additional.localPath } } : {}),
    }).registry;
  }

  const selectedReviewPaths = parsed.selectedReviewPaths ?? [];
  let review = undefined;
  let decisions = undefined;
  if (selectedReviewPaths.length > 0) {
    if (!parsed.primary.localPath) throw new Error("Selected local review paths require a linked primary local checkout.");
    const inventory = buildAdoptionSurfaceInventory(parsed.primary.localPath);
    review = reviewAdoptionSurfaces(parsed.primary.localPath, inventory, selectedReviewPaths);
    decisions = bindAdoptionReviewDecisions(review, parsed.decisions ?? []);
  } else if ((parsed.decisions?.length ?? 0) > 0) {
    throw new Error("Review decisions cannot be refreshed without selected review paths.");
  }

  const presentation = produceProjectSourceReviewPresentation({
    registry,
    observations: parsed.observations,
    ...(review ? { review, decisions } : {}),
  });

  const absoluteOutput = resolve(outputPath);
  const temp = resolve(dirname(absoluteOutput), `${basename(absoluteOutput)}.tmp`);
  await writeFile(temp, `${JSON.stringify(presentation, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temp, absoluteOutput);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const inputPath = process.env.LIVARIANT_PROJECT_SOURCE_REVIEW_INPUT;
  const outputPath = process.env.LIVARIANT_PROJECT_SOURCE_REVIEW_OUTPUT;
  if (!inputPath?.trim() || !outputPath?.trim()) throw new Error("Fixed Desktop Project Source & Review input/output paths are required.");
  await refreshDesktopProjectSourceReviewPresentation(inputPath, outputPath);
}
