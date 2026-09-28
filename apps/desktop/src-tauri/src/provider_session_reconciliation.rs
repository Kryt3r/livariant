use crate::desktop_project_registry::registered_provider_projects;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
use tauri::{Manager, State};

const MANUAL_DECISIONS_FILE: &str = "manual-session-decisions.json";
const MANUAL_DECISIONS_MAX_BYTES: u64 = 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManualSessionDecision {
    provider: String,
    provider_item_id: String,
    decision: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    desktop_project_id: Option<String>,
    updated_at_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManualSessionDecisionStore {
    schema_version: u32,
    decisions: Vec<ManualSessionDecision>,
}

fn validate_provider(value: &str) -> Result<String, String> {
    let value = value.trim();
    if !matches!(value, "codex" | "claude" | "gemini" | "custom") {
        return Err("Provider session decision provider is unsupported.".to_owned());
    }
    Ok(value.to_owned())
}

fn validate_provider_item_id(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() || value.chars().count() > 240 || value.chars().any(|ch| ch == '\0' || ch.is_control()) {
        return Err("Provider session decision item id is invalid.".to_owned());
    }
    Ok(value.to_owned())
}

fn read_manual_decisions(app: &tauri::AppHandle) -> Result<ManualSessionDecisionStore, String> {
    let path = evidence_path(app, MANUAL_DECISIONS_FILE)?;
    let metadata = match fs::symlink_metadata(&path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(ManualSessionDecisionStore { schema_version: 1, decisions: Vec::new() });
        }
        Err(error) => return Err(format!("Manual provider session decisions could not be inspected: {error}")),
    };
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("Manual provider session decisions must be a real non-symbolic-link file.".to_owned());
    }
    if metadata.len() > MANUAL_DECISIONS_MAX_BYTES {
        return Err("Manual provider session decisions exceed the safety bound.".to_owned());
    }
    let store: ManualSessionDecisionStore = serde_json::from_slice(
        &fs::read(&path).map_err(|error| format!("Manual provider session decisions could not be read: {error}"))?
    ).map_err(|error| format!("Manual provider session decisions are invalid JSON: {error}"))?;
    if store.schema_version != 1 || store.decisions.len() > 10_000 {
        return Err("Manual provider session decisions schema or count is unsupported.".to_owned());
    }
    for item in &store.decisions {
        validate_provider(&item.provider)?;
        validate_provider_item_id(&item.provider_item_id)?;
        if !matches!(item.decision.as_str(), "assigned" | "unassigned") {
            return Err("Manual provider session decision is invalid.".to_owned());
        }
        if item.decision == "assigned" && item.desktop_project_id.as_deref().map(str::trim).filter(|value| !value.is_empty()).is_none() {
            return Err("Assigned manual provider session decision requires a Desktop project id.".to_owned());
        }
        if item.decision == "unassigned" && item.desktop_project_id.is_some() {
            return Err("Unassigned manual provider session decision must not carry a Desktop project id.".to_owned());
        }
    }
    Ok(store)
}

fn write_manual_decisions(app: &tauri::AppHandle, store: &ManualSessionDecisionStore) -> Result<(), String> {
    let target = evidence_path(app, MANUAL_DECISIONS_FILE)?;
    let parent = target.parent().ok_or_else(|| "Manual provider session decision path has no parent.".to_owned())?;
    let temporary = parent.join(format!(".manual-session-decisions-{}.tmp", std::process::id()));
    let bytes = serde_json::to_vec_pretty(store)
        .map_err(|error| format!("Manual provider session decisions could not be serialized: {error}"))?;
    if bytes.len() > MANUAL_DECISIONS_MAX_BYTES as usize {
        return Err("Manual provider session decisions exceed the safety bound.".to_owned());
    }
    fs::write(&temporary, bytes)
        .map_err(|error| format!("Manual provider session decision temp file could not be written: {error}"))?;
    if target.exists() {
        fs::remove_file(&target)
            .map_err(|error| format!("Previous manual provider session decisions could not be replaced: {error}"))?;
    }
    fs::rename(&temporary, &target)
        .map_err(|error| format!("Manual provider session decisions could not be committed: {error}"))
}

