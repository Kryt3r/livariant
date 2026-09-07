import { lstatSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { AdoptionSurfaceEvidence, AdoptionSurfaceInventory } from "./adoption-inventory.js";

export interface AdoptionContentReviewOptions {
  maxBytesPerSurface?: number;
  maxTotalBytes?: number;
  maxSurfaces?: number;
}

export interface AdoptionReviewedSurface {
  kind: AdoptionSurfaceEvidence["kind"];
  path: string;
  scope: string;
  trust: "evidence-only";
  content: string;
  bytesRead: number;
  truncated: boolean;
  status: "observed-text";
}

export interface AdoptionContentReviewAttention {
  code: string;
  severity: "review";
  message: string;
  provenance: string[];
}

export interface AdoptionContentReview {
  reviewed: AdoptionReviewedSurface[];
  attention: AdoptionContentReviewAttention[];
  boundaries: {
    evidenceIsProjectTruth: false;
    contentReviewIsAcceptance: false;
    grantsAuthority: false;
    automaticConflictResolution: false;
    changesMade: 0;
  };
}

const DEFAULT_MAX_BYTES_PER_SURFACE = 64 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 256 * 1024;
const DEFAULT_MAX_SURFACES = 64;

const REVIEWABLE_KINDS = new Set<AdoptionSurfaceEvidence["kind"]>([
  "agent-guidance",
  "project-rules",
  "architecture",
  "decision-record",
  "documentation",
  "ci",
  "tooling",
]);

function normalizeScope(surface: AdoptionSurfaceEvidence): string {
  if (surface.kind !== "agent-guidance" && surface.kind !== "project-rules") return ".";
  const scope = dirname(surface.path).replaceAll("\\", "/");
  return scope === "" ? "." : scope;
}

function isSafeProjectPath(root: string, projectPath: string): boolean {
  if (!projectPath || isAbsolute(projectPath)) return false;
  const absolutePath = resolve(root, projectPath);
  const rel = relative(root, absolutePath);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(rel);
}

function scopesOverlap(left: string, right: string): boolean {
  if (left === "." || right === ".") return true;
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function addGuidanceOverlapAttention(reviewed: AdoptionReviewedSurface[], attention: AdoptionContentReviewAttention[]): void {
  const guidance = reviewed.filter((item) => item.kind === "agent-guidance" || item.kind === "project-rules");
  for (let i = 0; i < guidance.length; i += 1) {
    for (let j = i + 1; j < guidance.length; j += 1) {
      const left = guidance[i];
      const right = guidance[j];
      if (!scopesOverlap(left.scope, right.scope)) continue;
      attention.push({
        code: "adoption-review-overlapping-guidance",
        severity: "review",
        message: `Guidance from ${left.path} and ${right.path} has overlapping scope. Livariant presents both as evidence and does not select precedence or resolve semantic conflict automatically.`,
        provenance: [left.path, right.path],
      });
    }
  }
}

function readObservedText(root: string, surface: AdoptionSurfaceEvidence, maxBytes: number): { content: string; bytesRead: number; truncated: boolean } | null {
  if (!isSafeProjectPath(root, surface.path)) return null;
  const absolutePath = resolve(root, surface.path);
  try {
    const stat = lstatSync(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink()) return null;
    const source = readFileSync(absolutePath);
    if (source.includes(0)) return null;
    const truncated = source.length > maxBytes;
    const bytes = truncated ? source.subarray(0, maxBytes) : source;
    return {
      content: bytes.toString("utf8"),
      bytesRead: bytes.length,
      truncated,
    };
  } catch {
    return null;
  }
}

export function reviewAdoptionSurfaces(
  root: string,
  inventory: AdoptionSurfaceInventory,
  selectedPaths: readonly string[],
  options: AdoptionContentReviewOptions = {},
): AdoptionContentReview {
  const maxBytesPerSurface = Math.max(1, options.maxBytesPerSurface ?? DEFAULT_MAX_BYTES_PER_SURFACE);
  const maxTotalBytes = Math.max(1, options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES);
  const maxSurfaces = Math.max(1, options.maxSurfaces ?? DEFAULT_MAX_SURFACES);
  const reviewed: AdoptionReviewedSurface[] = [];
  const attention: AdoptionContentReviewAttention[] = [];
  let totalBytes = 0;

  const uniqueSelected = [...new Set(selectedPaths)].slice(0, maxSurfaces);
  if (selectedPaths.length > maxSurfaces) {
    attention.push({
      code: "adoption-review-surface-limit",
      severity: "review",
      message: `The explicit review selection exceeded the bounded limit of ${maxSurfaces} surfaces. Remaining surfaces were not read.`,
      provenance: [],
    });
  }

  for (const projectPath of uniqueSelected) {
    const surface = inventory.surfaces.find((candidate) => candidate.path === projectPath);
    if (!surface) {
      attention.push({
        code: "adoption-review-uninventoried-selection",
        severity: "review",
        message: `${projectPath} was requested for review but is not present in the adoption inventory. Livariant did not read it.`,
        provenance: [projectPath],
      });
      continue;
    }
    if (!REVIEWABLE_KINDS.has(surface.kind)) {
      attention.push({
        code: "adoption-review-nonfile-surface",
        severity: "review",
        message: `${projectPath} is an inventory surface but is not reviewed as a text file by this bounded slice.`,
        provenance: [projectPath],
      });
      continue;
    }
    if (totalBytes >= maxTotalBytes) {
      attention.push({
        code: "adoption-review-total-byte-limit",
        severity: "review",
        message: `The bounded content-review budget of ${maxTotalBytes} bytes was reached. Remaining selected surfaces were not read.`,
        provenance: [projectPath],
      });
      break;
    }

    const remaining = maxTotalBytes - totalBytes;
    const readLimit = Math.min(maxBytesPerSurface, remaining);
    const observed = readObservedText(root, surface, readLimit);
    if (!observed) {
      attention.push({
        code: "adoption-review-unsafe-or-unreadable-surface",
        severity: "review",
        message: `${projectPath} could not be reviewed as a regular non-symlink text file. Livariant did not infer its contents.`,
        provenance: [projectPath],
      });
      continue;
    }

    reviewed.push({
      kind: surface.kind,
      path: surface.path,
      scope: normalizeScope(surface),
      trust: "evidence-only",
      content: observed.content,
      bytesRead: observed.bytesRead,
      truncated: observed.truncated,
      status: "observed-text",
    });
    totalBytes += observed.bytesRead;

    if (observed.truncated) {
      attention.push({
        code: "adoption-review-truncated-surface",
        severity: "review",
        message: `${projectPath} exceeded the bounded review limit and was only partially read. No inference is made from omitted content.`,
        provenance: [projectPath],
      });
    }
  }

  addGuidanceOverlapAttention(reviewed, attention);
  reviewed.sort((a, b) => a.path.localeCompare(b.path));
  attention.sort((a, b) => `${a.code}:${a.provenance.join(",")}`.localeCompare(`${b.code}:${b.provenance.join(",")}`));

  return {
    reviewed,
    attention,
    boundaries: {
      evidenceIsProjectTruth: false,
      contentReviewIsAcceptance: false,
      grantsAuthority: false,
      automaticConflictResolution: false,
      changesMade: 0,
    },
  };
}
