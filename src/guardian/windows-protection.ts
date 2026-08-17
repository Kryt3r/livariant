import { spawnSync } from "node:child_process";

const WINDOWS_POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const WINDOWS_ACL_TARGET_ENV = "LIVARIANT_GUARDIAN_ACL_TARGET";
const WINDOWS_RESULT_PREFIX = "LIVARIANT_GUARDIAN_ACL_RESULT|";
const WINDOWS_SYSTEM_SID = "S-1-5-18";
const WINDOWS_ADMINISTRATORS_SID = "S-1-5-32-544";
const WINDOWS_EVERYONE_SID = "S-1-1-0";
const WINDOWS_AUTHENTICATED_USERS_SID = "S-1-5-11";
const WINDOWS_USERS_SID = "S-1-5-32-545";
const WINDOWS_PROTECTION_RESULT = /^LIVARIANT_GUARDIAN_ACL_RESULT\|(S-1-[0-9-]+)\|(yes|no)\|(yes|no)$/iu;

export interface WindowsProtectionInspection {
  ownerSid: string;
  ordinaryRequesterWritable: boolean;
  ordinaryRequesterCanReplaceChildren: boolean;
}

export function isProtectedWindowsOwnerSid(sid: string): boolean {
  const normalized = sid.trim().toUpperCase();
  return normalized === WINDOWS_SYSTEM_SID || normalized === WINDOWS_ADMINISTRATORS_SID;
}

export function parseWindowsProtectionOutput(stdout: string): WindowsProtectionInspection {
  const matches = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(WINDOWS_RESULT_PREFIX))
    .map((line) => WINDOWS_PROTECTION_RESULT.exec(line))
    .filter((match): match is RegExpExecArray => match !== null);

  if (matches.length !== 1) {
    throw new Error("Guardian Windows ACL verification returned an invalid or ambiguous result.");
  }

  const [, ownerSid, unsafeWrite, unsafeReplace] = matches[0];
  return {
    ownerSid,
    ordinaryRequesterWritable: unsafeWrite.toLowerCase() === "yes",
    ordinaryRequesterCanReplaceChildren: unsafeReplace.toLowerCase() === "yes",
  };
}

/**
 * Inspect a Windows security descriptor against the ordinary requester's current
 * token identity and group SIDs. SYSTEM and built-in Administrators are excluded
 * from the requester set because compromise/elevation to those principals is
 * explicitly outside the WP-026 threat boundary.
 *
 * The target path is passed as process data through an environment variable,
 * never concatenated into PowerShell source. The descriptor is read through
 * .NET filesystem ACL APIs instead of Get-Acl so Guardian readiness does not
 * depend on PowerShell module autoloading. Valid Windows path metacharacters
 * therefore remain inert data.
 */
export function inspectWindowsProtection(path: string): WindowsProtectionInspection {
  const script = [
    "$ErrorActionPreference='Stop'",
    `$target=$env:${WINDOWS_ACL_TARGET_ENV}`,
    "if([string]::IsNullOrEmpty($target)){throw 'Guardian ACL target is missing'}",
    "$acl=if([System.IO.Directory]::Exists($target)){[System.IO.Directory]::GetAccessControl($target)}elseif([System.IO.File]::Exists($target)){[System.IO.File]::GetAccessControl($target)}else{throw 'Guardian ACL target does not exist'}",
    "$identity=[System.Security.Principal.WindowsIdentity]::GetCurrent()",
    "$owner=$acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value",
    `$protected=@('${WINDOWS_SYSTEM_SID}','${WINDOWS_ADMINISTRATORS_SID}')`,
    `$blocked=@('${WINDOWS_EVERYONE_SID}','${WINDOWS_AUTHENTICATED_USERS_SID}','${WINDOWS_USERS_SID}',$identity.User.Value)`,
    "foreach($group in $identity.Groups){ try{$sid=$group.Value}catch{continue}; if($protected -notcontains $sid){$blocked += $sid} }",
    "$blocked=@($blocked | Select-Object -Unique)",
    "$writeDanger=[System.Security.AccessControl.FileSystemRights]::Write -bor [System.Security.AccessControl.FileSystemRights]::Modify -bor [System.Security.AccessControl.FileSystemRights]::FullControl -bor [System.Security.AccessControl.FileSystemRights]::Delete -bor [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor [System.Security.AccessControl.FileSystemRights]::TakeOwnership",
    "$replaceChildDanger=[System.Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor [System.Security.AccessControl.FileSystemRights]::TakeOwnership",
    "$unsafeWrite=$false",
    "$unsafeReplace=$false",
    "$rules=$acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])",
    "foreach($rule in $rules){ try{$sid=$rule.IdentityReference.Value}catch{continue}; if($rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow -or $blocked -notcontains $sid){continue}; if(($rule.FileSystemRights -band $writeDanger) -ne 0){$unsafeWrite=$true}; if(($rule.FileSystemRights -band $replaceChildDanger) -ne 0){$unsafeReplace=$true} }",
    "$writeResult=if($unsafeWrite){'yes'}else{'no'}",
    "$replaceResult=if($unsafeReplace){'yes'}else{'no'}",
    `[Console]::Out.WriteLine('${WINDOWS_RESULT_PREFIX}' + $owner + '|' + $writeResult + '|' + $replaceResult)`,
  ].join("; ");
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: { ...process.env, [WINDOWS_ACL_TARGET_ENV]: path },
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`Guardian Windows ACL could not be verified: ${detail.trim()}`);
  }
  return parseWindowsProtectionOutput(result.stdout);
}

export function assertWindowsProtectedPath(path: string, label: string): void {
  const protection = inspectWindowsProtection(path);
  if (!isProtectedWindowsOwnerSid(protection.ownerSid)) {
    throw new Error(`${label} is not owned by SYSTEM or the built-in Administrators principal.`);
  }
  if (protection.ordinaryRequesterWritable) {
    throw new Error(`${label} grants write-capable ACL rights to an ordinary requester principal or one of its enabled groups.`);
  }
}

/**
 * System anchors such as ProgramData/Program Files may legitimately allow
 * bounded creation rights. What matters for Guardian substitution is that the
 * ordinary requester cannot delete/replace protected descendants or take over
 * the anchor's security descriptor.
 */
export function assertWindowsProtectedParentAnchor(path: string, label: string): void {
  const protection = inspectWindowsProtection(path);
  if (protection.ordinaryRequesterCanReplaceChildren) {
    throw new Error(`${label} allows an ordinary requester principal or one of its groups to replace protected child paths.`);
  }
}
