use crate::{
    desktop_project_registry::{
        ensure_project_persistence_scope_current, project_persistence_scope,
        with_project_persistence_scope_current, DesktopProjectRegistryState,
        ProjectPersistenceScope,
    },
    project_scoped_persistence::{
        first_run_request_path, replace_staged_file, staged_path_for_target,
    },
    project_source_review_bridge::{
        configure_project_source_review_for_scope, ProjectSourceReviewConfigurationInput,
    },
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use tauri::Manager;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    authority_issued: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersistFirstRunProjectStateInput {
    pub(crate) schema_version: u32,
    pub(crate) onboarding_state: Value,
    #[serde(default)]
    pub(crate) selected_review_paths: Vec<String>,
    #[serde(default)]
    pub(crate) decisions: Vec<Value>,
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

pub(crate) fn persist_first_run_project_state_for_scope(
    app: &tauri::AppHandle,
    scope: &ProjectPersistenceScope,
    input: PersistFirstRunProjectStateInput,
) -> Result<PersistFirstRunProjectStateResult, String> {
    let request = request_value(input)?;
    let request_path = first_run_request_path(app, scope, true)?;
    let staged_request = staged_path_for_target(&request_path, "first-run-request")?;
    fs::write(
        &staged_request,
        serde_json::to_vec_pretty(&request)
            .map_err(|error| format!("First-run project state could not be serialized: {error}"))?,
    )
    .map_err(|error| format!("First-run project state temp file could not be written: {error}"))?;

    let executable = std::env::current_exe().map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable.parent().ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?;
    let node = bundled_node_path(install_root);
    let script = install_root.join("runtime").join("core").join("dist").join("src").join("project").join("desktop-first-run-source-review-projection.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !script.is_file() || !manifest_path.is_file() {
        let _ = fs::remove_file(&staged_request);
        return Err("Bundled first-run Project Source & Review projection runtime is not present in this Desktop build.".to_owned());
    }
    let manifest: RuntimeManifest = serde_json::from_slice(
        &fs::read(&manifest_path).map_err(|error| format!("Bundled runtime manifest could not be read: {error}"))?,
    ).map_err(|error| format!("Bundled runtime manifest is invalid: {error}"))?;
    if manifest.authority_issued {
        let _ = fs::remove_file(&staged_request);
        return Err("Ordinary bundled runtime material must never claim Authority.".to_owned());
    }

    let process = hidden_command(&node)
        .arg(&script)
        .current_dir(install_root)
        .env("LIVARIANT_FIRST_RUN_SOURCE_REVIEW_REQUEST", &staged_request)
        .output()
        .map_err(|error| format!("First-run Project Source & Review projection runtime could not be started: {error}"))?;
    if !process.status.success() {
        let _ = fs::remove_file(&staged_request);
        let stderr = String::from_utf8_lossy(&process.stderr).trim().to_owned();
        return Err(if stderr.is_empty() {
            "First-run Project Source & Review projection failed closed.".to_owned()
        } else {
            format!("First-run Project Source & Review projection failed closed: {stderr}")
        });
    }

    let configuration: ProjectSourceReviewConfigurationInput = serde_json::from_slice(&process.stdout)
        .map_err(|error| format!("First-run Project Source & Review projection returned invalid configuration JSON: {error}"))?;
    configure_project_source_review_for_scope(app, scope, configuration)?;

    let registry_state = app.state::<DesktopProjectRegistryState>();
    if let Err(error) = with_project_persistence_scope_current(app, registry_state.inner(), scope, || {
        replace_staged_file(&staged_request, &request_path)
    }) {
        let _ = fs::remove_file(&staged_request);
        return Err(error);
    }
    ensure_project_persistence_scope_current(app, registry_state.inner(), scope)?;

    Ok(PersistFirstRunProjectStateResult {
        state: "persisted",
        detail: if scope.is_project_namespaced() {
            "First-run project state was persisted in the active Desktop project's Livariant app-data namespace and projected through canonical Core into the bounded Project Source & Review configuration.".to_owned()
        } else {
            "First-run project state was persisted in the legacy single-project app-data slot pending migration and projected through canonical Core into the bounded Project Source & Review configuration.".to_owned()
        },
        boundaries: json!({
            "requestPathIsProjectScoped": scope.is_project_namespaced(),
            "legacySingleProjectCompatibility": !scope.is_project_namespaced(),
            "staleActivationCommitRejected": true,
            "projectionUsesBundledCore": true,
            "onboardingStateIsProjectTruth": false,
            "projectionGrantsAuthority": false,
            "projectionCreatesObservedEvidence": false,
            "changesProjectOwnedFiles": false,
            "performsSemanticApply": false
        }),
    })
}

#[tauri::command]
pub fn persist_first_run_project_state(
    app: tauri::AppHandle,
    input: PersistFirstRunProjectStateInput,
) -> Result<PersistFirstRunProjectStateResult, String> {
    let registry_state = app.state::<DesktopProjectRegistryState>();
    let scope = project_persistence_scope(&app, registry_state.inner())?;
    persist_first_run_project_state_for_scope(&app, &scope, input)
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
