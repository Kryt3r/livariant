import { spawnSync } from "node:child_process";

const WINDOWS_POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const WINDOWS_SYSTEM_SID = "S-1-5-18";
const WINDOWS_ADMINISTRATORS_SID = "S-1-5-32-544";
const WINDOWS_EVERYONE_SID = "S-1-1-0";
const WINDOWS_AUTHENTICATED_USERS_SID = "S-1-5-11";
const WINDOWS_USERS_SID = "S-1-5-32-545";

export interface WindowsProtectionInspection {
  ownerSid: string;
  ordinaryRequesterWritable: boolean;
}

export function isProtectedWindowsOwnerSid(sid: string): boolean {
  const normalized = sid.trim().toUpperCase();
  return normalized === WINDOWS_SYSTEM_SID || normalized === WINDOWS_ADMINISTRATORS_SID;
}

export function inspectWindowsProtection(path: string): WindowsProtectionInspection {
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
    throw new Error(`Guardian Windows ACL could not be verified: ${detail.trim()}`);
  }
  const [ownerSid, unsafe] = result.stdout.trim().split("|");
  if (!ownerSid || !/^S-1-[0-9-]+$/iu.test(ownerSid) || (unsafe !== "yes" && unsafe !== "no")) {
    throw new Error("Guardian Windows ACL verification returned an invalid result.");
  }
  return { ownerSid, ordinaryRequesterWritable: unsafe === "yes" };
}

export function assertWindowsProtectedPath(path: string, label: string): void {
  const protection = inspectWindowsProtection(path);
  if (!isProtectedWindowsOwnerSid(protection.ownerSid)) {
    throw new Error(`${label} is not owned by SYSTEM or the built-in Administrators principal.`);
  }
  if (protection.ordinaryRequesterWritable) {
    throw new Error(`${label} grants write-capable ACL rights to an ordinary requester principal.`);
  }
}
