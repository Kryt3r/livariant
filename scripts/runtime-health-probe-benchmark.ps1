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

$identitySamples = @()
for ($i = 0; $i -lt $Iterations; $i++) {
  $identity = Invoke-MeasuredProcess -FilePath $NodePath -ArgumentList @($CoreCliPath, 'version', '--json') -Environment @{ PBF_RUNTIME_DELEGATION_BYPASS = '1' }
  $identityJson = $identity.stdout | ConvertFrom-Json
  if (-not $identityJson.frameworkVersion) {
    throw "Runtime identity probe did not return frameworkVersion."
  }
  if ($identityJson.nodeVersion -notmatch '^v\d+\.\d+\.\d+') {
    throw "Runtime identity probe did not return a valid executing nodeVersion: $($identityJson.nodeVersion)"
  }
  $identitySamples += [ordered]@{
    iteration = $i + 1
    durationMs = $identity.durationMs
    observedFrameworkVersion = $identityJson.frameworkVersion
    observedNodeVersion = $identityJson.nodeVersion
  }
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
  schemaVersion = 2
  benchmark = 'runtime-health-single-identity-probe-cost'
  sourceSha = $SourceSha.ToLowerInvariant()
  platform = [System.Environment]::OSVersion.VersionString
  architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
  iterations = $Iterations
  identityProbe = [ordered]@{
    command = 'livariant-node.exe <core-cli> version --json'
    environment = 'PBF_RUNTIME_DELEGATION_BYPASS=1'
    summary = Summarize-Durations -Samples $identitySamples
    samples = $identitySamples
  }
  interpretation = 'Measures fresh child-process execution cost of the single combined Node/Core identity probe used by optimized runtime_health. The executing Node version and Core framework version are reported by the same process. It does not measure complete Desktop startup or TTI.'
}

$result | ConvertTo-Json -Depth 8
