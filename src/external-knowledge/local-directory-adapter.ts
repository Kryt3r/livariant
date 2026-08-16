import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, relative, resolve, sep } from "node:path";
import type { ExternalKnowledgeAdapter } from "./adapter.js";
import type { ExternalKnowledgeEvidence, ExternalKnowledgeEvidenceBundle, ExternalKnowledgeSkippedMaterial } from "./types.js";

const MAX_FILE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 200;
const ALLOWED_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
const SOURCE_ID_DOMAIN = "livariant:external-knowledge-source:v1";
const EVIDENCE_ID_DOMAIN = "livariant:external-knowledge-evidence:v1";

function hashParts(domain: string, parts: string[]): string {
  const hash = createHash("sha256");
  for (const value of [domain, ...parts]) {
    const bytes = Buffer.from(value, "utf8");
    hash.update(Buffer.from(String(bytes.length), "utf8"));
    hash.update(Buffer.from(":"));
    hash.update(bytes);
    hash.update(Buffer.from("|"));
  }
  return hash.digest("hex");
}

function toMaterialPath(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function isWithinRoot(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

async function collectEntries(root: string): Promise<Array<{ path: string; materialPath: string; kind: "file" | "symlink" }>> {
  const result: Array<{ path: string; materialPath: string; kind: "file" | "symlink" }> = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const materialPath = toMaterialPath(root, path);
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) {
        result.push({ path, materialPath, kind: "symlink" });
        continue;
      }
      if (stat.isDirectory()) {
        await walk(path);
        continue;
      }
      if (stat.isFile()) result.push({ path, materialPath, kind: "file" });
    }
  }

  await walk(root);
  return result;
}

async function readRegularFileWithinRoot(root: string, path: string): Promise<Buffer> {
  const resolved = await realpath(path);
  if (!isWithinRoot(root, resolved)) throw new Error(`External knowledge material escapes source root: ${toMaterialPath(root, path)}`);
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error(`External knowledge material is not a regular non-symlink file: ${toMaterialPath(root, path)}`);

  const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
  const handle = await open(path, constants.O_RDONLY | noFollow);
  try {
    const opened = await handle.stat();
    if (!opened.isFile()) throw new Error(`External knowledge material is not a regular file: ${toMaterialPath(root, path)}`);
    if (opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error(`External knowledge material changed during inspection: ${toMaterialPath(root, path)}`);
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

function mediaTypeFor(path: string): "text/markdown" | "text/plain" {
  return extname(path).toLowerCase() === ".txt" ? "text/plain" : "text/markdown";
}

export class LocalDirectoryExternalKnowledgeAdapter implements ExternalKnowledgeAdapter {
  readonly kind = "local-directory" as const;

  async inspect(location: string): Promise<ExternalKnowledgeEvidenceBundle> {
    const requestedRoot = resolve(location);
    const rootStat = await lstat(requestedRoot);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      throw new Error("External knowledge source must be a regular non-symlink directory.");
    }
    const root = await realpath(requestedRoot);
    const sourceId = `external-source-v1:${hashParts(SOURCE_ID_DOMAIN, [this.kind, root])}`;
    const evidence: ExternalKnowledgeEvidence[] = [];
    const skipped: ExternalKnowledgeSkippedMaterial[] = [];
    let acceptedBytes = 0;
    let acceptedFiles = 0;

    for (const entry of await collectEntries(root)) {
      if (entry.kind === "symlink") {
        skipped.push({ materialPath: entry.materialPath, reason: "symlink" });
        continue;
      }
      if (!ALLOWED_EXTENSIONS.has(extname(entry.path).toLowerCase())) {
        skipped.push({ materialPath: entry.materialPath, reason: "unsupported-type" });
        continue;
      }
      if (acceptedFiles >= MAX_FILES) {
        skipped.push({ materialPath: entry.materialPath, reason: "file-limit" });
        continue;
      }
      const stat = await lstat(entry.path);
      if (stat.size > MAX_FILE_BYTES) {
        skipped.push({ materialPath: entry.materialPath, reason: "oversized" });
        continue;
      }
      if (acceptedBytes + stat.size > MAX_TOTAL_BYTES) {
        skipped.push({ materialPath: entry.materialPath, reason: "total-size-limit" });
        continue;
      }

      const bytes = await readRegularFileWithinRoot(root, entry.path);
      if (bytes.length > MAX_FILE_BYTES) {
        skipped.push({ materialPath: entry.materialPath, reason: "oversized" });
        continue;
      }
      if (bytes.includes(0)) {
        skipped.push({ materialPath: entry.materialPath, reason: "binary" });
        continue;
      }
      if (acceptedBytes + bytes.length > MAX_TOTAL_BYTES) {
        skipped.push({ materialPath: entry.materialPath, reason: "total-size-limit" });
        continue;
      }

      const content = bytes.toString("utf8");
      const contentSha256 = createHash("sha256").update(bytes).digest("hex");
      const evidenceId = `external-evidence-v1:${hashParts(EVIDENCE_ID_DOMAIN, [sourceId, entry.materialPath, contentSha256])}`;
      evidence.push({
        evidenceId,
        trust: "external-evidence",
        mediaType: mediaTypeFor(entry.path),
        content,
        provenance: {
          sourceId,
          sourceKind: this.kind,
          materialPath: entry.materialPath,
          contentSha256,
        },
      });
      acceptedBytes += bytes.length;
      acceptedFiles += 1;
    }

    return {
      schemaVersion: 1,
      source: {
        schemaVersion: 1,
        sourceId,
        kind: this.kind,
        location: root,
        readOnly: true,
        trust: "external-evidence",
        grantsAuthority: false,
      },
      evidence,
      skipped,
      boundaries: {
        evidenceIsProjectTruth: false,
        grantsAuthority: false,
        sourceMutated: false,
        projectMutated: false,
        changesMade: 0,
      },
    };
  }
}