fn upsert_manual_decision(
    app: &tauri::AppHandle,
    provider: &str,
    provider_item_id: &str,
    decision: &str,
    desktop_project_id: Option<String>,
) -> Result<Value, String> {
    let provider = validate_provider(provider)?;
    let provider_item_id = validate_provider_item_id(provider_item_id)?;
    let mut store = read_manual_decisions(app)?;
    store.decisions.retain(|item| !(item.provider == provider && item.provider_item_id == provider_item_id));
    store.decisions.push(ManualSessionDecision {
        provider,
        provider_item_id,
        decision: decision.to_owned(),
        desktop_project_id,
        updated_at_unix_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|_| "System time is before UNIX epoch.".to_owned())?
            .as_millis(),
    });
    write_manual_decisions(app, &store)?;
    Ok(json!({ "state": decision, "changesProjectOwnedFiles": false, "grantsAuthority": false }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    core_version: String,
    authority_issued: bool,
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

fn evidence_path(app: &tauri::AppHandle, file_name: &str) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?
        .join("provider-sessions");
    match fs::symlink_metadata(&root) {
        Ok(metadata) => {
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err("Provider session evidence root must be a real non-symbolic-link directory.".to_owned());
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            fs::create_dir_all(&root)
                .map_err(|error| format!("Provider session evidence root could not be created: {error}"))?;
        }
        Err(error) => return Err(format!("Provider session evidence root could not be inspected: {error}")),
    }
    Ok(root.join(file_name))
}

fn validate_snapshot(value: &Value) -> Result<(), String> {
    if value.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
        return Err("Codex provider session reconciliation schema is unsupported.".to_owned());
    }
    if value.get("provider").and_then(Value::as_str) != Some("codex") {
        return Err("Codex provider session reconciliation provider is invalid.".to_owned());
    }
    match value.get("state").and_then(Value::as_str) {
        Some("ready" | "unavailable") => {}
        _ => return Err("Codex provider session reconciliation state is invalid.".to_owned()),
    }
    if value.get("observedAt").and_then(Value::as_str).map(str::trim).filter(|value| !value.is_empty()).is_none() {
        return Err("Codex provider session reconciliation observedAt is invalid.".to_owned());
    }
    if !value.get("bindings").is_some_and(Value::is_array) {
        return Err("Codex provider session reconciliation bindings are invalid.".to_owned());
    }
    Ok(())
}

fn persist_ready_snapshot(app: &tauri::AppHandle, snapshot: &Value) -> Result<(), String> {
    if snapshot.get("state").and_then(Value::as_str) != Some("ready") {
        return Ok(());
    }
    let target = evidence_path(app, "codex-bindings.json")?;
    let parent = target.parent().ok_or_else(|| "Provider session evidence path has no parent.".to_owned())?;
    let temporary = parent.join(format!(".codex-bindings-{}.tmp", std::process::id()));
    let bytes = serde_json::to_vec_pretty(snapshot)
        .map_err(|error| format!("Codex provider session evidence could not be serialized: {error}"))?;
    fs::write(&temporary, bytes)
        .map_err(|error| format!("Codex provider session evidence temp file could not be written: {error}"))?;
    if target.exists() {
        fs::remove_file(&target)
            .map_err(|error| format!("Previous Codex provider session evidence could not be replaced: {error}"))?;
    }
    fs::rename(&temporary, &target)
        .map_err(|error| format!("Codex provider session evidence could not be committed: {error}"))?;
    Ok(())
}

fn read_provider_context_observations(app: &tauri::AppHandle) -> Result<Vec<Value>, String> {
    let path = evidence_path(app, "context-observations.jsonl")?;
    let raw = match fs::read_to_string(&path) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(format!("Provider context session observations could not be read: {error}")),
    };
    if raw.len() > 16 * 1024 * 1024 {
        return Err("Provider context session observation spool exceeds the Desktop reconciliation safety bound.".to_owned());
    }
    let mut observations = Vec::new();
    for (index, line) in raw.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let value: Value = serde_json::from_str(line)
            .map_err(|error| format!("Provider context session observation line {} is invalid: {error}", index + 1))?;
        if value.get("schemaVersion").and_then(Value::as_u64) != Some(1)
            || value.get("evidenceClass").and_then(Value::as_str) != Some("provider-context-session-observation")
            || value.get("projectTruth").and_then(Value::as_bool) != Some(false)
            || value.get("grantsAuthority").and_then(Value::as_bool) != Some(false)
        {
            return Err(format!("Provider context session observation line {} violates the evidence boundary.", index + 1));
        }
        observations.push(value);
    }
    Ok(observations)
}

