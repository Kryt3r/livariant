use crate::desktop_project_registry::{active_project_scope, DesktopProjectRegistryState};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
use tauri::{AppHandle, Manager, State};

const PROVIDERS: [&str; 3] = ["claude", "gemini", "custom"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderIntent {
    schema_version: u32,
    desired_connected: bool,
    mode: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    manual_path: Option<String>,
}

fn disconnected_intent() -> ProviderIntent {
    ProviderIntent {
        schema_version: 1,
        desired_connected: false,
        mode: "auto".to_owned(),
        manual_path: None,
    }
}

fn validate_provider(provider: &str) -> Result<&str, String> {
    if PROVIDERS.contains(&provider) {
        Ok(provider)
    } else {
        Err("Local provider is unsupported.".to_owned())
    }
}

fn validate_manual_path(path: Option<String>) -> Result<Option<String>, String> {
    let Some(path) = path else { return Ok(None); };
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.len() > 4096 || trimmed.contains('\0') {
        return Err("Local provider executable path is invalid.".to_owned());
    }
    Ok(Some(trimmed.to_owned()))
}

fn decode_intent(raw: &[u8], provider: &str) -> Result<ProviderIntent, String> {
    let intent: ProviderIntent = serde_json::from_slice(raw)
        .map_err(|error| format!("Local provider connection preference is invalid: {error}"))?;
    if intent.schema_version != 1 {
        return Err("Local provider connection preference schema is unsupported.".to_owned());
    }
    if intent.mode != "auto" && intent.mode != "manual" {
        return Err("Local provider connection mode is invalid.".to_owned());
    }
    if provider == "custom" && intent.desired_connected && intent.manual_path.as_deref().unwrap_or("").trim().is_empty() {
        return Err("Custom provider connection preference is missing its executable path.".to_owned());
    }
    Ok(intent)
}

fn project_intent_path(
    app: &AppHandle,
    registry: &DesktopProjectRegistryState,
    provider: &str,
    create_parent: bool,
) -> Result<PathBuf, String> {
    let scope = active_project_scope(app, registry)?;
    let dir = scope.state_root.join("connections");
    match fs::symlink_metadata(&dir) {
        Ok(metadata) => {
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err("Project connection directory must be a real non-symbolic-link directory.".to_owned());
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound && create_parent => {
            if let Err(error) = fs::create_dir(&dir) {
                if error.kind() != std::io::ErrorKind::AlreadyExists {
                    return Err(format!("Project connection directory could not be created: {error}"));
                }
            }
            let metadata = fs::symlink_metadata(&dir)
                .map_err(|error| format!("Project connection directory could not be inspected: {error}"))?;
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err("Project connection directory must be a real non-symbolic-link directory.".to_owned());
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(format!("Project connection directory could not be inspected: {error}")),
    }
    Ok(dir.join(format!("{provider}.json")))
}

fn legacy_intent_path(app: &AppHandle, provider: &str) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Desktop app-data directory could not be resolved: {error}"))?;
    Ok(root.join("connections").join(format!("{provider}.json")))
}

fn write_intent_to_path(path: &Path, intent: &ProviderIntent) -> Result<(), String> {
    let parent = path.parent().ok_or_else(|| "Project provider connection path has no parent.".to_owned())?;
    let metadata = fs::symlink_metadata(parent)
        .map_err(|error| format!("Project provider connection directory could not be inspected: {error}"))?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err("Project provider connection directory must be a real non-symbolic-link directory.".to_owned());
    }
    let temporary = path.with_extension(format!("json.tmp-{}", std::process::id()));
    let bytes = serde_json::to_vec(intent)
        .map_err(|error| format!("Project provider connection preference could not be encoded: {error}"))?;
    fs::write(&temporary, bytes)
        .map_err(|error| format!("Project provider connection preference could not be written: {error}"))?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("Previous project provider connection preference could not be replaced: {error}"))?;
    }
    fs::rename(&temporary, path)
        .map_err(|error| format!("Project provider connection preference could not be committed: {error}"))?;
    Ok(())
}

