param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$SourceSha
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$desktopRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location $desktopRoot

$oldEnv = @{}
$envNames = @(
  'APPDATA',
  'LOCALAPPDATA',
  'LIVARIANT_CI_MULTI_PROJECT_ACCEPTANCE',
  'LIVARIANT_CI_MULTI_PROJECT_ROOT_A',
  'LIVARIANT_CI_MULTI_PROJECT_ROOT_B',
  'LIVARIANT_CI_MULTI_PROJECT_RESULT_PATH'
)
foreach ($name in $envNames) {
  $oldEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

$installDir = $null
$process = $null

try {
  Write-Host "Building CI-only multi-project acceptance installer for exact source $SourceSha."
  & npm run tauri:build -- --config src-tauri/tauri.runtime.conf.json --bundles nsis --ci --features ci-multi-project-acceptance -- --locked
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to build CI multi-project acceptance installer."
  }

  $bundle = Join-Path $desktopRoot 'src-tauri\target\release\bundle\nsis'
  $installers = @(Get-ChildItem -LiteralPath $bundle -Filter '*.exe' -File)
  if ($installers.Count -ne 1) {
    throw "Expected exactly one CI acceptance NSIS installer in $bundle; found $($installers.Count)."
  }

  $root = Join-Path $env:RUNNER_TEMP 'LivariantMultiProjectInstalledAcceptance'
  $installDir = Join-Path $root 'install'
  $appData = Join-Path $root 'appdata'
  $localAppData = Join-Path $root 'localappdata'
  $projectA = Join-Path $root 'project-a'
  $projectB = Join-Path $root 'project-b'
  $resultPath = Join-Path $root 'result.json'

  Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $root, $appData, $localAppData, $projectA, $projectB -Force | Out-Null
  foreach ($project in @($projectA, $projectB)) {
    Set-Content -LiteralPath (Join-Path $project 'ci-project-root-marker.txt') -Value 'preserve-root' -Encoding utf8
    $brain = Join-Path $project '.project-brain'
    New-Item -ItemType Directory -Path $brain -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $brain 'ci-preserve-marker.txt') -Value 'preserve-project-brain' -Encoding utf8
  }

  $install = Start-Process -FilePath $installers[0].FullName -ArgumentList @('/S', "/D=$installDir") -Wait -PassThru
  if ($install.ExitCode -ne 0) {
    throw "CI acceptance silent NSIS install failed with exit code $($install.ExitCode)."
  }

  $app = Join-Path $installDir 'livariant-desktop.exe'
  $manifestPath = Join-Path $installDir 'runtime\manifest.json'
  if (-not (Test-Path -LiteralPath $app -PathType Leaf)) {
    throw "Installed CI acceptance Desktop executable is missing: $app"
  }
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Installed CI acceptance runtime manifest is missing: $manifestPath"
  }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  if ($manifest.coreSourceSha -ne $SourceSha) {
    throw "Installed CI acceptance runtime source mismatch. Expected $SourceSha, got $($manifest.coreSourceSha)."
  }
  if ($manifest.authorityIssued -ne $false) {
    throw "Ordinary installed runtime must not claim Authority during multi-project acceptance."
  }

  $env:APPDATA = $appData
  $env:LOCALAPPDATA = $localAppData
  $env:LIVARIANT_CI_MULTI_PROJECT_ACCEPTANCE = '1'
  $env:LIVARIANT_CI_MULTI_PROJECT_ROOT_A = $projectA
  $env:LIVARIANT_CI_MULTI_PROJECT_ROOT_B = $projectB
  $env:LIVARIANT_CI_MULTI_PROJECT_RESULT_PATH = $resultPath

  $process = Start-Process -FilePath $app -PassThru
  if (-not $process.WaitForExit(90000)) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    throw "Installed Desktop multi-project acceptance timed out."
  }
  if ($process.ExitCode -ne 0) {
    $detail = if (Test-Path -LiteralPath $resultPath -PathType Leaf) {
      Get-Content -LiteralPath $resultPath -Raw
    } else {
      '<no result file>'
    }
    throw "Installed Desktop multi-project acceptance exited with code $($process.ExitCode): $detail"
  }
  if (-not (Test-Path -LiteralPath $resultPath -PathType Leaf)) {
    throw "Installed Desktop multi-project acceptance produced no result file."
  }

  $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
  if ($result.state -ne 'accepted') {
    throw "Installed Desktop multi-project acceptance was not accepted: $($result.detail)"
  }
  foreach ($field in @(
    'staleACommitRejected',
    'projectARestored',
    'projectBIsolated',
    'diagnosticsBindingRestored',
    'detachPreservedProjectRoot',
    'detachPreservedProjectBrain',
    'detachPreservedProjectState',
    'projectStateContainsNoGlobalCredentials',
    'projectStateContainsNoGlobalMeasurementState'
  )) {
    if ($result.$field -ne $true) {
      throw "Installed Desktop multi-project acceptance check failed: $field"
    }
  }
  if ($result.projectADesktopId -eq $result.projectBDesktopId) {
    throw "Installed Desktop multi-project acceptance returned duplicate Desktop project identities."
  }
  $generations = @($result.generations)
  if ($generations.Count -ne 3 -or
      [int64]$generations[0] -ge [int64]$generations[1] -or
      [int64]$generations[1] -ge [int64]$generations[2]) {
    throw "Installed Desktop activation generations did not advance monotonically: $($generations -join ', ')"
  }

  foreach ($project in @($projectA, $projectB)) {
    if (-not (Test-Path -LiteralPath (Join-Path $project 'ci-project-root-marker.txt') -PathType Leaf)) {
      throw "Installed acceptance deleted or altered a project-root preservation marker: $project"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $project '.project-brain\ci-preserve-marker.txt') -PathType Leaf)) {
      throw "Installed acceptance deleted or altered a Project Brain preservation marker: $project"
    }
  }

  Write-Host "Installed Desktop A -> B -> A multi-project acceptance passed for exact source $SourceSha."
  Write-Host ($result | ConvertTo-Json -Depth 8)

  $uninstallers = @(Get-ChildItem -LiteralPath $installDir -Filter '*uninstall*.exe' -File)
  if ($uninstallers.Count -ne 1) {
    throw "Expected exactly one CI acceptance uninstaller; found $($uninstallers.Count)."
  }
  $uninstall = Start-Process -FilePath $uninstallers[0].FullName -ArgumentList '/S' -Wait -PassThru
  if ($uninstall.ExitCode -ne 0) {
    throw "CI acceptance silent uninstall failed with exit code $($uninstall.ExitCode)."
  }
  Start-Sleep -Seconds 2
  if (Test-Path -LiteralPath $app -PathType Leaf) {
    throw "CI acceptance Desktop executable still exists after uninstall: $app"
  }
  foreach ($project in @($projectA, $projectB)) {
    if (-not (Test-Path -LiteralPath (Join-Path $project 'ci-project-root-marker.txt') -PathType Leaf)) {
      throw "Uninstall removed project-owned files: $project"
    }
  }
} finally {
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }
  foreach ($name in $envNames) {
    [Environment]::SetEnvironmentVariable($name, $oldEnv[$name], 'Process')
  }
  Pop-Location
}
