#![cfg(feature = "ci-multi-project-acceptance")]

use crate::{
    desktop_project_registry::{
        active_diagnostics_project_id, ci_activate_project, ci_detach_project,
        ci_project_state_root, ci_register_project, with_project_persistence_scope_current,
        DesktopProjectRegistryState, ProjectPersistenceScope,
    },
    project_scoped_persistence::{
        first_run_request_path, replace_staged_file, source_review_input_path,
        source_review_presentation_path, staged_path_for_target,
    },
};
use serde::Serialize;
use serde_json::json;
use std::{
    env, fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AcceptanceOutcome {
    state: &'static str,
    detail: String,
    project_a_desktop_id: Option<String>,
    project_b_desktop_id: Option<String>,
    generations: Vec<u64>,
    stale_a_commit_rejected: bool,
    project_a_restored: bool,
    project_b_isolated: bool,
    diagnostics_binding_restored: bool,
    detach_preserved_project_root: bool,
    detach_preserved_project_brain: bool,
    detach_preserved_project_state: bool,
    project_state_contains_no_global_credentials: bool,
    project_state_contains_no_global_measurement_state: bool,
}

impl AcceptanceOutcome {
    fn error(detail: impl Into<String>) -> Self {
        Self {
            state: "error",
            detail: detail.into(),
            project_a_desktop_id: None,
            project_b_desktop_id: None,
            generations: Vec::new(),
            stale_a_commit_rejected: false,
            project_a_restored: false,
            project_b_isolated: false,
            diagnostics_binding_restored: false,
            detach_preserved_project_root: false,
            detach_preserved_project_brain: false,
            detach_preserved_project_state: false,
            project_state_contains_no_global_credentials: false,
            project_state_contains_no_global_measurement_state: false,
        }
    }
}

fn required_path(name: &str) -> Result<PathBuf, String> {
    let value = env::var_os(name).ok_or_else(|| format!("{name} is required for CI multi-project acceptance."))?;
    let path = PathBuf::from(value);
    let metadata = fs::metadata(&path).map_err(|error| format!("{name} could not be inspected: {error}"))?;
    if !metadata.is_dir() {
        return Err(format!("{name} must point to an existing directory."));
    }
    fs::canonicalize(&path).map_err(|error| format!("{name} could not be canonicalized: {error}"))
}

fn marker_path(root: &Path) -> PathBuf {
    root.join("ci-project-root-marker.txt")
}

fn project_brain_marker(root: &Path) -> PathBuf {
    root.join(".project-brain").join("ci-preserve-marker.txt")
}

fn write_json(path: &Path, value: serde_json::Value) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(&value)
        .map_err(|error| format!("CI acceptance state could not be serialized: {error}"))?;
    fs::write(path, bytes).map_err(|error| format!("CI acceptance state could not be written: {error}"))
}

fn read_ci_project(path: &Path) -> Result<String, String> {
    let value: serde_json::Value = serde_json::from_slice(
        &fs::read(path).map_err(|error| format!("CI acceptance state could not be read: {error}"))?,
    )
    .map_err(|error| format!("CI acceptance state is invalid JSON: {error}"))?;
    value
        .get("ciProject")
        .and_then(serde_json::Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| "CI acceptance state omits ciProject.".to_owned())
}

fn write_scoped_markers(
    app: &AppHandle,
    scope: &ProjectPersistenceScope,
    project: &str,
) -> Result<(), String> {
    let first_run = first_run_request_path(app, scope, true)?;
    let source_input = source_review_input_path(app, scope, true)?;
    let source_presentation = source_review_presentation_path(app, scope, true)?;

    write_json(&first_run, json!({
        "schemaVersion": 1,
        "ciProject": project,
        "kind": "first-run"
    }))?;
    write_json(&source_input, json!({
        "schemaVersion": 1,
        "projectId": format!("ci-project-{}", project.to_ascii_lowercase()),
        "ciProject": project,
        "kind": "source-review-input"
    }))?;
    write_json(&source_presentation, json!({
        "schemaVersion": 1,
        "projectId": format!("ci-project-{}", project.to_ascii_lowercase()),
        "ciProject": project,
        "kind": "source-review-presentation"
    }))?;
    Ok(())
}

fn verify_scoped_markers(
    app: &AppHandle,
    scope: &ProjectPersistenceScope,
    expected: &str,
) -> Result<bool, String> {
    Ok(
        read_ci_project(&first_run_request_path(app, scope, false)?)? == expected
            && read_ci_project(&source_review_input_path(app, scope, false)?)? == expected
            && read_ci_project(&source_review_presentation_path(app, scope, false)?)? == expected,
    )
}

fn tree_contains_name(root: &Path, target: &str) -> Result<bool, String> {
    if !root.exists() {
        return Ok(false);
    }
    for entry in fs::read_dir(root)
        .map_err(|error| format!("CI acceptance state directory could not be enumerated: {error}"))?
    {
        let entry = entry.map_err(|error| format!("CI acceptance state entry could not be inspected: {error}"))?;
        if entry.file_name().to_string_lossy().eq_ignore_ascii_case(target) {
            return Ok(true);
        }
        let metadata = entry
            .metadata()
            .map_err(|error| format!("CI acceptance state entry metadata could not be read: {error}"))?;
        if metadata.is_dir() && tree_contains_name(&entry.path(), target)? {
            return Ok(true);
        }
    }
    Ok(false)
}

