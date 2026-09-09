use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    fs,
    path::{Component, Path},
    process::Command,
};
use tauri::Manager;

const PRESENTATION_FILE: &str = "project-source-review-presentation.json";
const REFRESH_INPUT_FILE: &str = "project-source-review-input.json";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    authority_issued: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RepositoryIdentityInput {
    provider: String,
    repository_id: String,
    display_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    remote_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrimaryRepositoryInput {
    identity: RepositoryIdentityInput,
    local_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdditionalRepositoryInput {
    identity: RepositoryIdentityInput,
    description: String,
    local_path: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReviewDecisionInput {
    evidence_id: String,
    material_digest: String,
    decision: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSourceReviewConfigurationInput {
    schema_version: u32,
    project_id: String,
    primary: PrimaryRepositoryInput,
    #[serde(default)]
    additional: Vec<AdditionalRepositoryInput>,
    #[serde(default)]
    selected_review_paths: Vec<String>,
    #[serde(default)]
    decisions: Vec<ReviewDecisionInput>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSourceReviewConfigurationResult {
    state: &'static str,
    detail: String,
    boundaries: Value,
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

fn required(value: &str, field: &str) -> Result<String, String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(format!("{field} must not be empty."));
    }
    Ok(normalized.to_owned())
}

fn normalize_identity(identity: &RepositoryIdentityInput, field: &str) -> Result<Value, String> {
    if identity.provider != "github" && identity.provider != "git" {
        return Err(format!("{field}.provider must be github or git."));
    }
    let repository_id = required(&identity.repository_id, &format!("{field}.repositoryId"))?;
    let display_name = required(&identity.display_name, &format!("{field}.displayName"))?;
    let remote_url = identity.remote_url.as_deref().map(str::trim).filter(|value| !value.is_empty());
    Ok(json!({
        "provider": identity.provider,
        "repositoryId": repository_id,
        "displayName": display_name,
        "remoteUrl": remote_url,
    }))
}

fn identity_key(identity: &RepositoryIdentityInput) -> Result<String, String> {
    Ok(format!(
        "{}:{}",
        identity.provider,
        required(&identity.repository_id, "repositoryId")?.to_ascii_lowercase()
    ))
}

fn normalize_review_path(value: &str, index: usize) -> Result<String, String> {
    let normalized = required(value, &format!("selectedReviewPaths[{index}]"))?;
    let path = Path::new(&normalized);
    if path.is_absolute()
        || path.components().any(|component| matches!(component, Component::ParentDir | Component::RootDir | Component::Prefix(_)))
    {
        return Err(format!("selectedReviewPaths[{index}] must be a bounded repository-relative path."));
    }
    Ok(normalized.replace('\\', "/"))
}

fn configuration_value(input: &ProjectSourceReviewConfigurationInput) -> Result<Value, String> {
    if input.schema_version != 1 {
        return Err("Project Source & Review configuration schemaVersion must be 1.".to_owned());
    }
    let project_id = required(&input.project_id, "projectId")?;
    let primary_identity = normalize_identity(&input.primary.identity, "primary.identity")?;
    let primary_local_path = required(&input.primary.local_path, "primary.localPath")?;

    let mut identities = HashSet::new();
    identities.insert(identity_key(&input.primary.identity)?);
    let mut additional = Vec::with_capacity(input.additional.len());
    for (index, repository) in input.additional.iter().enumerate() {
        let key = identity_key(&repository.identity)?;
        if !identities.insert(key) {
            return Err(format!("additional[{index}] duplicates an already configured repository identity."));
        }
        let identity = normalize_identity(&repository.identity, &format!("additional[{index}].identity"))?;
        let description = required(&repository.description, &format!("additional[{index}].description"))?;
        let local_path = repository.local_path.as_deref().map(str::trim).filter(|value| !value.is_empty());
        additional.push(json!({
            "identity": identity,
            "description": description,
            "localPath": local_path,
        }));
    }

    let mut selected_paths = Vec::with_capacity(input.selected_review_paths.len());
    let mut selected_path_keys = HashSet::new();
    for (index, path) in input.selected_review_paths.iter().enumerate() {
        let normalized = normalize_review_path(path, index)?;
        if !selected_path_keys.insert(normalized.to_ascii_lowercase()) {
            return Err(format!("selectedReviewPaths[{index}] duplicates an already selected path."));
        }
        selected_paths.push(normalized);
    }

    if !input.decisions.is_empty() && selected_paths.is_empty() {
        return Err("Review decisions require at least one selected review path.".to_owned());
    }
    let decisions = input.decisions.iter().enumerate().map(|(index, decision)| {
        if !matches!(decision.decision.as_str(), "accept-as-candidate" | "reject" | "defer") {
            return Err(format!("decisions[{index}].decision is invalid."));
        }
        Ok(json!({
            "evidenceId": required(&decision.evidence_id, &format!("decisions[{index}].evidenceId"))?,
            "materialDigest": required(&decision.material_digest, &format!("decisions[{index}].materialDigest"))?,
            "decision": decision.decision,
        }))
    }).collect::<Result<Vec<_>, String>>()?;

    Ok(json!({
        "schemaVersion": 1,
        "projectId": project_id,
        "primary": {
            "identity": primary_identity,
            "localPath": primary_local_path,
        },
        "additional": additional,
        "observations": [],
        "selectedReviewPaths": selected_paths,
        "decisions": decisions,
    }))
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
pub fn configure_project_source_review(
    app: tauri::AppHandle,
    configuration: ProjectSourceReviewConfigurationInput,
) -> Result<ProjectSourceReviewConfigurationResult, String> {
    let value = configuration_value(&configuration)?;
    let app_data = app.path().app_data_dir().map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?;
    fs::create_dir_all(&app_data).map_err(|error| format!("Livariant app-data directory could not be prepared: {error}"))?;
    let target = app_data.join(REFRESH_INPUT_FILE);
    let temp = app_data.join(format!("{REFRESH_INPUT_FILE}.tmp"));
    let serialized = serde_json::to_vec_pretty(&value).map_err(|error| format!("Project Source & Review configuration could not be serialized: {error}"))?;
    fs::write(&temp, serialized).map_err(|error| format!("Project Source & Review configuration temp file could not be written: {error}"))?;
    if target.exists() {
        fs::remove_file(&target).map_err(|error| format!("Previous Project Source & Review configuration could not be replaced: {error}"))?;
    }
    fs::rename(&temp, &target).map_err(|error| format!("Project Source & Review configuration could not be committed: {error}"))?;

    Ok(ProjectSourceReviewConfigurationResult {
        state: "configured",
        detail: "Bounded Project Source & Review configuration saved to Livariant app-data. Source associations and review selections grant no Truth or Authority.".to_owned(),
        boundaries: json!({
            "outputPathIsFixed": true,
            "configurationGrantsAuthority": false,
            "configurationIsProjectTruth": false,
            "configurationCreatesObservedEvidence": false,
            "changesProjectOwnedFiles": false,
            "performsSemanticApply": false
        }),
    })
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
    use super::{configuration_value, validate_presentation, AdditionalRepositoryInput, PrimaryRepositoryInput, ProjectSourceReviewConfigurationInput, RepositoryIdentityInput, ReviewDecisionInput};
    use serde_json::json;

    fn identity(repository_id: &str) -> RepositoryIdentityInput {
        RepositoryIdentityInput {
            provider: "github".to_owned(),
            repository_id: repository_id.to_owned(),
            display_name: repository_id.to_owned(),
            remote_url: None,
        }
    }

    fn configuration() -> ProjectSourceReviewConfigurationInput {
        ProjectSourceReviewConfigurationInput {
            schema_version: 1,
            project_id: "livariant".to_owned(),
            primary: PrimaryRepositoryInput {
                identity: identity("Kryt3r/livariant"),
                local_path: "C:/projects/livariant".to_owned(),
            },
            additional: vec![AdditionalRepositoryInput {
                identity: identity("Kryt3r/livariant-internal"),
                description: "Internal governance and development control plane.".to_owned(),
                local_path: None,
            }],
            selected_review_paths: vec!["README.md".to_owned(), "SECURITY.md".to_owned()],
            decisions: Vec::new(),
        }
    }

    #[test]
    fn configuration_writer_shape_keeps_observations_unminted() {
        let value = configuration_value(&configuration()).expect("configuration accepted");
        assert_eq!(value["projectId"], "livariant");
        assert_eq!(value["observations"], json!([]));
        assert_eq!(value["additional"][0]["description"], "Internal governance and development control plane.");
    }

    #[test]
    fn configuration_rejects_duplicate_repository_identity() {
        let mut value = configuration();
        value.additional[0].identity = identity("kryt3r/LIVARIANT");
        assert!(configuration_value(&value).is_err());
    }

    #[test]
    fn configuration_rejects_unbounded_review_paths_and_unbound_decisions() {
        let mut value = configuration();
        value.selected_review_paths = vec!["../outside.md".to_owned()];
        assert!(configuration_value(&value).is_err());

        let mut value = configuration();
        value.selected_review_paths.clear();
        value.decisions.push(ReviewDecisionInput {
            evidence_id: "evidence".to_owned(),
            material_digest: "digest".to_owned(),
            decision: "reject".to_owned(),
        });
        assert!(configuration_value(&value).is_err());
    }

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