fn reconcile_codex_sessions_blocking(app: tauri::AppHandle) -> Result<Value, String> {
    let projects = registered_provider_projects(&app)?;
    let context_observations = read_provider_context_observations(&app)?;
    let manual_decisions = read_manual_decisions(&app)?.decisions;
    if projects.is_empty() {
        return Ok(json!({
            "schemaVersion": 1,
            "state": "ready",
            "provider": "codex",
            "observedAt": chrono_like_now(),
            "detail": "No available registered Livariant projects require Codex session reconciliation.",
            "bindings": [],
            "boundaries": {
                "desktopSelectionControlsRouting": false,
                "evidenceIsProjectTruth": false,
                "evidenceGrantsAuthority": false
            }
        }));
    }

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
        .join("connectors")
        .join("codex-thread-reconciliation-cli.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !script.is_file() || !manifest_path.is_file() {
        return Ok(json!({
            "schemaVersion": 1,
            "state": "unavailable",
            "provider": "codex",
            "observedAt": chrono_like_now(),
            "detail": "Bundled Codex session reconciliation runtime is not present.",
            "bindings": []
        }));
    }

    let manifest: RuntimeManifest = serde_json::from_slice(
        &fs::read(&manifest_path).map_err(|error| format!("Runtime manifest could not be read: {error}"))?
    ).map_err(|error| format!("Runtime manifest is invalid: {error}"))?;
    if manifest.authority_issued {
        return Err("Ordinary bundled runtime material must never claim Authority.".to_owned());
    }

    let input = serde_json::to_vec(&json!({
        "projects": projects,
        "contextObservations": context_observations,
        "manualDecisions": manual_decisions
    }))
        .map_err(|error| format!("Codex session reconciliation input could not be encoded: {error}"))?;

    let mut child = hidden_command(&node)
        .arg(&script)
        .current_dir(install_root)
        .env("LIVARIANT_CORE_VERSION", &manifest.core_version)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Codex session reconciliation runtime could not be started: {error}"))?;
    {
        let mut stdin = child.stdin.take().ok_or_else(|| "Codex session reconciliation stdin was unavailable.".to_owned())?;
        stdin.write_all(&input)
            .map_err(|error| format!("Codex session reconciliation input could not be written: {error}"))?;
    }
    let output = child
        .wait_with_output()
        .map_err(|error| format!("Codex session reconciliation runtime could not be awaited: {error}"))?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if detail.is_empty() {
            "Codex session reconciliation failed closed.".to_owned()
        } else {
            format!("Codex session reconciliation failed closed: {detail}")
        });
    }

    let mut snapshot: Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Codex session reconciliation returned invalid JSON: {error}"))?;
    validate_snapshot(&snapshot)?;
    snapshot["boundaries"] = json!({
        "desktopSelectionControlsRouting": false,
        "directProviderContextDrivesProjectAttribution": true,
        "cwdIsFallbackAttribution": true,
        "providerSessionEvidenceIsProjectTruth": false,
        "providerSessionEvidenceGrantsAuthority": false,
        "changesProjectOwnedFiles": false
    });
    persist_ready_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}


fn read_hook_observations(app: &tauri::AppHandle) -> Result<Vec<Value>, String> {
    let path = evidence_path(app, "hook-observations.jsonl")?;
    let raw = match fs::read_to_string(&path) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(format!("Provider hook observations could not be read: {error}")),
    };
    if raw.len() > 16 * 1024 * 1024 {
        return Err("Provider hook observation spool exceeds the Desktop reconciliation safety bound.".to_owned());
    }
    let mut observations = Vec::new();
    for (index, line) in raw.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let value: Value = serde_json::from_str(line)
            .map_err(|error| format!("Provider hook observation line {} is invalid: {error}", index + 1))?;
        if value.get("schemaVersion").and_then(Value::as_u64) != Some(1)
            || value.get("evidenceClass").and_then(Value::as_str) != Some("provider-hook-observation")
            || value.get("projectTruth").and_then(Value::as_bool) != Some(false)
            || value.get("grantsAuthority").and_then(Value::as_bool) != Some(false)
        {
            return Err(format!("Provider hook observation line {} violates the evidence boundary.", index + 1));
        }
        observations.push(value);
    }
    Ok(observations)
}

fn persist_hook_snapshot(app: &tauri::AppHandle, snapshot: &Value) -> Result<(), String> {
    let target = evidence_path(app, "hook-bindings.json")?;
    let parent = target.parent().ok_or_else(|| "Provider hook binding path has no parent.".to_owned())?;
    let temporary = parent.join(format!(".hook-bindings-{}.tmp", std::process::id()));
    let bytes = serde_json::to_vec_pretty(snapshot)
        .map_err(|error| format!("Provider hook binding evidence could not be serialized: {error}"))?;
    fs::write(&temporary, bytes)
        .map_err(|error| format!("Provider hook binding temp file could not be written: {error}"))?;
    if target.exists() {
        fs::remove_file(&target)
            .map_err(|error| format!("Previous provider hook binding evidence could not be replaced: {error}"))?;
    }
    fs::rename(&temporary, &target)
        .map_err(|error| format!("Provider hook binding evidence could not be committed: {error}"))?;
    Ok(())
}

