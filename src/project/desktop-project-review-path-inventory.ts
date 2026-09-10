import { lstatSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildAdoptionSurfaceInventory, type AdoptionSurfaceEvidence } from "./adoption-inventory.js";
import { parseDesktopProjectSourceReviewRefreshInput } from "./desktop-project-source-review-refresh.js";

const MAX_REVIEW_CANDIDATES = 128;

export interface DesktopProjectReviewPathCandidate {
  path: string;
  kind: AdoptionSurfaceEvidence["kind"];
  scope: string;
  trust: "evidence-only";
}

export interface DesktopProjectReviewPathInventory {
  schemaVersion: 1;
  state: "ready";
  projectId: string;
  candidates: DesktopProjectReviewPathCandidate[];
  selectedReviewPaths: string[];
  attention: Array<{ code: string; message: string; provenance: string[] }>;
  boundaries: {
    evidenceIsProjectTruth: false;
    contentsInterpreted: false;
    grantsAuthority: false;
    changesMade: 0;
  };
}

function isReviewableSurface(surface: AdoptionSurfaceEvidence): boolean {
  return surface.kind !== "tests";
}

function reviewScope(surface: AdoptionSurfaceEvidence): string {
  if (surface.kind !== "agent-guidance" && surface.kind !== "project-rules") return ".";
  const scope = dirname(surface.path).replaceAll("\\", "/");
  return scope === "" ? "." : scope;
}

function assertLinkedPrimaryCheckout(localPath: string): void {
  const stat = lstatSync(localPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("The linked primary checkout must be a regular directory and must not be a symbolic link.");
  }
}

export function buildDesktopProjectReviewPathInventory(value: unknown): DesktopProjectReviewPathInventory {
  const parsed = parseDesktopProjectSourceReviewRefreshInput(value);
  if (!parsed.primary.localPath) {
    throw new Error("Review-path inventory requires a linked primary local checkout.");
  }

  assertLinkedPrimaryCheckout(parsed.primary.localPath);
  const inventory = buildAdoptionSurfaceInventory(parsed.primary.localPath);
  const reviewable = inventory.surfaces.filter(isReviewableSurface);
  const truncated = reviewable.length > MAX_REVIEW_CANDIDATES;
  const candidates = reviewable.slice(0, MAX_REVIEW_CANDIDATES).map((surface) => ({
    path: surface.path,
    kind: surface.kind,
    scope: reviewScope(surface),
    trust: "evidence-only" as const,
  }));
  const attention = inventory.attention.map((item) => ({
    code: item.code,
    message: item.message,
    provenance: item.provenance,
  }));

  if (truncated) {
    attention.push({
      code: "desktop-review-path-inventory-limit",
      message: `The bounded Desktop review-path inventory limit of ${MAX_REVIEW_CANDIDATES} candidates was reached. Additional reviewable surfaces were not offered for selection.`,
      provenance: [],
    });
  }

  return {
    schemaVersion: 1,
    state: "ready",
    projectId: parsed.projectId,
    candidates,
    selectedReviewPaths: parsed.selectedReviewPaths ?? [],
    attention,
    boundaries: {
      evidenceIsProjectTruth: false,
      contentsInterpreted: false,
      grantsAuthority: false,
      changesMade: 0,
    },
  };
}

export async function loadDesktopProjectReviewPathInventory(inputPath: string): Promise<DesktopProjectReviewPathInventory> {
  const absoluteInput = resolve(inputPath);
  const parsed = JSON.parse(await readFile(absoluteInput, "utf8"));
  return buildDesktopProjectReviewPathInventory(parsed);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const inputPath = process.env.LIVARIANT_PROJECT_SOURCE_REVIEW_INPUT;
  if (!inputPath?.trim()) throw new Error("Fixed Desktop Project Source & Review input path is required.");
  const inventory = await loadDesktopProjectReviewPathInventory(inputPath);
  process.stdout.write(`${JSON.stringify(inventory)}\n`);
}
