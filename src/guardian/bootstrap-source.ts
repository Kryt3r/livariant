import { spawnSync } from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
import { posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isProtectedPosixOwner,
  isProtectedWindowsOwnerSid,
  type GuardianPlatform,
} from "./trust-root.js";

const WINDOWS_POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const WINDOWS_EVERYONE_SID = "S-1-1-0";
const WINDOWS_AUTHENTICATED_USERS_SID = "S-1-5-11";
const WINDOWS_USERS_SID = "S-1-5-32-545";

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

function windowsAclProtection(path: string): { ownerSid: string; requesterWritable: boolean } {
  const script = [
    "$acl=Get-Acl -LiteralPath $args[0]",
    "$owner=$acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value",
    "$current=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value",
    `$blocked=@('${WINDOWS_EVERYONE_SID}','${WINDOWS_AUTHENTICATED_USERS_SID}','${WINDOWS_USERS_SID}',$current)`,
    "$danger=[System.Security.AccessControl.FileSystemRights]::Write -bor [System.Security.AccessControl.FileSystemRights]::Modify -bor [System.Security.AccessControl.FileSystemRights]::FullControl -bor [System.Security.AccessControl.FileSystemRights]::Delete -bor [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor [System.Security.AccessControl.FileSystemRights]::TakeOwnership",
    "$unsafe=$false",
    "foreach($rule in $acl.Access){ try{$sid=$rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value}catch{continue}; if($rule.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow -and $blocked -contains $sid -and (($rule.FileSystemRights -band $danger) -ne 0)){$unsafe=$true;break} }",
    "Write-Output ($owner + '|' + $(if($unsafe){'yes'}else{'no'}))",
  ].join("; ");
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script, path], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`Guardian bootstrap Windows ACL could not be verified: ${detail.trim()}`);
  }
  const [ownerSid, unsafe] = result.stdout.trim().split("|");
  if (!ownerSid || !/^S-1-[0-9-]+$/iu.test(ownerSid) || (unsafe !== "yes" && unsafe !== "no")) {
    throw new Error("Guardian bootstrap Windows ACL verification returned an invalid result.");
  }
  return { ownerSid, requesterWritable: unsafe === "yes" };
}

function assertWindowsProtected(path: string, label: string): void {
  const { ownerSid, requesterWritable } = windowsAclProtection(path);
  if (!isProtectedWindowsOwnerSid(ownerSid)) throw new Error(`${label} is not owned by SYSTEM or built-in Administrators.`);
  if (requesterWritable) throw new Error(`${label} grants write-capable ACL rights to an ordinary requester principal.`);
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
    assertWindowsProtected(physicalRoot, "Guardian bootstrap source root");
    assertWindowsProtected(physicalBootstrap, "Guardian bootstrap module");
    assertWindowsProtected(physicalHelper, "Guardian bootstrap helper source");
    assertWindowsProtected(physicalNode, "Guardian bootstrap Node executable");
  }

  return {
    sourceRoot: physicalRoot,
    bootstrapModule: physicalBootstrap,
    helperSource: physicalHelper,
    nodeExecutable: physicalNode,
  };
}
