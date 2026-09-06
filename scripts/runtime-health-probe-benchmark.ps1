param(
  [Parameter(Mandatory = $true)][string]$NodePath,
  [Parameter(Mandatory = $true)][string]$CoreCliPath,
  [Parameter(Mandatory = $true)][string]$SourceSha,
  [int]$Iterations = 6
)

$ErrorActionPreference = "Stop"

if ($SourceSha -notmatch '^[0-9a-fA-F]{40}$') {
  throw "SourceSha must be an exact 40-character Git SHA."
}
if ($Iterations -lt 2) {
  throw "Iterations must be at least 2 so first-run and repeated-process evidence are both captured."
}
if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf)) {
  throw "Pinned Node executable not found: $NodePath"
}
if (-not (Test-Path -LiteralPath $CoreCliPath -PathType Leaf)) {
  throw "Livariant Core CLI not found: $CoreCliPath"
}

function Invoke-MeasuredProcess {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$ArgumentList,
    [hashtable]$Environment = @{}
  )

  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $FilePath
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  foreach ($arg in $ArgumentList) { [void]$psi.ArgumentList.Add($arg) }
  foreach ($key in $Environment.Keys) { $psi.Environment[$key] = [string]$Environment[$key] }

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $psi
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  if (-not $process.Start()) { throw "Failed to start benchmark process: $FilePath" }
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  $sw.Stop()

  if ($process.ExitCode -ne 0) {
    throw "Benchmark process failed with exit code $($process.ExitCode): $stderr"
  }

  return [ordered]@{
    durationMs = [math]::Round($sw.Elapsed.TotalMilliseconds, 3)
    stdout = $stdout.Trim()
  }
}

$nodeSamples = @()
$coreSamples = @()
for ($i = 0; $i -lt $Iterations; $i++) {
  $node = Invoke-MeasuredProcess -FilePath $NodePath -ArgumentList @('--version')
  if ($node.stdout -notmatch '^v\d+\.\d+\.\d+') {
    throw "Unexpected Node version output: $($node.stdout)"
  }
  $nodeSamples += [ordered]@{ iteration = $i + 1; durationMs = $node.durationMs; observedVersion = $node.stdout }

  $core = Invoke-MeasuredProcess -FilePath $NodePath -ArgumentList @($CoreCliPath, 'version', '--json') -Environment @{ PBF_RUNTIME_DELEGATION_BYPASS = '1' }
  $coreJson = $core.stdout | ConvertFrom-Json
  if (-not $coreJson.frameworkVersion) {
    throw "Core version probe did not return frameworkVersion."
  }
  $coreSamples += [ordered]@{ iteration = $i + 1; durationMs = $core.durationMs; observedFrameworkVersion = $coreJson.frameworkVersion }
}

function Summarize-Durations {
  param([object[]]$Samples)
  $values = @($Samples | ForEach-Object { [double]$_.durationMs })
  $repeatValues = @($values | Select-Object -Skip 1)
  return [ordered]@{
    firstProcessStartMs = $values[0]
    repeatedProcessMeanMs = [math]::Round((($repeatValues | Measure-Object -Average).Average), 3)
    repeatedProcessMinMs = [math]::Round((($repeatValues | Measure-Object -Minimum).Minimum), 3)
    repeatedProcessMaxMs = [math]::Round((($repeatValues | Measure-Object -Maximum).Maximum), 3)
  }
}

$result = [ordered]@{
  schemaVersion = 1
  benchmark = 'runtime-health-probe-cost'
  sourceSha = $SourceSha.ToLowerInvariant()
  platform = [System.Environment]::OSVersion.VersionString
  architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
  iterations = $Iterations
  nodeProbe = [ordered]@{
    command = 'livariant-node.exe --version'
    summary = Summarize-Durations -Samples $nodeSamples
    samples = $nodeSamples
  }
  coreProbe = [ordered]@{
    command = 'livariant-node.exe <core-cli> version --json'
    environment = 'PBF_RUNTIME_DELEGATION_BYPASS=1'
    summary = Summarize-Durations -Samples $coreSamples
    samples = $coreSamples
  }
  interpretation = 'Measures fresh child-process execution cost of the same Node/Core identity probes used by runtime_health. It does not measure complete Desktop startup or TTI.'
}

$result | ConvertTo-Json -Depth 8
