use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    fs,
    path::{Component, Path, PathBuf},
    process::Command,
};
use tauri::Manager;

const REFRESH_INPUT_FILE: &str = "project-source-review-input.json";
const REVIEW_INVENTORY_SCRIPT: &str = "desktop-project-review-path-inventory.js";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    authority_issued: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewStartInput {
    selected_review_paths: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewStartResult {
    state: &'static str,
    selected_count: usize,
    detail: String,
    boundaries: Value,
}

fn bundled_node_path(install_root: &Path) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        install_root.join("livariant-node.exe")
    }
    #[cfg(not(target_os = "windows"))]
    {
        install_root.join("livariant-node")
    }
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

fn normalize_review_path(value: &str, index: usize) -> Result<String, String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(format!("selectedReviewPaths[{index}] must not be empty."));
    }
    let path = Path::new(normalized);
    if path.is_absolute()
        || path.components().any(|component| {
            matches!(
                component,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err(format!(
            "selectedReviewPaths[{index}] must be a bounded repository-relative path."
        ));
    }
    Ok(normalized.replace('\\', "/"))
}

fn normalize_selection(selected: &[String]) -> Result<Vec<String>, String> {
    if selected.is_empty() {
        return Err("Start review requires at least one explicitly selected review path.".to_owned());
    }

    let mut normalized = Vec::with_capacity(selected.len());
    let mut keys = HashSet::new();
    for (index, path) in selected.iter().enumerate() {
        let path = normalize_review_path(path, index)?;
        if !keys.insert(path.to_ascii_lowercase()) {
            return Err(format!(
                "selectedReviewPaths[{index}] duplicates an already selected path."
            ));
        }
        normalized.push(path);
    }
    Ok(normalized)
}

fn read_configuration(app: &tauri::AppHandle) -> Result<(PathBuf, Vec<u8>, Value), String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?;
    let input = app_data.join(REFRESH_INPUT_FILE);
    if !input.is_file() {
        return Err("Project Source & Review runtime input is not configured yet.".to_owned());
    }
    let bytes = fs::read(&input)
        .map_err(|error| format!("Project Source & Review configuration could not be read: {error}"))?;
    let value: Value = serde_json::from_slice(&bytes)
        .map_err(|error| format!("Project Source & Review configuration is invalid JSON: {error}"))?;
    let object = value
        .as_object()
        .ok_or_else(|| "Project Source & Review configuration must be a JSON object.".to_owned())?;
    if object.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
        return Err("Project Source & Review configuration schemaVersion must be 1.".to_owned());
    }
    if object
        .get("projectId")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .is_none()
    {
        return Err("Project Source & Review configuration requires a non-empty projectId.".to_owned());
    }
    Ok((input, bytes, value))
}

fn validate_inventory(value: &Value) -> Result<HashSet<String>, String> {
    let object = value
        .as_object()
        .ok_or_else(|| "Review-path inventory must be a JSON object.".to_owned())?;
    if object.get("schemaVersion").and_then(Value::as_u64) != Some(1)
        || object.get("state").and_then(Value::as_str) != Some("ready")
    {
        return Err("Review-path inventory has an unsupported state or schema.".to_owned());
    }
    let candidates = object
        .get("candidates")
        .and_then(Value::as_array)
        .ok_or_else(|| "Review-path inventory requires a candidates array.".to_owned())?;
    let boundaries = object
        .get("boundaries")
        .and_then(Value::as_object)
        .ok_or_else(|| "Review-path inventory requires explicit boundaries.".to_owned())?;
    if boundaries.get("evidenceIsProjectTruth").and_then(Value::as_bool) != Some(false)
        || boundaries.get("contentsInterpreted").and_then(Value::as_bool) != Some(false)
        || boundaries.get("grantsAuthority").and_then(Value::as_bool) != Some(false)
        || boundaries.get("changesMade").and_then(Value::as_u64) != Some(0)
    {
        return Err("Review-path inventory boundary claims are invalid.".to_owned());
    }

    let mut paths = HashSet::new();
    for (index, candidate) in candidates.iter().enumerate() {
        let candidate = candidate
            .as_object()
            .ok_or_else(|| format!("candidates[{index}] must be an object."))?;
        let raw_path = candidate
            .get("path")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("candidates[{index}].path must be a string."))?;
        let path = normalize_review_path(raw_path, index)?;
        if path != raw_path {
            return Err(format!(
                "candidates[{index}].path is not in canonical repository-relative form."
            ));
        }
        let kind = candidate.get("kind").and_then(Value::as_str).unwrap_or_default();
        if !matches!(
            kind,
            "agent-guidance"
                | "project-rules"
                | "architecture"
                | "decision-record"
                | "documentation"
                | "ci"
                | "tooling"
        ) {
            return Err(format!("candidates[{index}].kind is not reviewable."));
        }
        if candidate
            .get("scope")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .is_none()
        {
            return Err(format!("candidates[{index}].scope must be non-empty."));
        }
        if candidate.get("trust").and_then(Value::as_str) != Some("evidence-only") {
            return Err(format!("candidates[{index}].trust must remain evidence-only."));
        }
        if !paths.insert(path) {
            return Err(format!("candidates[{index}] duplicates an inventory path."));
        }
    }
    Ok(paths)
}

