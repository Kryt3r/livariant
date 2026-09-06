param(
  [string]$InstallRoot = '',
  [string]$ConnectionIntentPath = '',
  [string]$ExpectedSourceSha = '',
  [string]$OutputPath = '',
  [int]$Runs = 6,
  [int]$IdleSettleSeconds = 5,
  [int]$IdleSampleSeconds = 5,
  [int]$ReconnectTimeoutSeconds = 10
)

$ErrorActionPreference = 'Stop'

function Resolve-InstallRoot {
  if (-not [string]::IsNullOrWhiteSpace($InstallRoot)) {
    return (Resolve-Path -LiteralPath $InstallRoot).Path
  }

  $candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Livariant'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Livariant'),
    (Join-Path $env:LOCALAPPDATA 'Programs\livariant')
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath (Join-Path $candidate 'livariant-desktop.exe') -PathType Leaf) {
      return $candidate
    }
  }

  $uninstallRoots = @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
  )
  foreach ($root in $uninstallRoots) {
    if (-not (Test-Path $root)) { continue }
    foreach ($entry in Get-ChildItem $root -ErrorAction SilentlyContinue) {
      $item = Get-ItemProperty $entry.PSPath -ErrorAction SilentlyContinue
      if ([string]$item.DisplayName -notmatch '^Livariant(?:\s|$)') { continue }
      $location = [string]$item.InstallLocation
      if (-not [string]::IsNullOrWhiteSpace($location) -and (Test-Path -LiteralPath (Join-Path $location 'livariant-desktop.exe') -PathType Leaf)) {
        return $location
      }
    }
  }

  throw 'Livariant installation could not be discovered automatically. Re-run with -InstallRoot <folder-containing-livariant-desktop.exe>.'
}

function Resolve-ConnectionIntent {
  if (-not [string]::IsNullOrWhiteSpace($ConnectionIntentPath)) {
    return (Resolve-Path -LiteralPath $ConnectionIntentPath).Path
  }

  $candidates = @(
    (Join-Path $env:APPDATA 'dev.livariant.desktop\connections\codex.json'),
    (Join-Path $env:APPDATA 'Livariant\connections\codex.json')
  )

  $livariantRoots = @(Get-ChildItem -LiteralPath $env:APPDATA -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'livariant' } |
    ForEach-Object { Join-Path $_.FullName 'connections\codex.json' })
  $candidates += $livariantRoots

  $matches = @($candidates | Select-Object -Unique | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
  if ($matches.Count -eq 1) { return (Resolve-Path -LiteralPath $matches[0]).Path }
  if ($matches.Count -gt 1) {
    throw "Multiple Livariant Codex intent files were found. Re-run with -ConnectionIntentPath explicitly.`n$($matches -join "`n")"
  }
  throw 'Livariant Codex connection intent could not be discovered. Connect Codex successfully once, close Livariant, then retry or pass -ConnectionIntentPath explicitly.'
}

$resolvedInstallRoot = Resolve-InstallRoot
$appPath = Join-Path $resolvedInstallRoot 'livariant-desktop.exe'
$manifestPath = Join-Path $resolvedInstallRoot 'runtime\manifest.json'
if (-not (Test-Path -LiteralPath $appPath -PathType Leaf)) {
  throw "Livariant Desktop executable was not found: $appPath"
}
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Livariant runtime manifest was not found: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$sourceSha = [string]$manifest.coreSourceSha
if ($sourceSha -notmatch '^[0-9a-fA-F]{40}$') {
  throw 'Installed runtime manifest does not contain a valid exact coreSourceSha.'
}
if (-not [string]::IsNullOrWhiteSpace($ExpectedSourceSha)) {
  if ($ExpectedSourceSha -notmatch '^[0-9a-fA-F]{40}$') {
    throw 'ExpectedSourceSha must be an exact 40-character Git SHA when supplied.'
  }
  if ($sourceSha.ToLowerInvariant() -ne $ExpectedSourceSha.ToLowerInvariant()) {
    throw "Installed Livariant source identity does not match the expected profiling candidate. Installed=$sourceSha Expected=$ExpectedSourceSha"
  }
}

$intentPath = Resolve-ConnectionIntent
$running = @(Get-Process -Name 'livariant-desktop' -ErrorAction SilentlyContinue)
if ($running.Count -gt 0) {
  throw 'Livariant is currently running. Close Livariant completely before starting the persisted-connected profile.'
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path (Get-Location) "livariant-connected-idle-$($sourceSha.Substring(0, 12)).json"
}

$benchmark = Join-Path $PSScriptRoot 'desktop-process-window-baseline.ps1'
if (-not (Test-Path -LiteralPath $benchmark -PathType Leaf)) {
  throw "Canonical Desktop benchmark script was not found next to this wrapper: $benchmark"
}

Write-Host "Livariant install: $resolvedInstallRoot"
Write-Host "Installed source: $sourceSha"
Write-Host 'Connection intent: discovered and validated by the canonical benchmark (path withheld from evidence).'
Write-Host 'Starting persisted-connected auto-reconnect profile...'

& $benchmark `
  -AppPath $appPath `
  -SourceSha $sourceSha `
  -OutputPath $OutputPath `
  -Runs $Runs `
  -IdleSettleSeconds $IdleSettleSeconds `
  -IdleSampleSeconds $IdleSampleSeconds `
  -IdleProfile 'persisted-connected' `
  -ConnectionIntentPath $intentPath `
  -ReconnectTimeoutSeconds $ReconnectTimeoutSeconds

$digest = (Get-FileHash -LiteralPath $OutputPath -Algorithm SHA256).Hash.ToLowerInvariant()
$evidence = Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json
Write-Host ''
Write-Host 'Persisted-connected profile completed successfully.'
Write-Host "Evidence: $OutputPath"
Write-Host "SHA-256: $digest"
Write-Host "Auto-reconnect process evidence after: $($evidence.idleProfile.reconnectEvidence.processEvidenceObservedAfterMs) ms"
Write-Host "Idle process count: $($evidence.idleProfile.processTree.processCountAtSampleEnd)"
Write-Host "Idle private memory: $([Math]::Round([double]$evidence.idleProfile.processTree.privateMemoryBytesAfterSample / 1MB, 1)) MiB"
Write-Host "Idle working set: $([Math]::Round([double]$evidence.idleProfile.processTree.workingSetBytesAfterSample / 1MB, 1)) MiB"
Write-Host "Idle CPU sample: $($evidence.idleProfile.processTree.approximateCpuPercentAcrossSample)%"
Write-Host ''
Write-Host 'Role summary:'
$evidence.idleProfile.processTree.roleSummary | ForEach-Object {
  Write-Host ("- {0}: {1} process(es), {2:N1} MiB private, {3:N1} MiB working set, {4:N3} ms CPU" -f $_.role, $_.processCount, ([double]$_.privateMemoryBytes / 1MB), ([double]$_.workingSetBytes / 1MB), [double]$_.cpuTimeDeltaMs)
}
