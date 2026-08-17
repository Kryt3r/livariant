import { lstat, realpath } from "node:fs/promises";
import { posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { isProtectedPosixOwner, type GuardianPlatform } from "./trust-root.js";
import { assertWindowsProtectedParentAnchor, assertWindowsProtectedPath } from "./windows-protection.js";

function errno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

export function productionGuardianBootstrapSourceRoot(platform: GuardianPlatform): string {
  return platform === "win32"
    ? "C:\\Program Files\\Livariant\\Bootstrap\\v1"
    : "/opt/livariant/bootstrap/v1";
}

function pathApiFor(platform: GuardianPlatform) {
  return platform === "win32" ? win32 : posix;
}

function pathWithin(root: string, candidate: string, platform: GuardianPlatform): boolean {
  const pathApi = pathApiFor(platform);
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

export function ancestorDirectories(path: string, platform: GuardianPlatform): string[] {
  const pathApi = pathApiFor(platform);
  const directories: string[] = [];
  let current = pathApi.dirname(pathApi.resolve(path));
  while (true) {
    directories.push(current);
    const parent = pathApi.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return directories;
}

async function assertRealDirectory(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory and must not be a symbolic link or junction.`);
}

async function assertLinuxProtected(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isFile() && !stats.isDirectory()) throw new Error(`${label} must be a regular protected filesystem object.`);
  if (stats.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link.`);
  if (!isProtectedPosixOwner(Number(stats.uid))) throw new Error(`${label} is not owned by root.`);
  if (!isProtectedPosixMode(Number(stats.mode))) throw new Error(`${label} is writable by group or other principals.`);
}

async function assertProtectedSourceChain(sourceRoot: string, platform: GuardianPlatform): Promise<void> {
  const pathApi = pathApiFor(platform);
  const bootstrapParent = pathApi.dirname(sourceRoot);
  const livariantParent = pathApi.dirname(bootstrapParent);
  const systemAnchor = pathApi.dirname(livariantParent);

  await assertRealDirectory(sourceRoot, "Guardian bootstrap source root");
  await assertRealDirectory(bootstrapParent, "Guardian bootstrap parent");
  await assertRealDirectory(livariantParent, "Guardian bootstrap Livariant parent");
  await assertRealDirectory(systemAnchor, "Guardian bootstrap system anchor");

  if (platform === "linux") {
    await assertLinuxProtected(systemAnchor, "Guardian bootstrap system anchor");
    await assertLinuxProtected(livariantParent, "Guardian bootstrap Livariant parent");
    await assertLinuxProtected(bootstrapParent, "Guardian bootstrap parent");
    await assertLinuxProtected(sourceRoot, "Guardian bootstrap source root");
    return;
  }

  // Program Files may have broader bounded install semantics, but the ordinary
  // requester must not be able to replace protected descendants through it.
  assertWindowsProtectedParentAnchor(systemAnchor, "Guardian bootstrap Program Files anchor");
  assertWindowsProtectedPath(livariantParent, "Guardian bootstrap Livariant parent");
  assertWindowsProtectedPath(bootstrapParent, "Guardian bootstrap parent");
  assertWindowsProtectedPath(sourceRoot, "Guardian bootstrap source root");
}

async function assertProtectedInterpreterChain(nodeExecutable: string, platform: GuardianPlatform): Promise<void> {
  if (platform === "linux") {
    await assertLinuxProtected(nodeExecutable, "Guardian bootstrap Node executable");
    for (const directory of ancestorDirectories(nodeExecutable, platform)) {
      await assertRealDirectory(directory, "Guardian bootstrap Node ancestor");
      await assertLinuxProtected(directory, "Guardian bootstrap Node ancestor");
    }
    return;
  }

  assertWindowsProtectedPath(nodeExecutable, "Guardian bootstrap Node executable");
  for (const directory of ancestorDirectories(nodeExecutable, platform)) {
    await assertRealDirectory(directory, "Guardian bootstrap Node ancestor");
    assertWindowsProtectedParentAnchor(directory, "Guardian bootstrap Node ancestor");
  }
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

  await assertProtectedSourceChain(sourceRoot, platform);

  const [physicalHelper, physicalBootstrap, physicalNode] = await Promise.all([
    realpath(helperSource),
    realpath(bootstrapModule),
    realpath(nodeExecutable),
  ]);

  if (!bootstrapSourcePathAllowed(physicalRoot, platform) || !bootstrapSourcePathAllowed(physicalHelper, platform) || !bootstrapSourcePathAllowed(physicalBootstrap, platform)) {
    throw new Error(`Guardian bootstrap refuses requester-controlled or redirected code. Bootstrap root, module, and helper must resolve beneath protected source root ${sourceRoot}.`);
  }

  if (platform === "linux") {
    await assertLinuxProtected(physicalBootstrap, "Guardian bootstrap module");
    await assertLinuxProtected(physicalHelper, "Guardian bootstrap helper source");
  } else {
    assertWindowsProtectedPath(physicalBootstrap, "Guardian bootstrap module");
    assertWindowsProtectedPath(physicalHelper, "Guardian bootstrap helper source");
  }
  await assertProtectedInterpreterChain(physicalNode, platform);

  return {
    sourceRoot: physicalRoot,
    bootstrapModule: physicalBootstrap,
    helperSource: physicalHelper,
    nodeExecutable: physicalNode,
  };
}
