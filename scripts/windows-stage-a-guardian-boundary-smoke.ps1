$ErrorActionPreference = 'Stop'

$templatePath = Join-Path $PSScriptRoot 'installers\install-livariant-bootstrap.ps1.template'
$template = Get-Content -LiteralPath $templatePath -Raw
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($template, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -ne 0) {
  throw "Stage-A installer template did not parse cleanly: $($parseErrors[0].Message)"
}

$requiredFunctions = @(
  'Get-LivariantProtection',
  'Assert-ProtectedPath',
  'Set-ProtectedDirectoryAcl'
)
foreach ($name in $requiredFunctions) {
  $matches = @($ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name
  }, $true))
  if ($matches.Count -ne 1) {
    throw "Expected exactly one Stage-A function named $name, observed $($matches.Count)."
  }
  Invoke-Expression $matches[0].Extent.Text
}

$SystemSid = 'S-1-5-18'
$AdministratorsSid = 'S-1-5-32-544'
$EveryoneSid = 'S-1-1-0'
$AuthenticatedUsersSid = 'S-1-5-11'
$UsersSid = 'S-1-5-32-545'

$root = Join-Path $env:RUNNER_TEMP ('livariant-stage-a-guardian-boundary-' + [Guid]::NewGuid().ToString('N'))
$guardianParent = Join-Path $root 'Guardian'
$guardianRoot = Join-Path $guardianParent 'v1'
$guardianLeaf = Join-Path $guardianRoot 'guardian-helper.js'

try {
  New-Item -ItemType Directory -Path $guardianRoot -Force | Out-Null
  Set-Content -LiteralPath $guardianLeaf -Value 'historical-pre-authority-guardian' -NoNewline

  # Give the historical Guardian root and leaf explicit protected ACLs that differ from Stage A's
  # parent ACL model. This models pre-existing Guardian state whose security descriptor is owned by
  # Stage B/recovery, not by Stage A.
  $current = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  $allow = [System.Security.AccessControl.AccessControlType]::Allow

  $guardianRootAcl = New-Object System.Security.AccessControl.DirectorySecurity
  $guardianRootAcl.SetOwner($current)
  $guardianRootAcl.SetAccessRuleProtection($true, $false)
  $guardianRootAcl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($current, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', $allow)))
  [System.IO.Directory]::SetAccessControl($guardianRoot, $guardianRootAcl)

  $guardianLeafAcl = New-Object System.Security.AccessControl.FileSecurity
  $guardianLeafAcl.SetOwner($current)
  $guardianLeafAcl.SetAccessRuleProtection($true, $false)
  $guardianLeafAcl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($current, 'FullControl', $allow)))
  [System.IO.File]::SetAccessControl($guardianLeaf, $guardianLeafAcl)

  $rootBefore = [System.IO.Directory]::GetAccessControl($guardianRoot).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All)
  $leafBefore = [System.IO.File]::GetAccessControl($guardianLeaf).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All)
  $bytesBefore = [System.IO.File]::ReadAllBytes($guardianLeaf)

  # This is the exact Stage-A boundary: secure only the ProgramData-like parent and Guardian parent.
  # There must be no recursive hardening of Guardian\v1 here.
  Set-ProtectedDirectoryAcl $root
  Set-ProtectedDirectoryAcl $guardianParent

  Assert-ProtectedPath $root 'Simulated Livariant ProgramData parent'
  Assert-ProtectedPath $guardianParent 'Simulated Guardian parent'

  $rootAfter = [System.IO.Directory]::GetAccessControl($guardianRoot).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All)
  $leafAfter = [System.IO.File]::GetAccessControl($guardianLeaf).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All)
  $bytesAfter = [System.IO.File]::ReadAllBytes($guardianLeaf)

  if ($rootBefore -ne $rootAfter) {
    throw 'Stage A mutated the existing Guardian production-root security descriptor.'
  }
  if ($leafBefore -ne $leafAfter) {
    throw 'Stage A mutated the existing Guardian leaf security descriptor.'
  }
  if ([Convert]::ToBase64String($bytesBefore) -ne [Convert]::ToBase64String($bytesAfter)) {
    throw 'Stage A mutated existing Guardian bytes.'
  }

  Write-Output 'Windows Stage-A Guardian boundary smoke passed: parent hardening leaves existing Guardian root, leaf ACLs, and bytes untouched for explicit Stage-B recovery.'
} finally {
  Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
