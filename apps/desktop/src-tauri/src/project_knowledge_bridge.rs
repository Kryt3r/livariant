use crate::desktop_project_registry::{
    active_project_scope, DesktopProjectRegistryState,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{io::Write, path::{Path, PathBuf}, process::{Command, Stdio}};
use tauri::{Manager, State};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    authority_issued: bool,
    core_source_sha: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProtectedBootstrapAssets {
    source_sha: String,
    authority_issued: bool,
}

fn bundled_node_path(install_root: &Path) -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    { install_root.join("livariant-node.exe") }
    #[cfg(not(target_os = "windows"))]
    { install_root.join("livariant-node") }
}

fn hidden_command(program: &Path) -> Command {
    let mut command = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
}

fn run_project_knowledge_for_roots(
    local_root: &Path,
    state_root: &Path,
    request: Value,
) -> Result<Value, String> {
    let executable = std::env::current_exe()
        .map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable.parent().ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?;
    let node = bundled_node_path(install_root);
    let script = install_root
        .join("runtime").join("core").join("dist").join("src").join("project")
        .join("desktop-project-knowledge.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !script.is_file() || !manifest_path.is_file() {
        return Err("Bundled Project Knowledge runtime is not present in this Desktop build.".to_owned());
    }
    let manifest: RuntimeManifest = serde_json::from_slice(
        &std::fs::read(&manifest_path).map_err(|error| format!("Bundled runtime manifest could not be read: {error}"))?
    ).map_err(|error| format!("Bundled runtime manifest is invalid: {error}"))?;
    if manifest.authority_issued {
        return Err("Ordinary bundled runtime material must never claim Authority.".to_owned());
    }

    let mut child = hidden_command(&node)
        .arg(&script)
        .current_dir(install_root)
        .env("LIVARIANT_PROJECT_ROOT", local_root)
        .env("LIVARIANT_PROJECT_BRAIN_ROOT", state_root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Project Knowledge runtime could not be started: {error}"))?;
    {
        let input = child.stdin.as_mut().ok_or_else(|| "Project Knowledge runtime stdin is unavailable.".to_owned())?;
        input.write_all(request.to_string().as_bytes())
            .map_err(|error| format!("Project Knowledge request could not be written: {error}"))?;
    }
    let output = child.wait_with_output()
        .map_err(|error| format!("Project Knowledge runtime could not be read: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if stderr.is_empty() { "Project Knowledge request failed closed.".to_owned() } else { stderr });
    }
    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Project Knowledge runtime returned invalid JSON: {error}"))
}

fn run_project_knowledge(
    app: &tauri::AppHandle,
    registry: &DesktopProjectRegistryState,
    request: Value,
) -> Result<Value, String> {
    let scope = active_project_scope(app, registry)?;
    let result = run_project_knowledge_for_roots(&scope.local_root, &scope.state_root, request)?;
    let current = active_project_scope(app, registry)?;
    if current.generation != scope.generation || current.desktop_project_id != scope.desktop_project_id {
        return Err("Active Desktop project changed while Project Knowledge was loading; stale result rejected.".to_owned());
    }
    Ok(result)
}

pub(crate) fn ensure_project_brain_storage_for_roots(
    local_root: &Path,
    state_root: &Path,
) -> Result<(), String> {
    run_project_knowledge_for_roots(local_root, state_root, json!({ "method": "ensure-storage" }))?;
    Ok(())
}

#[tauri::command]
pub async fn project_knowledge_snapshot(
    app: tauri::AppHandle,
    registry: State<'_, DesktopProjectRegistryState>,
) -> Result<Value, String> {
    let app_for_worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let state = app_for_worker.state::<DesktopProjectRegistryState>();
        run_project_knowledge(&app_for_worker, state.inner(), json!({ "method": "read" }))
    }).await.map_err(|error| format!("Project Knowledge worker failed: {error}"))??;
    Ok(result)
}

