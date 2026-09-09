use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use tauri::Manager;

use crate::project_source_review_bridge::{configure_project_source_review, ProjectSourceReviewConfigurationInput};

const REQUEST_FILE: &str = "first-run-project-source-review-request.json";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    authority_issued: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistFirstRunProjectStateInput {
    schema_version: u32,
    onboarding_state: Value,
    #[serde(default)]
    selected_review_paths: Vec<String>,
    #[serde(default)]
    decisions: Vec<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistFirstRunProjectStateResult {
    state: &'static str,
    detail: String,
    boundaries: Value,
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

fn request_value(input: PersistFirstRunProjectStateInput) -> Result<Value, String> {
    if input.schema_version != 1 {
        return Err("First-run project state persistence schemaVersion must be 1.".to_owned());
    }
    if !input.onboarding_state.is_object() {
        return Err("First-run project state requires an onboardingState object.".to_owned());
    }
    Ok(json!({
        "schemaVersion": 1,
        "onboardingState": input.onboarding_state,
        "selectedReviewPaths": input.selected_review_paths,
        "decisions": input.decisions,
    }))
}

#[tauri::command]
pub fn persist_first_run_project_state(
    app: tauri::AppHandle,
    input: PersistFirstRunProjectStateInput,
) -> Result<PersistFirstRunProjectStateResult, String> {
    let request = request_value(input)?;
    let app_data = app.path().app_data_dir().map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?;
    fs::create_dir_all(&app_data).map_err(|error| format!("Livariant app-data directory could not be prepared: {error}"))?;
    let request_path = app_data.join(REQUEST_FILE);
    let request_temp = app_data.join(format!("{REQUEST_FILE}.tmp"));
    fs::write(
        &request_temp,
        serde_json::to_vec_pretty(&request).map_err(|error| format!("First-run project state could not be serialized: {error}"))?,
    ).map_err(|error| format!("First-run project state temp file could not be written: {error}"))?;
    if request_path.exists() {
        fs::remove_file(&request_path).map_err(|error| format!("Previous first-run project state could not be replaced: {error}"))?;
    }
    fs::rename(&request_temp, &request_path).map_err(|error| format!("First-run project state could not be committed: {error}"))?;

    let executable = std::env::current_exe().map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable.parent().ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?;
    let node = bundled_node_path(install_root);
    let script = install_root.join("runtime").join("core").join("dist").join("src").join("project").join("desktop-first-run-source-review-projection.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !script.is_file() || !manifest_path.is_file() {
        return Err("Bundled first-run Project Source & Review projection runtime is not present in this Desktop build.".to_owned());
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
        .env("LIVARIANT_FIRST_RUN_SOURCE_REVIEW_REQUEST", &request_path)
        .output()
        .map_err(|error| format!("First-run Project Source & Review projection runtime could not be started: {error}"))?;
    if !process.status.success() {
        let stderr = String::from_utf8_lossy(&process.stderr).trim().to_owned();
        return Err(if stderr.is_empty() {
            "First-run Project Source & Review projection failed closed.".to_owned()
        } else {
            format!("First-run Project Source & Review projection failed closed: {stderr}")
        });
    }

    let configuration: ProjectSourceReviewConfigurationInput = serde_json::from_slice(&process.stdout)
        .map_err(|error| format!("First-run Project Source & Review projection returned invalid configuration JSON: {error}"))?;
    configure_project_source_review(app, configuration)?;

    Ok(PersistFirstRunProjectStateResult {
        state: "persisted",
        detail: "First-run project state was persisted in fixed Livariant app-data and projected through canonical Core into the bounded Project Source & Review configuration.".to_owned(),
        boundaries: json!({
            "requestPathIsFixed": true,
            "projectionUsesBundledCore": true,
            "onboardingStateIsProjectTruth": false,
            "projectionGrantsAuthority": false,
            "projectionCreatesObservedEvidence": false,
            "changesProjectOwnedFiles": false,
            "performsSemanticApply": false
        }),
    })
}

#[cfg(test)]
mod tests {
    use super::{request_value, PersistFirstRunProjectStateInput};
    use serde_json::json;

    #[test]
    fn accepts_bounded_first_run_request_shape() {
        let value = request_value(PersistFirstRunProjectStateInput {
            schema_version: 1,
            onboarding_state: json!({"schemaVersion": 1}),
            selected_review_paths: vec!["README.md".to_owned()],
            decisions: vec![],
        }).expect("request should be accepted");
        assert_eq!(value["schemaVersion"], 1);
        assert!(value["onboardingState"].is_object());
    }

    #[test]
    fn rejects_wrong_schema_or_non_object_state() {
        assert!(request_value(PersistFirstRunProjectStateInput {
            schema_version: 2,
            onboarding_state: json!({}),
            selected_review_paths: vec![],
            decisions: vec![],
        }).is_err());
        assert!(request_value(PersistFirstRunProjectStateInput {
            schema_version: 1,
            onboarding_state: json!(null),
            selected_review_paths: vec![],
            decisions: vec![],
        }).is_err());
    }
}
