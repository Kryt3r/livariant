param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$SourceSha
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$desktopRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location $desktopRoot

$server = $null
$installDir = $null
$oldSigningKey = $env:TAURI_SIGNING_PRIVATE_KEY
$oldSigningPassword = $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
$ciEnvNames = @(
  'APPDATA',
  'LOCALAPPDATA',
  'LIVARIANT_CI_UPDATER_ACCEPTANCE',
  'LIVARIANT_CI_UPDATER_ENDPOINT',
  'LIVARIANT_CI_UPDATER_PUBLIC_KEY',
  'LIVARIANT_CI_EXPECTED_VERSION',
  'LIVARIANT_CI_RESULT_PATH'
)
$oldCiEnv = @{}
foreach ($name in $ciEnvNames) {
  $oldCiEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
  $tauriConfig = Get-Content -LiteralPath 'src-tauri\tauri.conf.json' -Raw | ConvertFrom-Json
  $newVersion = [string]$tauriConfig.version
  if ($newVersion -notmatch '^(?<prefix>\d+\.\d+\.\d+)-rc\.(?<number>\d+)$') {
    throw "CI updater acceptance currently requires a Desktop rc version; got $newVersion."
  }
  $newNumber = [int]$Matches.number
  if ($newNumber -lt 1) {
    throw "Cannot derive an older Desktop preview from $newVersion."
  }
  $oldVersion = "$($Matches.prefix)-rc.$($newNumber - 1)"

  $root = Join-Path $env:RUNNER_TEMP 'LivariantUpdaterAcceptance'
  $feedDir = Join-Path $root 'feed'
  $installDir = Join-Path $env:ProgramFiles 'Livariant'
  $appData = Join-Path $root 'appdata'
  $localAppData = Join-Path $root 'localappdata'
  $livariantAppData = Join-Path $appData 'dev.livariant.desktop'
  $resultPath = Join-Path $root 'result.json'
  $userDataSentinel = Join-Path $livariantAppData 'upgrade-preservation-sentinel.txt'
  $legacyFirstRunState = Join-Path $livariantAppData 'first-run-project-source-review-request.json'
  $privateKeyPath = Join-Path $root 'ci-updater.key'
  $publicKeyPath = "$privateKeyPath.pub"
  $newConfigPath = Join-Path $root 'new.conf.json'
  $oldConfigPath = Join-Path $root 'old.conf.json'
  $port = 18765

  Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $installDir -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $root, $feedDir, $appData, $localAppData, $livariantAppData -Force | Out-Null

  $env:APPDATA = $appData
  $env:LOCALAPPDATA = $localAppData
  Set-Content -LiteralPath $userDataSentinel -Value 'preserve-existing-livariant-app-data' -Encoding utf8
  [ordered]@{
    schemaVersion = 1
    onboardingState = [ordered]@{
      schemaVersion = 1
      currentStep = 'project'
      completed = $false
      project = [ordered]@{}
      understanding = [ordered]@{
        projectRoot = ''
        questions = @()
      }
      boundaries = [ordered]@{
        grantsAuthority = $false
        mutationAuthorized = $false
        changesProjectOwnedFiles = $false
      }
    }
    selectedReviewPaths = @()
    decisions = @()
  } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $legacyFirstRunState -Encoding utf8

  $password = 'livariant-ci-updater-acceptance-only'
  & npm run tauri signer generate -- --ci --password $password --write-keys $privateKeyPath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to generate ephemeral CI updater signing key."
  }
  if (-not (Test-Path -LiteralPath $privateKeyPath -PathType Leaf) -or
      -not (Test-Path -LiteralPath $publicKeyPath -PathType Leaf)) {
    throw "Ephemeral CI updater signing key pair was not generated as expected."
  }

  $publicKey = (Get-Content -LiteralPath $publicKeyPath -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($publicKey)) {
    throw "Ephemeral CI updater public key is empty."
  }

  [ordered]@{
    version = $newVersion
    plugins = [ordered]@{
      updater = [ordered]@{
        pubkey = $publicKey
        dangerousInsecureTransportProtocol = $true
      }
    }
  } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $newConfigPath -Encoding utf8

  [ordered]@{
    version = $oldVersion
    plugins = [ordered]@{
      updater = [ordered]@{
        pubkey = $publicKey
        dangerousInsecureTransportProtocol = $true
      }
    }
  } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $oldConfigPath -Encoding utf8

  $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -LiteralPath $privateKeyPath -Raw
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $password
  Remove-Item -LiteralPath 'src-tauri\target\release\bundle\nsis' -Recurse -Force -ErrorAction SilentlyContinue

  & npm run tauri:build -- --config src-tauri/tauri.preview-update.conf.json --config $newConfigPath --bundles nsis --ci --features ci-updater-acceptance
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to build signed newer CI updater fixture."
  }

  $bundleDir = Join-Path $desktopRoot 'src-tauri\target\release\bundle\nsis'
  $newInstallers = @(Get-ChildItem -LiteralPath $bundleDir -Filter '*.exe' -File)
  $newSignatures = @(Get-ChildItem -LiteralPath $bundleDir -Filter '*.exe.sig' -File)
  if ($newInstallers.Count -ne 1 -or $newSignatures.Count -ne 1) {
    throw "Expected exactly one newer installer and signature; found $($newInstallers.Count) installer(s) and $($newSignatures.Count) signature(s)."
  }

  $newInstaller = Join-Path $feedDir $newInstallers[0].Name
  Copy-Item -LiteralPath $newInstallers[0].FullName -Destination $newInstaller
  $signature = (Get-Content -LiteralPath $newSignatures[0].FullName -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($signature)) {
    throw "Newer CI updater signature is empty."
  }

  $assetUrl = "http://127.0.0.1:$port/$($newInstallers[0].Name)"
  $latest = [ordered]@{
    version = $newVersion
    notes = "Livariant CI-only signed updater acceptance fixture from exact source $SourceSha."
    pub_date = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    platforms = [ordered]@{
      'windows-x86_64' = [ordered]@{
        signature = $signature
        url = $assetUrl
      }
    }
  }
  $latest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $feedDir 'latest.json') -Encoding utf8

  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath 'src-tauri\target\release\bundle\nsis' -Recurse -Force -ErrorAction SilentlyContinue

  & npm run tauri:build -- --config src-tauri/tauri.runtime.conf.json --config $oldConfigPath --bundles nsis --ci --features ci-updater-acceptance
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to build older CI updater fixture."
  }

  $oldInstallers = @(Get-ChildItem -LiteralPath $bundleDir -Filter '*.exe' -File)
  if ($oldInstallers.Count -ne 1) {
    throw "Expected exactly one older installer; found $($oldInstallers.Count)."
  }

  Remove-Item -LiteralPath $installDir -Recurse -Force -ErrorAction SilentlyContinue
  $install = Start-Process -FilePath $oldInstallers[0].FullName -ArgumentList '/S' -Wait -PassThru
  if ($install.ExitCode -ne 0) {
    throw "Older CI fixture install failed with exit code $($install.ExitCode)."
  }

  $app = Join-Path $installDir 'livariant-desktop.exe'
  $node = Join-Path $installDir 'livariant-node.exe'
  $manifestPath = Join-Path $installDir 'runtime\manifest.json'
  $coreCli = Join-Path $installDir 'runtime\core\dist\src\cli\index.js'
  $firstRunLifecycle = Join-Path $installDir 'runtime\core\dist\src\project\desktop-first-run-lifecycle-cli.js'
  foreach ($required in @($app, $node, $manifestPath, $coreCli, $firstRunLifecycle)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
      throw "Older installed CI fixture is incomplete: $required"
    }
  }

  $python = (Get-Command python -ErrorAction Stop).Source
  $server = Start-Process -FilePath $python -ArgumentList @('-m', 'http.server', "$port", '--bind', '127.0.0.1') -WorkingDirectory $feedDir -PassThru -WindowStyle Hidden

  $feedUri = "http://127.0.0.1:$port/latest.json"
  $feedReady = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $feedUri -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $feedReady = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $feedReady) {
    throw "Local signed CI updater feed did not become ready."
  }

  Remove-Item -LiteralPath $resultPath -Force -ErrorAction SilentlyContinue
  $env:LIVARIANT_CI_UPDATER_ACCEPTANCE = '1'
  $env:LIVARIANT_CI_UPDATER_ENDPOINT = $feedUri
  $env:LIVARIANT_CI_UPDATER_PUBLIC_KEY = $publicKey
  $env:LIVARIANT_CI_EXPECTED_VERSION = $newVersion
  $env:LIVARIANT_CI_RESULT_PATH = $resultPath

  $oldProcess = Start-Process -FilePath $app -PassThru
  Write-Host "Started installed $oldVersion CI fixture; waiting for signed update to $newVersion."

  $oldExited = $false
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    if ($oldProcess.HasExited) {
      $oldExited = $true
      break
    }
    if (Test-Path -LiteralPath $resultPath -PathType Leaf) {
      $failureResult = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
      throw "Older Desktop returned before replacement completed: $($failureResult | ConvertTo-Json -Compress)."
    }
    Start-Sleep -Seconds 2
  }
  if (-not $oldExited) {
    throw "Timed out waiting for the older Desktop to hand off to the updater installer."
  }

  Start-Sleep -Seconds 4
  $remainingInstalled = @()
  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    $remainingInstalled = @(
      Get-Process -Name 'livariant-desktop' -ErrorAction SilentlyContinue | Where-Object {
        try { $_.Path -eq $app } catch { $false }
      }
    )
    if ($remainingInstalled.Count -eq 0) {
      break
    }
    foreach ($candidate in $remainingInstalled) {
      try {
        Stop-Process -Id $candidate.Id -Force -ErrorAction Stop
      } catch {
        Write-Host "Could not stop automatically restarted Desktop process $($candidate.Id): $($_.Exception.Message)"
      }
    }
    Start-Sleep -Seconds 1
  }
  $remainingInstalled = @(
    Get-Process -Name 'livariant-desktop' -ErrorAction SilentlyContinue | Where-Object {
      try { $_.Path -eq $app } catch { $false }
    }
  )
  if ($remainingInstalled.Count -ne 0) {
    throw "Automatically restarted Desktop process still owns the installed executable before identity verification."
  }

  Remove-Item -LiteralPath $resultPath -Force -ErrorAction SilentlyContinue
  $verificationProcess = Start-Process -FilePath $app -PassThru
  Write-Host "Restarting the updated installed Desktop explicitly for identity verification."

  $resultReady = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (Test-Path -LiteralPath $resultPath -PathType Leaf) {
      $resultReady = $true
      break
    }
    $verificationProcess.Refresh()
    if ($verificationProcess.HasExited) {
      throw "Updated Desktop identity verification exited with code $($verificationProcess.ExitCode) before producing evidence."
    }
    Start-Sleep -Seconds 2
  }
  if (-not $resultReady) {
    throw "Timed out waiting for the updated Desktop to confirm its installed package identity."
  }

  $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
  if ($result.state -ne 'current' -or $result.currentVersion -ne $newVersion) {
    throw "Updater transition did not finish in the expected newer state: $($result | ConvertTo-Json -Compress)."
  }

  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  if ($manifest.coreSourceSha -ne $SourceSha) {
    throw "Updated runtime source provenance mismatch. Expected $SourceSha, got $($manifest.coreSourceSha)."
  }
  if ($manifest.authorityIssued -ne $false) {
    throw "Updated ordinary runtime manifest must not claim Authority."
  }

  $nodeVersion = (& $node --version | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $nodeVersion -ne "v$($manifest.nodeVersion)") {
    throw "Updated bundled Node runtime identity mismatch: $nodeVersion"
  }

  $previousBypass = $env:PBF_RUNTIME_DELEGATION_BYPASS
  $env:PBF_RUNTIME_DELEGATION_BYPASS = '1'
  try {
    $versionJson = (& $node $coreCli version --json 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
      throw "Updated bundled Core identity probe failed: $versionJson"
    }
    $versionInfo = $versionJson | ConvertFrom-Json
    if ($versionInfo.frameworkVersion -ne $manifest.coreVersion) {
      throw "Updated bundled Core version mismatch. Manifest=$($manifest.coreVersion), runtime=$($versionInfo.frameworkVersion)."
    }
  } finally {
    $env:PBF_RUNTIME_DELEGATION_BYPASS = $previousBypass
  }

  if (-not (Test-Path -LiteralPath $userDataSentinel -PathType Leaf)) {
    throw "Updater removed existing Livariant app-data sentinel."
  }
  $sentinel = (Get-Content -LiteralPath $userDataSentinel -Raw).Trim()
  if ($sentinel -ne 'preserve-existing-livariant-app-data') {
    throw "Updater altered existing Livariant app-data sentinel."
  }
  if (-not (Test-Path -LiteralPath $legacyFirstRunState -PathType Leaf)) {
    throw "Updater removed persisted Livariant first-run state."
  }

  $previousFirstRunStatePath = $env:LIVARIANT_FIRST_RUN_PROJECT_STATE_PATH
  $previousFirstRunActionPath = $env:LIVARIANT_FIRST_RUN_ACTION_PATH
  $env:LIVARIANT_FIRST_RUN_PROJECT_STATE_PATH = $legacyFirstRunState
  Remove-Item Env:LIVARIANT_FIRST_RUN_ACTION_PATH -ErrorAction SilentlyContinue
  try {
    $firstRunJson = (& $node $firstRunLifecycle 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
      throw "Updated bundled first-run lifecycle could not read preserved existing state: $firstRunJson"
    }
    $firstRun = $firstRunJson | ConvertFrom-Json
    if ($firstRun.status -ne 'in-progress' -or $firstRun.onboardingState.currentStep -ne 'project') {
      throw "Updated bundled first-run lifecycle did not preserve the existing resumable state: $firstRunJson"
    }
    if ($firstRun.onboardingState.boundaries.grantsAuthority -ne $false -or
        $firstRun.onboardingState.boundaries.mutationAuthorized -ne $false -or
        $firstRun.onboardingState.boundaries.changesProjectOwnedFiles -ne $false) {
      throw "Preserved first-run state compatibility weakened protected boundaries."
    }
  } finally {
    if ($null -eq $previousFirstRunStatePath) {
      Remove-Item Env:LIVARIANT_FIRST_RUN_PROJECT_STATE_PATH -ErrorAction SilentlyContinue
    } else {
      $env:LIVARIANT_FIRST_RUN_PROJECT_STATE_PATH = $previousFirstRunStatePath
    }
    if ($null -eq $previousFirstRunActionPath) {
      Remove-Item Env:LIVARIANT_FIRST_RUN_ACTION_PATH -ErrorAction SilentlyContinue
    } else {
      $env:LIVARIANT_FIRST_RUN_ACTION_PATH = $previousFirstRunActionPath
    }
  }

  Write-Host "Existing Livariant APPDATA and resumable first-run state survived the signed updater transition."
  Write-Host "Old installed Desktop $oldVersion -> signed $newVersion updater acceptance passed for exact source provenance $SourceSha."
} finally {
  foreach ($name in $ciEnvNames) {
    [Environment]::SetEnvironmentVariable($name, $oldCiEnv[$name], 'Process')
  }
  [Environment]::SetEnvironmentVariable('TAURI_SIGNING_PRIVATE_KEY', $oldSigningKey, 'Process')
  [Environment]::SetEnvironmentVariable('TAURI_SIGNING_PRIVATE_KEY_PASSWORD', $oldSigningPassword, 'Process')

  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    $server.WaitForExit()
  }

  if ($installDir -and (Test-Path -LiteralPath $installDir)) {
    $uninstallers = @(Get-ChildItem -LiteralPath $installDir -Filter '*uninstall*.exe' -File -ErrorAction SilentlyContinue)
    if ($uninstallers.Count -eq 1) {
      Start-Process -FilePath $uninstallers[0].FullName -ArgumentList '/S' -Wait -ErrorAction SilentlyContinue | Out-Null
    }
  }

  Pop-Location
}