#[tauri::command]
pub async fn prepare_project_knowledge_proposal(
    app: tauri::AppHandle,
    registry: State<'_, DesktopProjectRegistryState>,
    area_id: String,
    value: String,
) -> Result<Value, String> {
    let scope = active_project_scope(&app, registry.inner())?;
    let expected_generation = scope.generation;
    let app_for_worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let state = app_for_worker.state::<DesktopProjectRegistryState>();
        run_project_knowledge(&app_for_worker, state.inner(), json!({
            "method": "prepare",
            "areaId": area_id,
            "value": value,
        }))
    }).await.map_err(|error| format!("Project Knowledge proposal worker failed: {error}"))??;
    let current = active_project_scope(&app, registry.inner())?;
    if current.generation != expected_generation || current.desktop_project_id != scope.desktop_project_id {
        return Err("Active Desktop project changed while the Project Knowledge proposal was prepared; stale result rejected.".to_owned());
    }
    Ok(result)
}


#[tauri::command]
pub async fn apply_project_knowledge_proposal(
    app: tauri::AppHandle,
    registry: State<'_, DesktopProjectRegistryState>,
    area_id: String,
    proposal: Value,
    confirmed_proposal_digest: String,
    language: Option<String>,
) -> Result<Value, String> {
    let scope = active_project_scope(&app, registry.inner())?;
    let expected_generation = scope.generation;
    let expected_project = scope.desktop_project_id.clone();
    let app_for_worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let state = app_for_worker.state::<DesktopProjectRegistryState>();
        run_project_knowledge(&app_for_worker, state.inner(), json!({
            "method": "apply",
            "areaId": area_id,
            "proposal": proposal,
            "confirmedProposalDigest": confirmed_proposal_digest,
            "language": language,
        }))
    }).await.map_err(|error| format!("Project Knowledge apply worker failed: {error}"))??;
    let current = active_project_scope(&app, registry.inner())?;
    if current.generation != expected_generation || current.desktop_project_id != expected_project {
        return Err("Active Desktop project changed while Project Knowledge was being applied. The operation remained bound to the original project; stale renderer result rejected.".to_owned());
    }
    Ok(result)
}


#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeProtectionLaunchResult {
    state: &'static str,
    detail: String,
    boundaries: Value,
}

#[tauri::command]
pub async fn project_knowledge_protection_status(
    app: tauri::AppHandle,
    registry: State<'_, DesktopProjectRegistryState>,
) -> Result<Value, String> {
    let scope = active_project_scope(&app, registry.inner())?;
    let expected_generation = scope.generation;
    let expected_project = scope.desktop_project_id.clone();
    let app_for_worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let state = app_for_worker.state::<DesktopProjectRegistryState>();
        run_project_knowledge(&app_for_worker, state.inner(), json!({ "method": "protection" }))
    }).await.map_err(|error| format!("Project Knowledge protection worker failed: {error}"))??;
    let current = active_project_scope(&app, registry.inner())?;
    if current.generation != expected_generation || current.desktop_project_id != expected_project {
        return Err("Active Desktop project changed while protection readiness was inspected; stale result rejected.".to_owned());
    }
    Ok(result)
}

#[cfg(target_os = "windows")]
fn fixed_desktop_install_root() -> PathBuf {
    PathBuf::from(r"C:\Program Files\Livariant")
}

#[cfg(not(target_os = "windows"))]
fn fixed_desktop_install_root() -> PathBuf {
    PathBuf::from("/opt/livariant/desktop")
}