fn migrate_legacy_intent_if_needed(
    app: &AppHandle,
    registry: &DesktopProjectRegistryState,
    provider: &str,
) -> Result<PathBuf, String> {
    let target = project_intent_path(app, registry, provider, false)?;
    if target.exists() {
        return Ok(target);
    }
    let legacy = legacy_intent_path(app, provider)?;
    let metadata = match fs::symlink_metadata(&legacy) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(target),
        Err(error) => return Err(format!("Legacy local provider connection preference could not be inspected: {error}")),
    };
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("Legacy local provider connection preference must be a real non-symbolic-link file.".to_owned());
    }
    let raw = fs::read(&legacy)
        .map_err(|error| format!("Legacy local provider connection preference could not be read: {error}"))?;
    let intent = decode_intent(&raw, provider)?;
    let target = project_intent_path(app, registry, provider, true)?;
    let claimed = legacy.with_extension(format!("json.migrating-{}", std::process::id()));
    fs::rename(&legacy, &claimed)
        .map_err(|error| format!("Legacy local provider connection preference could not be claimed for migration: {error}"))?;
    if let Err(error) = write_intent_to_path(&target, &intent) {
        let _ = fs::rename(&claimed, &legacy);
        return Err(error);
    }
    let _ = fs::remove_file(&claimed);
    Ok(target)
}

fn read_intent(
    app: &AppHandle,
    registry: &DesktopProjectRegistryState,
    provider: &str,
) -> Result<ProviderIntent, String> {
    let path = migrate_legacy_intent_if_needed(app, registry, provider)?;
    let raw = match fs::read(&path) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(disconnected_intent()),
        Err(error) => return Err(format!("Project provider connection preference could not be read: {error}")),
    };
    decode_intent(&raw, provider)
}

fn write_intent(
    app: &AppHandle,
    registry: &DesktopProjectRegistryState,
    provider: &str,
    intent: &ProviderIntent,
) -> Result<(), String> {
    let path = project_intent_path(app, registry, provider, true)?;
    write_intent_to_path(&path, intent)
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

fn inspect_provider(app: &AppHandle, provider: &str, manual_path: Option<&str>) -> Result<Value, String> {
    validate_provider(provider)?;
    let executable = std::env::current_exe()
        .map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable
        .parent()
        .ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?;
    let node = bundled_node_path(install_root);
    let probe = install_root
        .join("runtime")
        .join("core")
        .join("dist")
        .join("src")
        .join("connectors")
        .join("local-provider-desktop-cli.js");
    if !node.is_file() || !probe.is_file() {
        return Err("Bundled local provider runtime is not present in this Desktop build.".to_owned());
    }

    let mut command = hidden_command(&node);
    command
        .arg(&probe)
        .arg("inspect")
        .arg(provider)
        .current_dir(install_root)
        .stdin(Stdio::null())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped());
    if let Some(path) = manual_path {
        command.arg(path);
    }
    let output = command
        .output()
        .map_err(|error| format!("Local provider inspection could not be started: {error}"))?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if detail.is_empty() {
            format!("Local provider inspection failed with exit code {:?}.", output.status.code())
        } else {
            detail
        });
    }
    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Local provider inspection returned invalid JSON: {error}"))
}

