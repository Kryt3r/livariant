import { lstat, realpath } from "node:fs/promises";
import { posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { isProtectedPosixOwner, type GuardianPlatform } from "./trust-root.js";
import { assertWindowsProtectedPath } from "./windows-protection.js";

function errno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

export function productionGuardianBootstrapSourceRoot(platform: GuardianPlatform): string {
  return platform === "win32"
    ? "C:\\Program Files\\Livariant\\Bootstrap\\v1"
    : "/opt/livariant/bootstrap/v1";
}

function pathWithin(root: string, candidate: string, platform: GuardianPlatform): boolean {
  const pathApi = platform === "win32" ? win32 : posix;
  const normalizedRoot = pathApi.resolve(root);
  const normalizedCandidate = pathApi.resolve(candidate);
  const rel = pathApi.relative(normalizedRoot, normalizedCandidate);
  const normalizedRel = platform === "win32" ? rel.toLowerCase() : rel;
  return normalizedRel === "" || (!normalizedRel.startsWith(`..${pathApi.sep}`) && normalizedRel !== ".." && !pathApi.isAbsolute(normalizedRel));
}

export function isProtectedPosixMode(mode: number): boolean {
  return (mode & 0o022) === 0;
}

export function bootstrapSourcePathAllowed(path: string, platform: GuardianPlatform): boolean {
  return pathWithin(productionGuardianBootstrapSourceRoot(platform), path, platform);
}

async function assertLinuxProtected(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isFile() && !stats.isDirectory()) throw new Error(`${label} must be a regular protected filesystem object.`);
  if (stats.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link.`);
  if (!isProtectedPosixOwner(Number(stats.uid))) throw new Error(`${label} is not owned by root.`);
  if (!isProtectedPosixMode(Number(stats.mode))) throw new Error(`${label} is writable by group or other principals.`);
}

export interface GuardianBootstrapSourceInspection {
  sourceRoot: string;
  bootstrapModule: string;
  helperSource: string;
  nodeExecutable: string;
}

/**
 * Verifies the already-protected code origin required before Guardian provisioning.
 * This is not a self-elevation mechanism. The source root must have been provisioned
 * separately from exact release material before this code is invoked privileged.
 */
export async function assertProtectedGuardianBootstrapSource(
  platform: GuardianPlatform,
  helperSource: string,
  bootstrapModule: string = fileURLToPath(import.meta.url),
  nodeExecutable: string = process.execPath,
): Promise<GuardianBootstrapSourceInspection> {
  const sourceRoot = productionGuardianBootstrapSourceRoot(platform);
  let physicalRoot: string;
  try {
    physicalRoot = await realpath(sourceRoot);
  } catch (error) {
    if (errno(error, "ENOENT")) {
      throw new Error(`Protected Guardian bootstrap source is not provisioned at ${sourceRoot}. Install exact release material into the protected system location before Guardian bootstrap.`);
    }
    throw error;
  }

  const [physicalHelper, physicalBootstrap, physicalNode] = await Promise.all([
    realpath(helperSource),
    realpath(bootstrapModule),
    realpath(nodeExecutable),
  ]);

  if (!bootstrapSourcePathAllowed(physicalHelper, platform) || !bootstrapSourcePathAllowed(physicalBootstrap, platform)) {
    throw new Error(`Guardian bootstrap refuses requester-controlled code. Bootstrap module and helper must already reside under protected source root ${sourceRoot}.`);
  }

  if (platform === "linux") {
    await assertLinuxProtected(physicalRoot, "Guardian bootstrap source root");
    await assertLinuxProtected(physicalBootstrap, "Guardian bootstrap module");
    await assertLinuxProtected(physicalHelper, "Guardian bootstrap helper source");
    await assertLinuxProtected(physicalNode, "Guardian bootstrap Node executable");
  } else {
    assertWindowsProtectedPath(physicalRoot, "Guardian bootstrap source root");
    assertWindowsProtectedPath(physicalBootstrap, "Guardian bootstrap module");
    assertWindowsProtectedPath(physicalHelper, "Guardian bootstrap helper source");
    assertWindowsProtectedPath(physicalNode, "Guardian bootstrap Node executable");
  }

  return {
    sourceRoot: physicalRoot,
    bootstrapModule: physicalBootstrap,
    helperSource: physicalHelper,
    nodeExecutable: physicalNode,
  };
}
