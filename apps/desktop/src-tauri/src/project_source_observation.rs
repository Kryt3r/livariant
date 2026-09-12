use serde::{Deserialize, Serialize};
use std::{fs, path::Path, process::Command};
use tauri::Manager;

const REFRESH_INPUT_FILE: &str = "project-source-review-input.json";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    authority_issued: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSourceObservationResult {
    state: &'static str,
    detail: String,
    boundaries: serde_json::Value,
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

fn observe_project_sources_blocking(app: tauri::AppHandle) -> Result<ProjectSourceObservationResult, String> {
    let app_data = app.path().app_data_dir().map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?;
    let input = app_data.join(REFRESH_INPUT_FILE);
    if !input.is_file() {
        return Err("Project Source & Review configuration is not available for observation yet.".to_owned());
    }

    let executable = std::env::current_exe().map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable.parent().ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?;
    let node = bundled_node_path(install_root);
    let script = install_root.join("runtime").join("core").join("dist").join("src").join("project").join("desktop-project-source-observation.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !script.is_file() || !manifest_path.is_file() {
        return Err("Bundled Project Source observation runtime is not present in this Desktop build.".to_owned());
    }

    let manifest: RuntimeManifest = serde_json::from_slice(
        &fs::read(&manifest_path).map_err(|error| format!("Bundled runtime manifest could not be read: {error}"))?,
    ).map_err(|error| format!("Bundled runtime manifest is invalid: {error}"))?;
    if manifest.authority_issued {
        return Err("Ordinary bundled runtime material must never claim Authority.".to_owned());
    }

    let process = hidden_command(&node)
        .arg(&script)
        .current_dir(install_root)
        .env("LIVARIANT_PROJECT_SOURCE_REVIEW_INPUT", &input)
        .output()
        .map_err(|error| format!("Project Source observation runtime could not be started: {error}"))?;
    if !process.status.success() {
        let stderr = String::from_utf8_lossy(&process.stderr).trim().to_owned();
        return Err(if stderr.is_empty() {
            "Project Source observation failed closed.".to_owned()
        } else {
            format!("Project Source observation failed closed: {stderr}")
        });
    }

    Ok(ProjectSourceObservationResult {
        state: "observed",
        detail: "Configured local repository bindings were observed through fixed bundled runtime. Observation remains Evidence, not Project Truth or Authority.".to_owned(),
        boundaries: serde_json::json!({
            "inputPathIsFixed": true,
            "rendererSuppliesCommand": false,
            "observationIsProjectTruth": false,
            "observationGrantsAuthority": false,
            "changesProjectOwnedFiles": false,
            "performsSemanticApply": false
        }),
    })
}

#[tauri::command]
pub async fn observe_project_sources(app: tauri::AppHandle) -> Result<ProjectSourceObservationResult, String> {
    tauri::async_runtime::spawn_blocking(move || observe_project_sources_blocking(app))
        .await
        .map_err(|error| format!("Project Source observation worker failed: {error}"))?
}