fn reconcile_provider_hook_sessions_blocking(app: tauri::AppHandle) -> Result<Value, String> {
    let projects = registered_provider_projects(&app)?;
    let observations = read_hook_observations(&app)?;
    let manual_decisions = read_manual_decisions(&app)?.decisions;
    if observations.is_empty() {
        return Ok(json!({
            "schemaVersion": 1,
            "state": "ready",
            "observedAt": chrono_like_now(),
            "bindings": [],
            "detail": "No Claude/Gemini hook session evidence is currently available.",
            "boundaries": {
                "desktopSelectionControlsRouting": false,
                "evidenceIsProjectTruth": false,
                "evidenceGrantsAuthority": false,
                "changesProjectOwnedFiles": false
            }
        }));
    }

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
        .join("connectors")
        .join("provider-hook-reconciliation-cli.js");
    if !node.is_file() || !script.is_file() {
        return Err("Bundled provider hook reconciliation runtime is not present.".to_owned());
    }

    let input = serde_json::to_vec(&json!({
        "projects": projects,
        "observations": observations,
        "manualDecisions": manual_decisions
    })).map_err(|error| format!("Provider hook reconciliation input could not be encoded: {error}"))?;

    let mut child = hidden_command(&node)
        .arg(&script)
        .current_dir(install_root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Provider hook reconciliation runtime could not be started: {error}"))?;
    {
        let mut stdin = child.stdin.take().ok_or_else(|| "Provider hook reconciliation stdin was unavailable.".to_owned())?;
        stdin.write_all(&input)
            .map_err(|error| format!("Provider hook reconciliation input could not be written: {error}"))?;
    }
    let output = child
        .wait_with_output()
        .map_err(|error| format!("Provider hook reconciliation runtime could not be awaited: {error}"))?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if detail.is_empty() {
            "Provider hook reconciliation failed closed.".to_owned()
        } else {
            format!("Provider hook reconciliation failed closed: {detail}")
        });
    }

    let snapshot: Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Provider hook reconciliation returned invalid JSON: {error}"))?;
    if snapshot.get("schemaVersion").and_then(Value::as_u64) != Some(1)
        || snapshot.get("state").and_then(Value::as_str) != Some("ready")
        || !snapshot.get("bindings").is_some_and(Value::is_array)
    {
        return Err("Provider hook reconciliation output is invalid.".to_owned());
    }
    persist_hook_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

fn chrono_like_now() -> String {
    // Avoid a new time dependency in Desktop; this path is informational only.
    format!("{:?}", std::time::SystemTime::now())
}

pub(crate) fn start_background(app: tauri::AppHandle) {
    std::thread::spawn(move || loop {
        let _ = reconcile_codex_sessions_blocking(app.clone());
        let _ = reconcile_provider_hook_sessions_blocking(app.clone());
        std::thread::sleep(std::time::Duration::from_secs(30));
    });
}

#[tauri::command]
pub fn assign_provider_session_to_active_project(
    app: tauri::AppHandle,
    state: State<'_, crate::desktop_project_registry::DesktopProjectRegistryState>,
    provider: String,
    provider_item_id: String,
) -> Result<Value, String> {
    let active = crate::desktop_project_registry::active_project_scope(&app, state.inner())?;
    upsert_manual_decision(&app, &provider, &provider_item_id, "assigned", Some(active.desktop_project_id))
}

#[tauri::command]
pub fn block_provider_session_automatic_assignment(
    app: tauri::AppHandle,
    provider: String,
    provider_item_id: String,
) -> Result<Value, String> {
    upsert_manual_decision(&app, &provider, &provider_item_id, "unassigned", None)
}

#[tauri::command]
pub fn clear_provider_session_manual_decision(
    app: tauri::AppHandle,
    provider: String,
    provider_item_id: String,
) -> Result<Value, String> {
    let provider = validate_provider(&provider)?;
    let provider_item_id = validate_provider_item_id(&provider_item_id)?;
    let mut store = read_manual_decisions(&app)?;
    let before = store.decisions.len();
    store.decisions.retain(|item| !(item.provider == provider && item.provider_item_id == provider_item_id));
    if store.decisions.len() != before {
        write_manual_decisions(&app, &store)?;
    }
    Ok(json!({ "state": "automatic", "changesProjectOwnedFiles": false, "grantsAuthority": false }))
}

#[tauri::command]
pub async fn reconcile_codex_provider_sessions(app: tauri::AppHandle) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || reconcile_codex_sessions_blocking(app))
        .await
        .map_err(|error| format!("Codex session reconciliation worker failed: {error}"))?
}


#[tauri::command]
pub async fn reconcile_provider_hook_sessions(app: tauri::AppHandle) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || reconcile_provider_hook_sessions_blocking(app))
        .await
        .map_err(|error| format!("Provider hook session reconciliation worker failed: {error}"))?
}
