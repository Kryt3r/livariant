param(
  [Parameter(Mandatory = $true)][string]$AppPath,
  [Parameter(Mandatory = $true)][string]$SourceSha,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [int]$Runs = 6,
  [int]$TimeoutSeconds = 15
)

$ErrorActionPreference = 'Stop'

if ($SourceSha -notmatch '^[0-9a-fA-F]{40}$') {
  throw 'SourceSha must be an exact 40-character Git SHA.'
}
if (-not (Test-Path -LiteralPath $AppPath -PathType Leaf)) {
  throw "Desktop executable not found: $AppPath"
}
if ($Runs -lt 2) {
  throw 'At least two runs are required.'
}

function Measure-WindowStart {
  param([int]$RunNumber)

  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  $process = Start-Process -FilePath $AppPath -PassThru
  try {
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $windowHandle = [IntPtr]::Zero
    while ([DateTime]::UtcNow -lt $deadline) {
      if ($process.HasExited) {
        throw "Livariant Desktop exited before exposing a top-level window on run $RunNumber with code $($process.ExitCode)."
      }
      $process.Refresh()
      $windowHandle = $process.MainWindowHandle
      if ($windowHandle -ne [IntPtr]::Zero) { break }
      Start-Sleep -Milliseconds 10
    }
    $watch.Stop()
    if ($windowHandle -eq [IntPtr]::Zero) {
      throw "Livariant Desktop did not expose a top-level window within $TimeoutSeconds seconds on run $RunNumber."
    }
    $process.Refresh()
    return [ordered]@{
      run = $RunNumber
      processToWindowMs = [Math]::Round($watch.Elapsed.TotalMilliseconds, 3)
      workingSetBytesAtWindow = [int64]$process.WorkingSet64
      peakWorkingSetBytesAtWindow = [int64]$process.PeakWorkingSet64
    }
  }
  finally {
    if (-not $process.HasExited) {
      Stop-Process -Id $process.Id -Force
      $process.WaitForExit()
    }
  }
}

function Get-Summary {
  param([double[]]$Values)
  $sorted = @($Values | Sort-Object)
  $count = $sorted.Count
  if ($count -eq 0) { throw 'Cannot summarize an empty measurement set.' }
  $median = if (($count % 2) -eq 1) {
    [double]$sorted[[int][Math]::Floor($count / 2)]
  } else {
    ([double]$sorted[$count / 2 - 1] + [double]$sorted[$count / 2]) / 2
  }
  return [ordered]@{
    count = $count
    minMs = [Math]::Round(([double]($sorted | Measure-Object -Minimum).Minimum), 3)
    meanMs = [Math]::Round(([double]($sorted | Measure-Object -Average).Average), 3)
    medianMs = [Math]::Round($median, 3)
    maxMs = [Math]::Round(([double]($sorted | Measure-Object -Maximum).Maximum), 3)
  }
}

$measurements = @()
for ($run = 1; $run -le $Runs; $run++) {
  $measurements += Measure-WindowStart -RunNumber $run
  Start-Sleep -Milliseconds 500
}

$repeated = @($measurements | Select-Object -Skip 1 | ForEach-Object { [double]$_.processToWindowMs })
$result = [ordered]@{
  schemaVersion = 1
  benchmark = 'desktop-process-to-window'
  sourceSha = $SourceSha.ToLowerInvariant()
  platform = [ordered]@{
    os = [System.Environment]::OSVersion.VersionString
    architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
  }
  runs = $measurements
  firstRunMs = [double]$measurements[0].processToWindowMs
  repeatedProcessStarts = Get-Summary -Values $repeated
  interpretation = 'Measures process start to first top-level Windows window handle for the installed Livariant Desktop with packaged runtime present. It is not Time to Interactive, not a cold-boot guarantee, and not a universal end-user latency claim.'
}

$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Host "Desktop process-to-window baseline written to $OutputPath"