fn run_acceptance(app: &AppHandle) -> Result<AcceptanceOutcome, String> {
    let root_a = required_path("LIVARIANT_CI_MULTI_PROJECT_ROOT_A")?;
    let root_b = required_path("LIVARIANT_CI_MULTI_PROJECT_ROOT_B")?;
    if root_a == root_b {
        return Err("CI multi-project acceptance requires two distinct project roots.".to_owned());
    }
    for required in [
        marker_path(&root_a),
        marker_path(&root_b),
        project_brain_marker(&root_a),
        project_brain_marker(&root_b),
    ] {
        if !required.is_file() {
            return Err(format!("CI project preservation marker is missing: {}", required.display()));
        }
    }

    let state = app.state::<DesktopProjectRegistryState>();
    let id_a = ci_register_project(app, state.inner(), &root_a, "CI Project A", "ci-project-a")?;
    let id_b = ci_register_project(app, state.inner(), &root_b, "CI Project B", "ci-project-b")?;
    if id_a == id_b {
        return Err("Distinct CI projects received the same Desktop project identity.".to_owned());
    }

    let active_a = ci_activate_project(app, state.inner(), &id_a)?;
    let scope_a = ProjectPersistenceScope::Active(active_a.clone());
    write_scoped_markers(app, &scope_a, "A")?;
    if active_diagnostics_project_id(app, state.inner())? != "ci-project-a" {
        return Err("Diagnostics did not bind to Project A after activation.".to_owned());
    }

    let a_presentation = source_review_presentation_path(app, &scope_a, true)?;
    let stale_a = staged_path_for_target(&a_presentation, "ci-late-a")?;
    write_json(&stale_a, json!({
        "schemaVersion": 1,
        "ciProject": "STALE-A",
        "kind": "late-source-review-presentation"
    }))?;

    let active_b = ci_activate_project(app, state.inner(), &id_b)?;
    let scope_b = ProjectPersistenceScope::Active(active_b.clone());
    let stale_error = with_project_persistence_scope_current(app, state.inner(), &scope_a, || {
        replace_staged_file(&stale_a, &a_presentation)
    })
    .expect_err("stale Project A commit must be rejected after Project B activation");
    let stale_a_commit_rejected = stale_error.contains("stale") || stale_error.contains("active Desktop project changed");
    let _ = fs::remove_file(&stale_a);

    write_scoped_markers(app, &scope_b, "B")?;
    let project_b_isolated = verify_scoped_markers(app, &scope_b, "B")?
        && verify_scoped_markers(app, &scope_a, "A")?;
    if active_diagnostics_project_id(app, state.inner())? != "ci-project-b" {
        return Err("Diagnostics did not bind to Project B after activation.".to_owned());
    }

    let active_a_again = ci_activate_project(app, state.inner(), &id_a)?;
    let scope_a_again = ProjectPersistenceScope::Active(active_a_again.clone());
    let project_a_restored = verify_scoped_markers(app, &scope_a_again, "A")?;
    let diagnostics_binding_restored =
        active_diagnostics_project_id(app, state.inner())? == "ci-project-a";

    let state_root_a = ci_project_state_root(app, &id_a)?;
    let state_root_b = ci_project_state_root(app, &id_b)?;
    ci_detach_project(app, state.inner(), &id_b)?;

    let detach_preserved_project_root =
        marker_path(&root_b).is_file() && marker_path(&root_a).is_file();
    let detach_preserved_project_brain =
        project_brain_marker(&root_b).is_file() && project_brain_marker(&root_a).is_file();
    let detach_preserved_project_state =
        state_root_b.is_dir() && state_root_a.is_dir();

    let no_global_credentials =
        !tree_contains_name(&state_root_a, "github-user-access-token.dpapi")?
            && !tree_contains_name(&state_root_b, "github-user-access-token.dpapi")?;
    let no_global_measurement =
        !tree_contains_name(&state_root_a, "measurement-state.json")?
            && !tree_contains_name(&state_root_b, "measurement-state.json")?;

    let accepted = stale_a_commit_rejected
        && project_a_restored
        && project_b_isolated
        && diagnostics_binding_restored
        && detach_preserved_project_root
        && detach_preserved_project_brain
        && detach_preserved_project_state
        && no_global_credentials
        && no_global_measurement;

    Ok(AcceptanceOutcome {
        state: if accepted { "accepted" } else { "rejected" },
        detail: if accepted {
            "Installed Desktop A→B→A multi-project acceptance passed without cross-project persistence leakage or destructive detach behavior.".to_owned()
        } else {
            "Installed Desktop multi-project acceptance completed but one or more isolation checks failed.".to_owned()
        },
        project_a_desktop_id: Some(id_a),
        project_b_desktop_id: Some(id_b),
        generations: vec![active_a.generation, active_b.generation, active_a_again.generation],
        stale_a_commit_rejected,
        project_a_restored,
        project_b_isolated,
        diagnostics_binding_restored,
        detach_preserved_project_root,
        detach_preserved_project_brain,
        detach_preserved_project_state,
        project_state_contains_no_global_credentials: no_global_credentials,
        project_state_contains_no_global_measurement_state: no_global_measurement,
    })
}

fn write_result(outcome: &AcceptanceOutcome) {
    let Ok(path) = env::var("LIVARIANT_CI_MULTI_PROJECT_RESULT_PATH") else {
        return;
    };
    let Ok(bytes) = serde_json::to_vec_pretty(outcome) else {
        return;
    };
    let _ = fs::write(path, bytes);
}

pub(crate) fn start_if_requested(app: AppHandle) {
    if env::var("LIVARIANT_CI_MULTI_PROJECT_ACCEPTANCE").ok().as_deref() != Some("1") {
        return;
    }
    tauri::async_runtime::spawn(async move {
        let outcome = match run_acceptance(&app) {
            Ok(outcome) => outcome,
            Err(error) => AcceptanceOutcome::error(error),
        };
        let accepted = outcome.state == "accepted";
        write_result(&outcome);
        app.exit(if accepted { 0 } else { 2 });
    });
}