fn run_review_inventory(app: &tauri::AppHandle, input: &Path) -> Result<Value, String> {
    let executable = std::env::current_exe()
        .map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable
        .parent()
        .ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?;
    let node = bundled_node_path(install_root);
    let script = install_root
        .join("runtime")
        .join("core")
        .join("dist")
        .join("src")
        .join("project")
        .join(REVIEW_INVENTORY_SCRIPT);
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !script.is_file() || !manifest_path.is_file() {
        return Err("Bundled review-path inventory runtime is not present in this Desktop build.".to_owned());
    }

    let manifest: RuntimeManifest = fs::read(&manifest_path)
        .map_err(|error| format!("Bundled runtime manifest could not be read: {error}"))
        .and_then(|bytes| {
            serde_json::from_slice(&bytes)
                .map_err(|error| format!("Bundled runtime manifest is invalid: {error}"))
        })?;
    if manifest.authority_issued {
        return Err("Ordinary bundled runtime material must never claim Authority.".to_owned());
    }

    let process = hidden_command(&node)
        .arg(&script)
        .current_dir(install_root)
        .env("LIVARIANT_PROJECT_SOURCE_REVIEW_INPUT", input)
        .output()
        .map_err(|error| format!("Review-path inventory runtime could not be started: {error}"))?;
    if !process.status.success() {
        let stderr = String::from_utf8_lossy(&process.stderr).trim().to_owned();
        return Err(if stderr.is_empty() {
            "Review-path inventory failed closed.".to_owned()
        } else {
            format!("Review-path inventory failed closed: {stderr}")
        });
    }

    let value: Value = serde_json::from_slice(&process.stdout)
        .map_err(|error| format!("Review-path inventory returned invalid JSON: {error}"))?;
    validate_inventory(&value)?;
    Ok(value)
}

fn apply_selection(configuration: &mut Value, selected: &[String]) -> Result<(), String> {
    let object = configuration
        .as_object_mut()
        .ok_or_else(|| "Project Source & Review configuration must remain an object.".to_owned())?;
    object.insert("selectedReviewPaths".to_owned(), json!(selected));
    object.insert("decisions".to_owned(), json!([]));
    Ok(())
}

