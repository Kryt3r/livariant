param(
  [Parameter(Mandatory = $true)][string]$AppPath,
  [Parameter(Mandatory = $true)][string]$SourceSha,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [int]$Runs = 6,
  [int]$TimeoutSeconds = 15,
  [int]$IdleSettleSeconds = 5,
  [int]$IdleSampleSeconds = 5
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
if ($IdleSettleSeconds -lt 1 -or $IdleSampleSeconds -lt 1) {
  throw 'Idle settle and sample windows must both be at least one second.'
}

function Wait-ForTopLevelWindow {
  param(
    [System.Diagnostics.Process]$Process,
    [int]$RunNumber
  )

  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  $windowHandle = [IntPtr]::Zero
  while ([DateTime]::UtcNow -lt $deadline) {
    if ($Process.HasExited) {
      throw "Livariant Desktop exited before exposing a top-level window on run $RunNumber with code $($Process.ExitCode)."
    }
    $Process.Refresh()
    $windowHandle = $Process.MainWindowHandle
    if ($windowHandle -ne [IntPtr]::Zero) { break }
    Start-Sleep -Milliseconds 10
  }
  if ($windowHandle -eq [IntPtr]::Zero) {
    throw "Livariant Desktop did not expose a top-level window within $TimeoutSeconds seconds on run $RunNumber."
  }
  return $windowHandle
}

function Measure-WindowStart {
  param([int]$RunNumber)

  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  $process = Start-Process -FilePath $AppPath -PassThru
  try {
    $null = Wait-ForTopLevelWindow -Process $process -RunNumber $RunNumber
    $watch.Stop()
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

function Get-ProcessRole {
  param($Row)

  $name = [string]$Row.Name
  if ($name -ieq 'livariant-desktop.exe') { return 'livariant-host' }
  if ($name -ine 'msedgewebview2.exe') { return 'other' }

  $commandLine = [string]$Row.CommandLine
  if ($commandLine -match '(?:^|\s)--type=([^\s"]+)') {
    $type = $Matches[1]
    if ($type -eq 'utility' -and $commandLine -match '(?:^|\s)--utility-sub-type=([^\s"]+)') {
      return "utility:$($Matches[1])"
    }
    return $type
  }
  return 'browser'
}

function Get-ProcessTreeSnapshot {
  param([int]$RootProcessId)

  $processRows = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CommandLine)
  $ids = [System.Collections.Generic.HashSet[int]]::new()
  $null = $ids.Add($RootProcessId)

  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($row in $processRows) {
      $processId = [int]$row.ProcessId
      $parent = [int]$row.ParentProcessId
      if (-not $ids.Contains($processId) -and $ids.Contains($parent)) {
        $null = $ids.Add($processId)
        $changed = $true
      }
    }
  }

  $snapshots = @()
  foreach ($processId in @($ids)) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -eq $process) { continue }
    $row = $processRows | Where-Object { [int]$_.ProcessId -eq $processId } | Select-Object -First 1
    $snapshots += [pscustomobject][ordered]@{
      processId = $processId
      name = if ($row) { [string]$row.Name } else { [string]$process.ProcessName }
      role = if ($row) { Get-ProcessRole -Row $row } else { 'unknown' }
      workingSetBytes = [int64]$process.WorkingSet64
      privateMemoryBytes = [int64]$process.PrivateMemorySize64
      totalProcessorMs = [Math]::Round($process.TotalProcessorTime.TotalMilliseconds, 3)
    }
  }
  return @($snapshots)
}

