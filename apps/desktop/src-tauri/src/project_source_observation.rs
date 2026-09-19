use crate::{
    desktop_project_registry::{
        project_persistence_scope, with_project_persistence_scope_current,
        DesktopProjectRegistryState,
    },
    project_scoped_persistence::{
        replace_staged_file, source_review_input_path, staged_path_for_target,
    },
    project_source_review_bridge::{configuration_value, ProjectSourceReviewConfigurationInput},
};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path, process::Command};
use tauri::Manager;

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
    let registry_state = app.state::<DesktopProjectRegistryState>();
    let scope = project_persistence_scope(&app, registry_state.inner())?;
    let input = source_review_input_path(&app, &scope, false)?;
    if !input.is_file() {
        return Err("Project Source & Review configuration is not available for observation yet.".to_owned());
    }
    let staged = staged_path_for_target(&input, "source-observation")?;
    fs::copy(&input, &staged)
        .map_err(|error| format!("Project Source observation input could not be staged: {error}"))?;

    let executable = match std::env::current_exe() {
        Ok(path) => path,
        Err(error) => {
            let _ = fs::remove_file(&staged);
            return Err(format!("Desktop executable location could not be resolved: {error}"));
        }
    };
    let install_root = match executable.parent() {
        Some(path) => path,
        None => {
            let _ = fs::remove_file(&staged);
            return Err("Desktop executable has no installation directory.".to_owned());
        }
    };
    let node = bundled_node_path(install_root);
    let script = install_root.join("runtime").join("core").join("dist").join("src").join("project").join("desktop-project-source-observation.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !script.is_file() || !manifest_path.is_file() {
        let _ = fs::remove_file(&staged);
        return Err("Bundled Project Source observation runtime is not present in this Desktop build.".to_owned());
    }

    let manifest_bytes = match fs::read(&manifest_path) {
        Ok(bytes) => bytes,
        Err(error) => {
            let _ = fs::remove_file(&staged);
            return Err(format!("Bundled runtime manifest could not be read: {error}"));
        }
    };
    let manifest: RuntimeManifest = match serde_json::from_slice(&manifest_bytes) {
        Ok(manifest) => manifest,
        Err(error) => {
            let _ = fs::remove_file(&staged);
            return Err(format!("Bundled runtime manifest is invalid: {error}"));
        }
    };
    if manifest.authority_issued {
        let _ = fs::remove_file(&staged);
        return Err("Ordinary bundled runtime material must never claim Authority.".to_owned());
    }

    let process = match hidden_command(&node)
        .arg(&script)
        .current_dir(install_root)
        .env("LIVARIANT_PROJECT_SOURCE_REVIEW_INPUT", &staged)
        .output()
    {
        Ok(process) => process,
        Err(error) => {
            let _ = fs::remove_file(&staged);
            return Err(format!("Project Source observation runtime could not be started: {error}"));
        }
    };
    if !process.status.success() {
        let _ = fs::remove_file(&staged);
        let stderr = String::from_utf8_lossy(&process.stderr).trim().to_owned();
        return Err(if stderr.is_empty() {
            "Project Source observation failed closed.".to_owned()
        } else {
            format!("Project Source observation failed closed: {stderr}")
        });
    }

    let staged_bytes = match fs::read(&staged) {
        Ok(bytes) => bytes,
        Err(error) => {
            let _ = fs::remove_file(&staged);
            return Err(format!("Observed Project Source configuration could not be read: {error}"));
        }
    };
    let staged_configuration: ProjectSourceReviewConfigurationInput = match serde_json::from_slice(&staged_bytes) {
        Ok(configuration) => configuration,
        Err(error) => {
            let _ = fs::remove_file(&staged);
            return Err(format!("Observed Project Source configuration is invalid: {error}"));
        }
    };
    if let Err(error) = configuration_value(&staged_configuration) {
        let _ = fs::remove_file(&staged);
        return Err(error);
    }

    if let Err(error) = with_project_persistence_scope_current(&app, registry_state.inner(), &scope, || {
        replace_staged_file(&staged, &input)
    }) {
        let _ = fs::remove_file(&staged);
        return Err(error);
    }

    crate::desktop_project_registry::ensure_project_persistence_scope_current(
        &app,
        registry_state.inner(),
        &scope,
    )?;

    Ok(ProjectSourceObservationResult {
        state: "observed",
        detail: if scope.is_project_namespaced() {
            "Configured local repository bindings were observed through fixed bundled runtime and committed only to the active Desktop project's app-data namespace. Observation remains Evidence, not Project Truth or Authority.".to_owned()
        } else {
            "Configured local repository bindings were observed through fixed bundled runtime in the legacy single-project slot pending migration. Observation remains Evidence, not Project Truth or Authority.".to_owned()
        },
        boundaries: serde_json::json!({
            "inputPathIsProjectScoped": scope.is_project_namespaced(),
            "legacySingleProjectCompatibility": !scope.is_project_namespaced(),
            "staleActivationCommitRejected": true,
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