#[cfg(target_os = "windows")]
async fn run_elevated_powershell_script(script_path: PathBuf) -> Result<(), String> {
    let powershell = PathBuf::from(r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe");
    let escaped_script = script_path.display().to_string().replace('\'', "''");
    let escaped_powershell = powershell.display().to_string().replace('\'', "''");
    let launcher = format!(
        "$args=@('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','\"{}\"'); try {{$p=Start-Process -FilePath '{}' -ArgumentList $args -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ErrorAction Stop; exit $p.ExitCode}} catch {{Write-Error $_; exit 1}}",
        escaped_script,
        escaped_powershell
    );
    let status = tauri::async_runtime::spawn_blocking(move || {
        hidden_command(&powershell)
            .args(["-NoProfile", "-NonInteractive", "-Command", &launcher])
            .status()
    })
    .await
    .map_err(|error| format!("Protected setup worker failed: {error}"))?
    .map_err(|error| format!("Protected setup could not be started: {error}"))?;
    if !status.success() {
        return Err("Protected setup did not complete. UAC may have been cancelled or the protected setup failed.".to_owned());
    }
    Ok(())
}

#[tauri::command]
pub async fn launch_project_knowledge_stage_a_setup(
    app: tauri::AppHandle,
    registry: State<'_, DesktopProjectRegistryState>,
) -> Result<ProjectKnowledgeProtectionLaunchResult, String> {
    let scope = active_project_scope(&app, registry.inner())?;
    let protection = {
        let state = app.state::<DesktopProjectRegistryState>();
        run_project_knowledge(&app, state.inner(), json!({ "method": "protection" }))?
    };
    if protection.get("state").and_then(Value::as_str) != Some("protected-source-required") {
        return Err("Protected Stage A may launch only when the protected source is the next required readiness step.".to_owned());
    }

    let executable = std::env::current_exe()
        .map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable.parent().ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?.to_path_buf();
    if install_root != fixed_desktop_install_root() {
        return Err("Protected Stage A may launch only from the fixed per-machine Livariant Desktop installation root.".to_owned());
    }

    let runtime_manifest_path = install_root.join("runtime").join("manifest.json");
    let assets_root = install_root.join("runtime").join("protected-bootstrap-assets");
    let assets_manifest_path = assets_root.join("protected-bootstrap-assets.json");
    let stage_a = assets_root.join("desktop-stage-a.ps1");
    if !runtime_manifest_path.is_file() || !assets_manifest_path.is_file() || !stage_a.is_file() {
        return Err("Exact protected Stage-A material is missing from this Desktop installation. Repair or reinstall Livariant.".to_owned());
    }
    let runtime_manifest: RuntimeManifest = serde_json::from_slice(
        &std::fs::read(&runtime_manifest_path).map_err(|error| format!("Desktop runtime manifest could not be read: {error}"))?
    ).map_err(|error| format!("Desktop runtime manifest is invalid: {error}"))?;
    let assets: ProtectedBootstrapAssets = serde_json::from_slice(
        &std::fs::read(&assets_manifest_path).map_err(|error| format!("Protected bootstrap assets manifest could not be read: {error}"))?
    ).map_err(|error| format!("Protected bootstrap assets manifest is invalid: {error}"))?;
    if runtime_manifest.authority_issued || assets.authority_issued || runtime_manifest.core_source_sha != assets.source_sha {
        return Err("Protected Stage-A material does not match the exact ordinary Desktop runtime identity or incorrectly claims Authority.".to_owned());
    }

    #[cfg(target_os = "windows")]
    {
        run_elevated_powershell_script(stage_a.clone()).await?;
        let state = app.state::<DesktopProjectRegistryState>();
        let refreshed = run_project_knowledge(&app, state.inner(), json!({ "method": "protection" }))?;
        if refreshed.get("state").and_then(Value::as_str) == Some("protected-source-required") {
            return Err("Protected Stage A finished without establishing the protected source.".to_owned());
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        return Err("Desktop protected Stage-A setup launcher is currently implemented for Windows only.".to_owned());
    }

    let current = active_project_scope(&app, registry.inner())?;
    if current.generation != scope.generation || current.desktop_project_id != scope.desktop_project_id {
        return Err("Active Desktop project changed while protected Stage A was launched; stale result rejected.".to_owned());
    }

    Ok(ProjectKnowledgeProtectionLaunchResult {
        state: "completed",
        detail: "Protected Stage A completed from the exact fixed Livariant Desktop installation.".to_owned(),
        boundaries: json!({
            "rendererSuppliesExecutable": false,
            "rendererSuppliesPath": false,
            "fixedPerMachineInstall": true,
            "exactSourceIdentityRequired": true,
            "uacRequired": true,
            "authorityIssued": false,
            "projectFilesChanged": false
        }),
    })
}

#[cfg(target_os = "windows")]
fn fixed_desktop_guardian_launcher() -> PathBuf {
    PathBuf::from(r"C:\Program Files\Livariant\Bootstrap\v1\guardian-bootstrap-desktop.ps1")
}

#[cfg(not(target_os = "windows"))]
fn fixed_desktop_guardian_launcher() -> PathBuf {
    PathBuf::from("/opt/livariant/bootstrap/v1/guardian-bootstrap")
}

#[tauri::command]
pub async fn launch_project_knowledge_protection_setup(
    app: tauri::AppHandle,
    registry: State<'_, DesktopProjectRegistryState>,
) -> Result<ProjectKnowledgeProtectionLaunchResult, String> {
    let scope = active_project_scope(&app, registry.inner())?;
    let protection = {
        let state = app.state::<DesktopProjectRegistryState>();
        run_project_knowledge(&app, state.inner(), json!({ "method": "protection" }))?
    };
    if protection.get("state").and_then(Value::as_str) != Some("guardian-bootstrap-required") {
        return Err("Protected Guardian setup may launch only when exact protected Stage A is verified and Guardian bootstrap is the next required step.".to_owned());
    }

    let launcher = fixed_desktop_guardian_launcher();
    if !launcher.is_file() {
        return Err("Protected Guardian Stage-B launcher is not available from the fixed protected source. Repair or reinstall Livariant Stage-A material first.".to_owned());
    }

    #[cfg(target_os = "windows")]
    {
        run_elevated_powershell_script(launcher.clone()).await?;
        let state = app.state::<DesktopProjectRegistryState>();
        let refreshed = run_project_knowledge(&app, state.inner(), json!({ "method": "protection" }))?;
        if refreshed.get("state").and_then(Value::as_str) == Some("guardian-bootstrap-required") {
            return Err("Protected Guardian setup finished without establishing Guardian readiness.".to_owned());
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        return Err("Desktop protected Guardian setup launcher is currently implemented for Windows only.".to_owned());
    }

    let current = active_project_scope(&app, registry.inner())?;
    if current.generation != scope.generation || current.desktop_project_id != scope.desktop_project_id {
        return Err("Active Desktop project changed while protected Guardian setup was launched; stale result rejected.".to_owned());
    }

    Ok(ProjectKnowledgeProtectionLaunchResult {
        state: "completed",
        detail: "A protected Stage-B setup window was opened from the fixed OS-protected Livariant bootstrap source. Complete the UAC and exact bootstrap confirmation there, then re-check protection readiness.".to_owned(),
        boundaries: json!({
            "rendererSuppliesExecutable": false,
            "rendererSuppliesPath": false,
            "fixedProtectedLauncher": true,
            "uacRequired": true,
            "bootstrapGrantsMutationAuthority": false,
            "projectFilesChanged": false
        }),
    })
}


#[tauri::command]
pub async fn accept_project_knowledge_integrity(
    app: tauri::AppHandle,
    registry: State<'_, DesktopProjectRegistryState>,
    confirmed_digest: String,
    language: Option<String>,
) -> Result<Value, String> {
    let scope = active_project_scope(&app, registry.inner())?;
    let expected_generation = scope.generation;
    let expected_project = scope.desktop_project_id.clone();
    let app_for_worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let state = app_for_worker.state::<DesktopProjectRegistryState>();
        run_project_knowledge(&app_for_worker, state.inner(), json!({
            "method": "accept-integrity",
            "confirmedDigest": confirmed_digest,
            "language": language,
        }))
    }).await.map_err(|error| format!("Project Knowledge integrity worker failed: {error}"))??;
    let current = active_project_scope(&app, registry.inner())?;
    if current.generation != expected_generation || current.desktop_project_id != expected_project {
        return Err("Active Desktop project changed while protected Project Brain integrity was being accepted; stale result rejected.".to_owned());
    }
    Ok(result)
}
