use crate::desktop_project_registry::registered_provider_projects;
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
use tauri::Manager;

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

fn reconcile_codex_sessions_blocking(app: tauri::AppHandle) -> Result<Value, String> {
    let projects = registered_provider_projects(&app)?;
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

    let input = serde_json::to_vec(&json!({ "projects": projects }))
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
        "cwdDrivesProjectAttribution": true,
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
        "observations": observations
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
    std::thread::spawn(move || {
        let _ = reconcile_codex_sessions_blocking(app.clone());
        let _ = reconcile_provider_hook_sessions_blocking(app);
    });
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
