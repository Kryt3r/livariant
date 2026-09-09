use serde::Serialize;
use serde_json::Value;
use std::fs;
use tauri::Manager;

const PRESENTATION_FILE: &str = "project-source-review-presentation.json";

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

#[tauri::command]
pub fn project_source_review_presentation(app: tauri::AppHandle) -> ProjectSourceReviewBridgeResult {
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
