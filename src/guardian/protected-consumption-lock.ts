import { lstat, mkdir, rmdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

/**
 * Protected-process consumption exclusion ONLY.
 *
 * This is never an Authority receipt, transaction checkpoint, persistent v3
 * read fence, or proof of durable one-shot consumption. The caller MUST first
 * establish independently protected helper/parent ownership and permissions.
 *
 * A stale lock after a process crash is deliberately not auto-recovered:
 * retrying would require independent protected recovery/consumption evidence.
 */
export async function withExclusiveGuardianConsumeLock<T>(
  protectedAuthorityRecordPath: string,
  action: () => Promise<T>,
): Promise<T> {
  const file = basename(protectedAuthorityRecordPath);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.json$/iu.test(file)) {
    throw new Error("Guardian consumption lock requires an exact protected Authority record filename.");
  }
  const directory = dirname(protectedAuthorityRecordPath);
  const parent = await lstat(directory);
  if (!parent.isDirectory() || parent.isSymbolicLink()) {
    throw new Error("Guardian consumption lock parent must be a real protected directory.");
  }
  const lockPath = resolve(directory, "." + file + ".consume.lock");
  try {
    await mkdir(lockPath, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("Guardian consumption transition is already active or interrupted; refusing reuse until protected recovery.");
    }
    throw error;
  }

  try {
    return await action();
  } finally {
    // Never delete an unknown non-directory or chase a substituted link.
    // Failure leaves a visible blocking artifact in the protected namespace.
    await rmdir(lockPath);
  }
}