function Measure-DisconnectedIdle {
  $process = Start-Process -FilePath $AppPath -PassThru
  try {
    $null = Wait-ForTopLevelWindow -Process $process -RunNumber 0
    Start-Sleep -Seconds $IdleSettleSeconds
    if ($process.HasExited) {
      throw "Livariant Desktop exited during disconnected-idle settling with code $($process.ExitCode)."
    }

    $start = @(Get-ProcessTreeSnapshot -RootProcessId $process.Id)
    Start-Sleep -Seconds $IdleSampleSeconds
    if ($process.HasExited) {
      throw "Livariant Desktop exited during disconnected-idle sampling with code $($process.ExitCode)."
    }
    $end = @(Get-ProcessTreeSnapshot -RootProcessId $process.Id)

    $startCpuByProcessId = @{}
    foreach ($entry in $start) { $startCpuByProcessId[[int]$entry.processId] = [double]$entry.totalProcessorMs }
    $cpuDeltaMs = 0.0
    $cpuDeltaByProcessId = @{}
    foreach ($entry in $end) {
      $processId = [int]$entry.processId
      $endCpu = [double]$entry.totalProcessorMs
      $delta = 0.0
      if ($startCpuByProcessId.ContainsKey($processId)) {
        $delta = [Math]::Max(0.0, $endCpu - [double]$startCpuByProcessId[$processId])
      }
      $cpuDeltaByProcessId[$processId] = $delta
      $cpuDeltaMs += $delta
    }

    $roleSummary = @()
    foreach ($group in @($end | Group-Object -Property role | Sort-Object Name)) {
      $roleCpuDeltaMs = 0.0
      foreach ($entry in @($group.Group)) {
        $roleCpuDeltaMs += [double]$cpuDeltaByProcessId[[int]$entry.processId]
      }
      $roleSummary += [ordered]@{
        role = [string]$group.Name
        processCount = $group.Count
        workingSetBytes = [int64](($group.Group | Measure-Object -Property workingSetBytes -Sum).Sum)
        privateMemoryBytes = [int64](($group.Group | Measure-Object -Property privateMemoryBytes -Sum).Sum)
        cpuTimeDeltaMs = [Math]::Round($roleCpuDeltaMs, 3)
      }
    }

    $process.Refresh()
    return [ordered]@{
      settleSeconds = $IdleSettleSeconds
      sampleSeconds = $IdleSampleSeconds
      mainProcess = [ordered]@{
        workingSetBytesAfterSample = [int64]$process.WorkingSet64
        privateMemoryBytesAfterSample = [int64]$process.PrivateMemorySize64
      }
      processTree = [ordered]@{
        processCountAtSampleStart = $start.Count
        processCountAtSampleEnd = $end.Count
        workingSetBytesAfterSample = [int64](($end | Measure-Object -Property workingSetBytes -Sum).Sum)
        privateMemoryBytesAfterSample = [int64](($end | Measure-Object -Property privateMemoryBytes -Sum).Sum)
        cpuTimeDeltaMsAcrossSurvivingProcesses = [Math]::Round($cpuDeltaMs, 3)
        approximateCpuPercentAcrossSample = [Math]::Round(($cpuDeltaMs / ($IdleSampleSeconds * 1000.0)) * 100.0, 3)
        roleSummary = $roleSummary
        processesAfterSample = @($end | ForEach-Object {
          [ordered]@{
            processId = $_.processId
            name = $_.name
            role = $_.role
            workingSetBytes = $_.workingSetBytes
            privateMemoryBytes = $_.privateMemoryBytes
            cpuTimeDeltaMs = [Math]::Round([double]$cpuDeltaByProcessId[[int]$_.processId], 3)
          }
        })
      }
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
$idle = Measure-DisconnectedIdle
$result = [ordered]@{
  schemaVersion = 3
  benchmark = 'desktop-startup-and-disconnected-idle'
  sourceSha = $SourceSha.ToLowerInvariant()
  platform = [ordered]@{
    os = [System.Environment]::OSVersion.VersionString
    architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
  }
  startup = [ordered]@{
    runs = $measurements
    firstRunMs = [double]$measurements[0].processToWindowMs
    repeatedProcessStarts = Get-Summary -Values $repeated
  }
  disconnectedIdle = $idle
  interpretation = 'Startup measures process start to first top-level Windows window handle for the installed Livariant Desktop with packaged runtime present. Disconnected idle is a fresh CI-runner profile sampled after settling and reports process-tree snapshots, derived WebView2 process roles, and CPU time across surviving processes. Raw process command lines are not persisted. Neither measurement is Time to Interactive, a cold-boot guarantee, a connected-Codex profile, or a universal end-user performance claim.'
}

$result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Host "Desktop startup/disconnected-idle baseline written to $OutputPath"
