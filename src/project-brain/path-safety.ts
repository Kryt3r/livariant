import { lstat, realpath } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

export function assertPathWithinRoot(root: string, candidate: string, label: string): void {
  const canonicalRoot = resolve(root);
  const canonicalCandidate = resolve(candidate);
  const rel = relative(canonicalRoot, canonicalCandidate);
  if (rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep))) return;
  throw new Error(`${label} escapes its authorized root.`);
}

export async function assertRegularFile(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be a regular file and must not be a symbolic link.`);
  }
}

export async function assertRealPathWithinRoot(root: string, candidate: string, label: string): Promise<void> {
  const [realRoot, realCandidate] = await Promise.all([realpath(root), realpath(candidate)]);
  assertPathWithinRoot(realRoot, realCandidate, label);
}