fn write_configuration(input: &Path, configuration: &Value) -> Result<(), String> {
    let parent = input
        .parent()
        .ok_or_else(|| "Project Source & Review configuration has no parent directory.".to_owned())?;
    let temp = parent.join(format!("{REFRESH_INPUT_FILE}.review-start.tmp"));
    let serialized = serde_json::to_vec_pretty(configuration)
        .map_err(|error| format!("Review selection could not be serialized: {error}"))?;
    fs::write(&temp, serialized)
        .map_err(|error| format!("Review selection temp file could not be written: {error}"))?;
    if input.exists() {
        fs::remove_file(input)
            .map_err(|error| format!("Previous review configuration could not be replaced: {error}"))?;
    }
    fs::rename(&temp, input)
        .map_err(|error| format!("Review selection could not be committed: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn inventory_project_source_review_paths(app: tauri::AppHandle) -> Result<Value, String> {
    let (input, _, _) = read_configuration(&app)?;
    run_review_inventory(&app, &input)
}

#[tauri::command]
pub fn start_project_source_review(
    app: tauri::AppHandle,
    selection: ReviewStartInput,
) -> Result<ReviewStartResult, String> {
    let selected = normalize_selection(&selection.selected_review_paths)?;
    let (input, before, mut configuration) = read_configuration(&app)?;
    let inventory = run_review_inventory(&app, &input)?;
    let candidates = validate_inventory(&inventory)?;

    for path in &selected {
        if !candidates.contains(path) {
            return Err(format!(
                "Selected review path '{path}' is stale, unknown or outside the current bounded review inventory."
            ));
        }
    }

    let after = fs::read(&input)
        .map_err(|error| format!("Project Source & Review configuration could not be re-read: {error}"))?;
    if after != before {
        return Err("Project Source & Review configuration changed while the review selection was being validated; start was rejected.".to_owned());
    }

    apply_selection(&mut configuration, &selected)?;
    write_configuration(&input, &configuration)?;

    Ok(ReviewStartResult {
        state: "started",
        selected_count: selected.len(),
        detail: "Explicit review selection saved to Livariant app-data. The existing canonical review producer must refresh it separately; no Project Truth, Authority or Semantic Apply was granted.".to_owned(),
        boundaries: json!({
            "selectionIsProjectTruth": false,
            "selectionGrantsAuthority": false,
            "changesProjectOwnedFiles": false,
            "performsSemanticApply": false,
            "usesFreshBoundedInventory": true
        }),
    })
}

#[cfg(test)]
mod tests {
    use super::{apply_selection, normalize_selection, validate_inventory};
    use serde_json::json;

    #[test]
    fn selection_rejects_unbounded_empty_and_duplicate_paths() {
        assert!(normalize_selection(&[]).is_err());
        assert!(normalize_selection(&["../outside.md".to_owned()]).is_err());
        assert!(normalize_selection(&["C:/outside.md".to_owned()]).is_err());
        assert!(normalize_selection(&["README.md".to_owned(), "readme.md".to_owned()]).is_err());
    }

    #[test]
    fn inventory_validation_requires_evidence_only_bounded_candidates() {
        let valid = json!({
            "schemaVersion": 1,
            "state": "ready",
            "candidates": [{"path": "README.md", "kind": "documentation", "scope": ".", "trust": "evidence-only"}],
            "boundaries": {"evidenceIsProjectTruth": false, "contentsInterpreted": false, "grantsAuthority": false, "changesMade": 0}
        });
        assert!(validate_inventory(&valid).is_ok());

        let unsafe_path = json!({
            "schemaVersion": 1,
            "state": "ready",
            "candidates": [{"path": "../README.md", "kind": "documentation", "scope": ".", "trust": "evidence-only"}],
            "boundaries": {"evidenceIsProjectTruth": false, "contentsInterpreted": false, "grantsAuthority": false, "changesMade": 0}
        });
        assert!(validate_inventory(&unsafe_path).is_err());

        let authority = json!({
            "schemaVersion": 1,
            "state": "ready",
            "candidates": [],
            "boundaries": {"evidenceIsProjectTruth": false, "contentsInterpreted": false, "grantsAuthority": true, "changesMade": 0}
        });
        assert!(validate_inventory(&authority).is_err());
    }

    #[test]
    fn applying_a_new_selection_resets_material_bound_decisions() {
        let mut configuration = json!({
            "schemaVersion": 1,
            "projectId": "livariant",
            "selectedReviewPaths": ["OLD.md"],
            "decisions": [{"evidenceId": "old", "materialDigest": "digest", "decision": "reject"}]
        });
        apply_selection(&mut configuration, &["README.md".to_owned()]).expect("selection applied");
        assert_eq!(configuration["selectedReviewPaths"], json!(["README.md"]));
        assert_eq!(configuration["decisions"], json!([]));
    }
}
