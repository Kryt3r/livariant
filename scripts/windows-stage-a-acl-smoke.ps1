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
  'Assert-RealDirectory',
  'Assert-RealFile',
  'Get-LivariantProtection',
  'Assert-ProtectedPath',
  'Set-ProtectedDirectoryAcl',
  'Set-ProtectedFileAcl',
  'Harden-LivariantTree',
  'Repair-LegacyLivariantTreeAcl'
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

$root = Join-Path $env:RUNNER_TEMP ('livariant-stage-a-acl-smoke-' + [Guid]::NewGuid().ToString('N'))
$nested = Join-Path $root 'nested'
$rootFile = Join-Path $root 'bootstrap-release.json'
$nestedFile = Join-Path $nested 'guardian-bootstrap-entry.mjs'
$legacyRoot = Join-Path $env:RUNNER_TEMP ('livariant-stage-a-legacy-recovery-' + [Guid]::NewGuid().ToString('N'))
$legacyNested = Join-Path $legacyRoot 'dist'
$legacyFile = Join-Path $legacyRoot 'bootstrap-release.json'
$legacyNestedFile = Join-Path $legacyNested 'guardian-bootstrap-entry.mjs'

try {
  New-Item -ItemType Directory -Path $nested -Force | Out-Null
  Set-Content -LiteralPath $rootFile -Value 'descriptor-readable' -NoNewline
  Set-Content -LiteralPath $nestedFile -Value 'entry-readable' -NoNewline

  Harden-LivariantTree $root

  if ((Get-Content -LiteralPath $rootFile -Raw) -ne 'descriptor-readable') {
    throw 'Hardened root leaf file is no longer readable.'
  }
  if ((Get-Content -LiteralPath $nestedFile -Raw) -ne 'entry-readable') {
    throw 'Hardened nested leaf file is no longer readable.'
  }

  foreach ($path in @($root, $nested, $rootFile, $nestedFile)) {
    Assert-ProtectedPath $path 'Stage-A ACL smoke target'
  }

  $admins = New-Object System.Security.Principal.SecurityIdentifier($AdministratorsSid)
  foreach ($file in @($rootFile, $nestedFile)) {
    $acl = [System.IO.File]::GetAccessControl($file)
    $adminRules = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | Where-Object {
      $_.IdentityReference -eq $admins -and
      $_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow -and
      ($_.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::ReadData) -ne 0
    })
    if ($adminRules.Count -eq 0) {
      throw "Hardened leaf file lacks an effective Administrators read rule: $file"
    }
    foreach ($rule in $adminRules) {
      if ($rule.InheritanceFlags -ne [System.Security.AccessControl.InheritanceFlags]::None) {
        throw "Hardened leaf Administrators rule must be direct, not inheritance-only: $file"
      }
    }
  }

  # Reproduce the RC5 failure semantics: directories remain enumerable while leaf files carry a
  # protected DACL with zero effective ACEs and are unreadable. GitHub-hosted Windows runners are
  # not elevated, so this fixture keeps the leaf owner as the current runner identity; the real
  # Administrators-owner/elevated-token variant is covered by the physical Windows acceptance test.
  New-Item -ItemType Directory -Path $legacyNested -Force | Out-Null
  Set-Content -LiteralPath $legacyFile -Value 'legacy-descriptor-readable-after-recovery' -NoNewline
  Set-Content -LiteralPath $legacyNestedFile -Value 'legacy-entry-readable-after-recovery' -NoNewline
  $currentOwner = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  foreach ($file in @($legacyFile, $legacyNestedFile)) {
    $broken = New-Object System.Security.AccessControl.FileSecurity
    $broken.SetOwner($currentOwner)
    $broken.SetAccessRuleProtection($true, $false)
    [System.IO.File]::SetAccessControl($file, $broken)
  }

  $readWasBlocked = $false
  try {
    Get-Content -LiteralPath $legacyFile -Raw | Out-Null
  } catch [System.UnauthorizedAccessException] {
    $readWasBlocked = $true
  }
  if (-not $readWasBlocked) {
    throw 'Legacy RC5 fixture did not reproduce the expected unreadable leaf ACL state.'
  }

  $Target = $legacyRoot
  Repair-LegacyLivariantTreeAcl $legacyRoot

  if ((Get-Content -LiteralPath $legacyFile -Raw) -ne 'legacy-descriptor-readable-after-recovery') {
    throw 'Bounded legacy recovery did not restore root leaf readability.'
  }
  if ((Get-Content -LiteralPath $legacyNestedFile -Raw) -ne 'legacy-entry-readable-after-recovery') {
    throw 'Bounded legacy recovery did not restore nested leaf readability.'
  }
  foreach ($path in @($legacyRoot, $legacyNested, $legacyFile, $legacyNestedFile)) {
    Assert-ProtectedPath $path 'Recovered legacy Stage-A ACL smoke target'
  }

  $outside = Join-Path $env:RUNNER_TEMP ('livariant-stage-a-outside-' + [Guid]::NewGuid().ToString('N'))
  try {
    New-Item -ItemType Directory -Path $outside -Force | Out-Null
    $rejectedOutside = $false
    try {
      Repair-LegacyLivariantTreeAcl $outside
    } catch {
      if ($_.Exception.Message -match 'confined to the fixed Livariant bootstrap target') {
        $rejectedOutside = $true
      } else {
        throw
      }
    }
    if (-not $rejectedOutside) {
      throw 'Legacy ACL recovery accepted a path outside the fixed target.'
    }
  } finally {
    Remove-Item -LiteralPath $outside -Recurse -Force -ErrorAction SilentlyContinue
  }

  Write-Output 'Windows Stage-A ACL smoke passed: clean hardening remains readable and bounded RC5 partial-state recovery restores protected leaf access without broad ACL repair.'
} finally {
  Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $legacyRoot -Recurse -Force -ErrorAction SilentlyContinue
}
