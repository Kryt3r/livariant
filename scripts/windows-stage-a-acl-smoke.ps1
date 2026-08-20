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
  'Get-LivariantProtection',
  'Assert-ProtectedPath',
  'Set-ProtectedDirectoryAcl',
  'Set-ProtectedFileAcl',
  'Harden-LivariantTree'
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

  Write-Output 'Windows Stage-A ACL smoke passed: hardened directories and leaf files remain readable while requester write rights remain blocked.'
} finally {
  Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
