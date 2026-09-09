use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{fs, path::Path, process::Command};
use tauri::Manager;

const PRESENTATION_FILE: &str = "project-source-review-presentation.json";
const REFRESH_INPUT_FILE: &str = "project-source-review-input.json";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    authority_issued: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSourceReviewBridgeResult {
    state: &'static str,
    presentation: Option<Value>,
    detail: String,
}

fn unavailable(detail: impl Into<String>) -> ProjectSourceReviewBridgeResult {
    ProjectSourceReviewBridgeResult {
        state: "unavailable",
        presentation: None,
        detail: detail.into(),
    }
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

fn validate_presentation(value: &Value) -> Result<(), String> {
    let object = value.as_object().ok_or_else(|| "Presentation snapshot must be a JSON object.".to_owned())?;
    if object.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
        return Err("Presentation snapshot schemaVersion must be 1.".to_owned());
    }
    if object.get("projectId").and_then(Value::as_str).map(str::trim).filter(|value| !value.is_empty()).is_none() {
        return Err("Presentation snapshot requires a non-empty projectId.".to_owned());
    }
    if !object.get("sources").is_some_and(Value::is_array) {
        return Err("Presentation snapshot requires a sources array.".to_owned());
    }
    if !object.get("summary").is_some_and(Value::is_object) {
        return Err("Presentation snapshot requires a summary object.".to_owned());
    }
    Ok(())
}

fn read_presentation(app: &tauri::AppHandle) -> ProjectSourceReviewBridgeResult {
    let app_data = match app.path().app_data_dir() {
        Ok(path) => path,
        Err(error) => return unavailable(format!("Livariant app-data location could not be resolved: {error}")),
    };
    let path = app_data.join(PRESENTATION_FILE);
    if !path.is_file() {
        return unavailable("No canonical Project Source & Review presentation snapshot is available yet.");
    }

    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) => return unavailable(format!("Project Source & Review presentation snapshot could not be read: {error}")),
    };
    let value: Value = match serde_json::from_slice(&bytes) {
        Ok(value) => value,
        Err(error) => return unavailable(format!("Project Source & Review presentation snapshot is invalid JSON: {error}")),
    };
    if let Err(error) = validate_presentation(&value) {
        return unavailable(format!("Project Source & Review presentation snapshot was rejected: {error}"));
    }

    ProjectSourceReviewBridgeResult {
        state: "ready",
        presentation: Some(value),
        detail: "Canonical runtime presentation snapshot loaded read-only. The bridge grants no Truth, Authority or mutation capability.".to_owned(),
    }
}

#[tauri::command]
pub fn project_source_review_presentation(app: tauri::AppHandle) -> ProjectSourceReviewBridgeResult {
    read_presentation(&app)
}

#[tauri::command]
pub fn refresh_project_source_review_presentation(app: tauri::AppHandle) -> ProjectSourceReviewBridgeResult {
    let app_data = match app.path().app_data_dir() {
        Ok(path) => path,
        Err(error) => return unavailable(format!("Livariant app-data location could not be resolved: {error}")),
    };
    if let Err(error) = fs::create_dir_all(&app_data) {
        return unavailable(format!("Livariant app-data directory could not be prepared: {error}"));
    }
    let input = app_data.join(REFRESH_INPUT_FILE);
    let output = app_data.join(PRESENTATION_FILE);
    if !input.is_file() {
        return unavailable("Project Source & Review runtime input is not configured yet; no refresh was attempted.");
    }

    let executable = match std::env::current_exe() {
        Ok(path) => path,
        Err(error) => return unavailable(format!("Desktop executable location could not be resolved: {error}")),
    };
    let Some(install_root) = executable.parent() else {
        return unavailable("Desktop executable has no installation directory.");
    };
    let node = bundled_node_path(install_root);
    let script = install_root.join("runtime").join("core").join("dist").join("src").join("project").join("desktop-project-source-review-refresh.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !script.is_file() || !manifest_path.is_file() {
        return unavailable("Bundled Project Source & Review refresh runtime is not present in this Desktop build.");
    }
    let manifest: RuntimeManifest = match fs::read(&manifest_path)
        .map_err(|error| format!("Bundled runtime manifest could not be read: {error}"))
        .and_then(|bytes| serde_json::from_slice(&bytes).map_err(|error| format!("Bundled runtime manifest is invalid: {error}")))
    {
        Ok(value) => value,
        Err(error) => return unavailable(error),
    };
    if manifest.authority_issued {
        return unavailable("Ordinary bundled runtime material must never claim Authority.");
    }

    let process = match hidden_command(&node)
        .arg(&script)
        .current_dir(install_root)
        .env("LIVARIANT_PROJECT_SOURCE_REVIEW_INPUT", &input)
        .env("LIVARIANT_PROJECT_SOURCE_REVIEW_OUTPUT", &output)
        .output()
    {
        Ok(value) => value,
        Err(error) => return unavailable(format!("Project Source & Review refresh runtime could not be started: {error}")),
    };
    if !process.status.success() {
        let stderr = String::from_utf8_lossy(&process.stderr).trim().to_owned();
        return unavailable(if stderr.is_empty() {
            "Project Source & Review refresh failed closed without replacing the current snapshot.".to_owned()
        } else {
            format!("Project Source & Review refresh failed closed: {stderr}")
        });
    }
    read_presentation(&app)
}

#[cfg(test)]
mod tests {
    use super::validate_presentation;
    use serde_json::json;

    #[test]
    fn validates_minimal_bounded_snapshot_shape() {
        let value = json!({"schemaVersion": 1, "projectId": "livariant", "sources": [], "summary": {}});
        assert!(validate_presentation(&value).is_ok());
    }

    #[test]
    fn rejects_missing_or_wrong_schema() {
        assert!(validate_presentation(&json!({"projectId": "livariant", "sources": [], "summary": {}})).is_err());
        assert!(validate_presentation(&json!({"schemaVersion": 2, "projectId": "livariant", "sources": [], "summary": {}})).is_err());
    }

    #[test]
    fn rejects_unrepresentable_snapshot_shape() {
        assert!(validate_presentation(&json!({"schemaVersion": 1, "projectId": "", "sources": [], "summary": {}})).is_err());
        assert!(validate_presentation(&json!({"schemaVersion": 1, "projectId": "livariant", "sources": {}, "summary": {}})).is_err());
        assert!(validate_presentation(&json!({"schemaVersion": 1, "projectId": "livariant", "sources": [], "summary": []})).is_err());
    }
}
