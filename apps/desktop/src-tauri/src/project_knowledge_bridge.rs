use crate::desktop_project_registry::{
    active_project_scope, DesktopProjectRegistryState,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{io::Write, path::Path, process::{Command, Stdio}};
use tauri::{Manager, State};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
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

fn run_project_knowledge(
    app: &tauri::AppHandle,
    registry: &DesktopProjectRegistryState,
    request: Value,
) -> Result<Value, String> {
    let scope = active_project_scope(app, registry)?;
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
        .env("LIVARIANT_PROJECT_ROOT", &scope.local_root)
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
    let current = active_project_scope(app, registry)?;
    if current.generation != scope.generation || current.desktop_project_id != scope.desktop_project_id {
        return Err("Active Desktop project changed while Project Knowledge was loading; stale result rejected.".to_owned());
    }
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if stderr.is_empty() { "Project Knowledge request failed closed.".to_owned() } else { stderr });
    }
    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Project Knowledge runtime returned invalid JSON: {error}"))
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
        }))
    }).await.map_err(|error| format!("Project Knowledge apply worker failed: {error}"))??;
    let current = active_project_scope(&app, registry.inner())?;
    if current.generation != expected_generation || current.desktop_project_id != expected_project {
        return Err("Active Desktop project changed while Project Knowledge was being applied. The operation remained bound to the original project; stale renderer result rejected.".to_owned());
    }
    Ok(result)
}
