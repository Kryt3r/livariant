use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, path::{Path, PathBuf}, process::Command};
use tauri::Manager;

use crate::first_run_project_state::{persist_first_run_project_state, PersistFirstRunProjectStateInput, REQUEST_FILE};

const ACTION_FILE: &str = "first-run-lifecycle-action.json";
const MAX_ACTION_BYTES: usize = 64 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    authority_issued: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedRequest {
    schema_version: u32,
    onboarding_state: Value,
    #[serde(default)]
    selected_review_paths: Vec<String>,
    #[serde(default)]
    decisions: Vec<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FirstRunLifecycleResult {
    schema_version: u32,
    status: String,
    onboarding_state: Value,
    source_review_ready: bool,
    boundaries: Value,
}

fn bundled_node_path(install_root: &Path) -> PathBuf {
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

fn parse_runtime_snapshot(value: Value) -> Result<FirstRunLifecycleResult, String> {
    let schema_version = value.get("schemaVersion").and_then(Value::as_u64).ok_or_else(|| "First-run lifecycle runtime omitted schemaVersion.".to_owned())?;
    if schema_version != 1 {
        return Err(format!("Unsupported first-run lifecycle runtime schemaVersion: {schema_version}."));
    }
    let status = value.get("status").and_then(Value::as_str).ok_or_else(|| "First-run lifecycle runtime omitted status.".to_owned())?;
    if !matches!(status, "required" | "in-progress" | "complete") {
        return Err("First-run lifecycle runtime returned an invalid status.".to_owned());
    }
    let onboarding_state = value.get("onboardingState").cloned().filter(Value::is_object)
        .ok_or_else(|| "First-run lifecycle runtime omitted onboardingState.".to_owned())?;
    let source_review_ready = value.get("sourceReviewReady").and_then(Value::as_bool)
        .ok_or_else(|| "First-run lifecycle runtime omitted sourceReviewReady.".to_owned())?;
    let boundaries = value.get("boundaries").cloned().filter(Value::is_object)
        .ok_or_else(|| "First-run lifecycle runtime omitted boundaries.".to_owned())?;
    if boundaries.get("lifecycleGrantsAuthority") != Some(&Value::Bool(false))
        || boundaries.get("lifecycleCreatesObservedEvidence") != Some(&Value::Bool(false))
        || boundaries.get("changesProjectOwnedFiles") != Some(&Value::Bool(false))
        || boundaries.get("performsSemanticApply") != Some(&Value::Bool(false))
    {
        return Err("First-run lifecycle runtime attempted to weaken protected boundaries.".to_owned());
    }
    Ok(FirstRunLifecycleResult {
        schema_version: 1,
        status: status.to_owned(),
        onboarding_state,
        source_review_ready,
        boundaries,
    })
}

fn preserved_review_material(path: &Path) -> Result<(Vec<String>, Vec<Value>), String> {
    if !path.is_file() return Ok((vec![], vec![]));
    let request: PersistedRequest = serde_json::from_slice(
        &fs::read(path).map_err(|error| format!("Persisted first-run state could not be read: {error}"))?,
    ).map_err(|error| format!("Persisted first-run state is invalid: {error}"))?;
    if request.schema_version != 1 || !request.onboarding_state.is_object() {
        return Err("Persisted first-run request shape is invalid.".to_owned());
    }
    Ok((request.selected_review_paths, request.decisions))
}

fn persist_progress_only(
    app_data: &Path,
    onboarding_state: &Value,
    selected_review_paths: Vec<String>,
    decisions: Vec<Value>,
) -> Result<(), String> {
    let request_path = app_data.join(REQUEST_FILE);
    let temp_path = app_data.join(format!("{REQUEST_FILE}.tmp"));
    let wrapper = json!({
        "schemaVersion": 1,
        "onboardingState": onboarding_state,
        "selectedReviewPaths": selected_review_paths,
        "decisions": decisions,
    });
    fs::write(
        &temp_path,
        serde_json::to_vec_pretty(&wrapper).map_err(|error| format!("First-run progress could not be serialized: {error}"))?,
    ).map_err(|error| format!("First-run progress temp file could not be written: {error}"))?;
    if request_path.exists() {
        fs::remove_file(&request_path).map_err(|error| format!("Previous first-run progress could not be replaced: {error}"))?;
    }
    fs::rename(&temp_path, &request_path).map_err(|error| format!("First-run progress could not be committed: {error}"))?;
    Ok(())
}

fn run_lifecycle_runtime(app: &tauri::AppHandle, action: Option<Value>) -> Result<FirstRunLifecycleResult, String> {
    let app_data = app.path().app_data_dir().map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?;
    fs::create_dir_all(&app_data).map_err(|error| format!("Livariant app-data directory could not be prepared: {error}"))?;
    let state_path = app_data.join(REQUEST_FILE);

    let executable = std::env::current_exe().map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable.parent().ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?;
    let node = bundled_node_path(install_root);
    let script = install_root.join("runtime").join("core").join("dist").join("src").join("project").join("desktop-first-run-lifecycle.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !script.is_file() || !manifest_path.is_file() {
        return Err("Bundled first-run lifecycle runtime is not present in this Desktop build.".to_owned());
    }
    let manifest: RuntimeManifest = serde_json::from_slice(
        &fs::read(&manifest_path).map_err(|error| format!("Bundled runtime manifest could not be read: {error}"))?,
    ).map_err(|error| format!("Bundled runtime manifest is invalid: {error}"))?;
    if manifest.authority_issued {
        return Err("Ordinary bundled runtime material must never claim Authority.".to_owned());
    }

    let mut command = hidden_command(&node);
    command
        .arg(&script)
        .current_dir(install_root)
        .env("LIVARIANT_FIRST_RUN_PROJECT_STATE_PATH", &state_path);

    let action_path = if let Some(action_value) = action.as_ref() {
        if !action_value.is_object() {
            return Err("First-run lifecycle action must be a JSON object.".to_owned());
        }
        let action_bytes = serde_json::to_vec(action_value).map_err(|error| format!("First-run lifecycle action could not be serialized: {error}"))?;
        if action_bytes.len() > MAX_ACTION_BYTES {
            return Err("First-run lifecycle action exceeds the bounded size limit.".to_owned());
        }
        let path = app_data.join(ACTION_FILE);
        fs::write(&path, action_bytes).map_err(|error| format!("First-run lifecycle action could not be staged: {error}"))?;
        command.env("LIVARIANT_FIRST_RUN_ACTION_PATH", &path);
        Some(path)
    } else {
        None
    };

    let process = command.output().map_err(|error| format!("First-run lifecycle runtime could not be started: {error}"))?;
    if let Some(path) = action_path.as_ref() {
        let _ = fs::remove_file(path);
    }
    if !process.status.success() {
        let stderr = String::from_utf8_lossy(&process.stderr).trim().to_owned();
        return Err(if stderr.is_empty() {
            "First-run lifecycle runtime failed closed.".to_owned()
        } else {
            format!("First-run lifecycle runtime failed closed: {stderr}")
        });
    }
    let result = parse_runtime_snapshot(
        serde_json::from_slice(&process.stdout).map_err(|error| format!("First-run lifecycle runtime returned invalid JSON: {error}"))?,
    )?;

    if action.is_some() {
        let (selected_review_paths, decisions) = preserved_review_material(&state_path)?;
        if result.source_review_ready {
            persist_first_run_project_state(app.clone(), PersistFirstRunProjectStateInput {
                schema_version: 1,
                onboarding_state: result.onboarding_state.clone(),
                selected_review_paths,
                decisions,
            })?;
        } else {
            persist_progress_only(&app_data, &result.onboarding_state, selected_review_paths, decisions)?;
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn first_run_onboarding_state(app: tauri::AppHandle) -> Result<FirstRunLifecycleResult, String> {
    run_lifecycle_runtime(&app, None)
}

#[tauri::command]
pub fn transition_first_run_onboarding(
    app: tauri::AppHandle,
    action: Value,
) -> Result<FirstRunLifecycleResult, String> {
    run_lifecycle_runtime(&app, Some(action))
}

#[cfg(test)]
mod tests {
    use super::parse_runtime_snapshot;
    use serde_json::json;

    fn snapshot() -> serde_json::Value {
        json!({
            "schemaVersion": 1,
            "status": "in-progress",
            "onboardingState": {"schemaVersion": 1},
            "sourceReviewReady": false,
            "boundaries": {
                "lifecycleUsesCanonicalFirstRunState": true,
                "rendererMutatesCanonicalStateDirectly": false,
                "persistedStateIsProjectTruth": false,
                "lifecycleGrantsAuthority": false,
                "lifecycleCreatesObservedEvidence": false,
                "changesProjectOwnedFiles": false,
                "performsSemanticApply": false
            }
        })
    }

    #[test]
    fn accepts_bounded_non_authoritative_runtime_snapshot() {
        let result = parse_runtime_snapshot(snapshot()).expect("snapshot should be accepted");
        assert_eq!(result.schema_version, 1);
        assert_eq!(result.status, "in-progress");
        assert!(!result.source_review_ready);
    }

    #[test]
    fn rejects_authority_or_semantic_apply_claims() {
        let mut authority = snapshot();
        authority["boundaries"]["lifecycleGrantsAuthority"] = json!(true);
        assert!(parse_runtime_snapshot(authority).is_err());

        let mut apply = snapshot();
        apply["boundaries"]["performsSemanticApply"] = json!(true);
        assert!(parse_runtime_snapshot(apply).is_err());
    }
}