fn public_status(app: &AppHandle, provider: &str, intent: &ProviderIntent) -> Result<Value, String> {
    let inspection = if provider == "custom" && intent.manual_path.is_none() {
        json!({
            "provider": provider,
            "installationState": "not-found",
            "authState": "unavailable",
            "version": Value::Null,
            "detail": "Choose a local executable that implements the Livariant custom provider probe contract.",
            "launchSource": Value::Null
        })
    } else {
        inspect_provider(app, provider, intent.manual_path.as_deref())?
    };

    let available = inspection
        .get("installationState")
        .and_then(Value::as_str)
        == Some("available");
    let auth_usable = inspection
        .get("authState")
        .and_then(Value::as_str)
        .map(|value| value != "unavailable")
        .unwrap_or(false);
    let connected = intent.desired_connected && available && auth_usable;

    Ok(json!({
        "provider": provider,
        "installationState": inspection.get("installationState").cloned().unwrap_or(Value::String("unusable".to_owned())),
        "authState": inspection.get("authState").cloned().unwrap_or(Value::String("unavailable".to_owned())),
        "version": inspection.get("version").cloned().unwrap_or(Value::Null),
        "detail": inspection.get("detail").cloned().unwrap_or(Value::String("Local provider state observed.".to_owned())),
        "launchSource": inspection.get("launchSource").cloned().unwrap_or(Value::Null),
        "capabilities": inspection.get("capabilities").cloned().unwrap_or_else(|| json!({})),
        "connected": connected,
        "connectionMode": intent.mode.clone(),
        "configuredPath": intent.manual_path.clone(),
    }))
}

#[tauri::command]
pub fn local_provider_status(app: AppHandle, registry: State<'_, DesktopProjectRegistryState>, provider: String) -> Result<Value, String> {
    let provider = validate_provider(provider.trim())?;
    let intent = read_intent(&app, registry.inner(), provider)?;
    public_status(&app, provider, &intent)
}

#[tauri::command]
pub fn local_provider_connect(app: AppHandle, registry: State<'_, DesktopProjectRegistryState>, provider: String, manual_path: Option<String>) -> Result<Value, String> {
    let provider = validate_provider(provider.trim())?;
    let manual_path = validate_manual_path(manual_path)?;
    if provider == "custom" && manual_path.is_none() {
        return Err("Custom provider connection requires an explicit executable path.".to_owned());
    }

    let inspection = inspect_provider(&app, provider, manual_path.as_deref())?;
    if inspection.get("installationState").and_then(Value::as_str) != Some("available") {
        return Err(inspection.get("detail").and_then(Value::as_str).unwrap_or("Local provider is not available.").to_owned());
    }
    if inspection.get("authState").and_then(Value::as_str) == Some("unavailable") {
        return Err(inspection.get("detail").and_then(Value::as_str).unwrap_or("Local provider is not authenticated/configured.").to_owned());
    }

    let intent = ProviderIntent {
        schema_version: 1,
        desired_connected: true,
        mode: if manual_path.is_some() { "manual" } else { "auto" }.to_owned(),
        manual_path,
    };
    write_intent(&app, registry.inner(), provider, &intent)?;
    public_status(&app, provider, &intent)
}

#[tauri::command]
pub fn local_provider_disconnect(app: AppHandle, registry: State<'_, DesktopProjectRegistryState>, provider: String) -> Result<Value, String> {
    let provider = validate_provider(provider.trim())?;
    let mut intent = read_intent(&app, registry.inner(), provider)?;
    intent.desired_connected = false;
    write_intent(&app, registry.inner(), provider, &intent)?;
    public_status(&app, provider, &intent)
}

#[cfg(test)]
mod tests {
    use super::{validate_manual_path, validate_provider};

    #[test]
    fn provider_allowlist_fails_closed() {
        assert!(validate_provider("claude").is_ok());
        assert!(validate_provider("gemini").is_ok());
        assert!(validate_provider("custom").is_ok());
        assert!(validate_provider("shell").is_err());
    }

    #[test]
    fn manual_path_validation_rejects_nul_and_absurd_length() {
        assert!(validate_manual_path(Some("C:\\Tools\\provider.exe".to_owned())).unwrap().is_some());
        assert!(validate_manual_path(Some("  ".to_owned())).unwrap().is_none());
        assert!(validate_manual_path(Some("bad\0path".to_owned())).is_err());
        assert!(validate_manual_path(Some("x".repeat(4097))).is_err());
    }
}
