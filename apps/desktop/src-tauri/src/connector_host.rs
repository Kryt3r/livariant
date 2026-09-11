use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, ChildStdout, Command, Stdio},
    sync::Mutex,
};
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    core_version: String,
    authority_issued: bool,
}

struct ConnectorHostProcess {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
    next_id: u64,
}

impl Drop for ConnectorHostProcess {
    fn drop(&mut self) {
        let _ = self.stdin.flush();
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl ConnectorHostProcess {
    fn request(
        &mut self,
        method: &'static str,
        manual_path: Option<&str>,
        diagnostics_preset: Option<&str>,
    ) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id = self.next_id.checked_add(1).ok_or_else(|| "Connector host request id space exhausted.".to_owned())?;
        let mut request = json!({ "id": id, "method": method });
        if let Some(path) = manual_path {
            request["manualPath"] = Value::String(path.to_owned());
        }
        if let Some(preset) = diagnostics_preset {
            request["diagnosticsPreset"] = Value::String(preset.to_owned());
        }
        writeln!(self.stdin, "{request}")
            .map_err(|error| format!("Connector host request could not be written: {error}"))?;
        self.stdin.flush().map_err(|error| format!("Connector host request could not be flushed: {error}"))?;

        let mut line = String::new();
        let count = self.stdout.read_line(&mut line).map_err(|error| format!("Connector host response could not be read: {error}"))?;
        if count == 0 {
            return Err("Connector host closed its response stream unexpectedly.".to_owned());
        }
        let response: Value = serde_json::from_str(&line).map_err(|error| format!("Connector host returned invalid JSON: {error}"))?;
        if response.get("id").and_then(Value::as_u64) != Some(id) {
            return Err("Connector host response id did not match the request.".to_owned());
        }
        if response.get("ok").and_then(Value::as_bool) != Some(true) {
            return Err(response.get("error").and_then(Value::as_str).unwrap_or("Connector host request failed.").to_owned());
        }
        response.get("result").cloned().ok_or_else(|| "Connector host response did not include a result.".to_owned())
    }
}

#[derive(Default)]
pub struct ConnectorHostState {
    process: Mutex<Option<ConnectorHostProcess>>,
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

fn spawn_host(app: &AppHandle) -> Result<ConnectorHostProcess, String> {
    let executable = std::env::current_exe().map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable.parent().ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?;
    let node = bundled_node_path(install_root);
    let host = install_root.join("runtime").join("core").join("dist").join("src").join("connectors").join("desktop-connector-host.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !host.is_file() || !manifest_path.is_file() {
        return Err("Bundled connector runtime is not present in this Desktop build.".to_owned());
    }

    let manifest: RuntimeManifest = serde_json::from_slice(&fs::read(&manifest_path).map_err(|error| format!("Runtime manifest could not be read: {error}"))?)
        .map_err(|error| format!("Runtime manifest is invalid: {error}"))?;
    if manifest.authority_issued {
        return Err("Ordinary bundled runtime material must never claim Authority.".to_owned());
    }

    let app_data_root = app.path().app_data_dir().map_err(|error| format!("Desktop app-data directory could not be resolved: {error}"))?;
    let diagnostics_root = app_data_root.join("diagnostics");
    let connection_intent_path = app_data_root.join("connections").join("codex.json");
    fs::create_dir_all(&diagnostics_root).map_err(|error| format!("Diagnostics directory could not be created: {error}"))?;

    let mut child = hidden_command(&node)
        .arg(&host)
        .current_dir(install_root)
        .env("LIVARIANT_DIAGNOSTICS_ROOT", &diagnostics_root)
        .env("LIVARIANT_CONNECTION_INTENT_PATH", &connection_intent_path)
        .env("LIVARIANT_CORE_VERSION", &manifest.core_version)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Livariant connector host could not be started: {error}"))?;
    let stdin = child.stdin.take().ok_or_else(|| "Connector host stdin was unavailable.".to_owned())?;
    let stdout = child.stdout.take().ok_or_else(|| "Connector host stdout was unavailable.".to_owned())?;
    Ok(ConnectorHostProcess { child, stdin, stdout: BufReader::new(stdout), next_id: 1 })
}

fn request(
    app: &AppHandle,
    state: &ConnectorHostState,
    method: &'static str,
    manual_path: Option<&str>,
    diagnostics_preset: Option<&str>,
) -> Result<Value, String> {
    let mut guard = state.process.lock().map_err(|_| "Connector host state lock is poisoned.".to_owned())?;
    if guard.is_none() {
        *guard = Some(spawn_host(app)?);
    }
    let result = guard
        .as_mut()
        .expect("connector host initialized")
        .request(method, manual_path, diagnostics_preset);
    if result.is_err() {
        *guard = None;
    }
    result
}

fn persisted_connection_desired(raw: &[u8]) -> Result<bool, String> {
    let value: Value = serde_json::from_slice(raw)
        .map_err(|error| format!("Persisted Codex connection intent is invalid JSON: {error}"))?;
    let record = value
        .as_object()
        .ok_or_else(|| "Persisted Codex connection intent must be an object.".to_owned())?;
    if record.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
        return Err("Persisted Codex connection intent schema version is unsupported.".to_owned());
    }
    let desired = record
        .get("desiredConnected")
        .and_then(Value::as_bool)
        .ok_or_else(|| "Persisted Codex connection intent desiredConnected must be boolean.".to_owned())?;
    let mode = record
        .get("mode")
        .and_then(Value::as_str)
        .ok_or_else(|| "Persisted Codex connection intent mode is invalid.".to_owned())?;
    if mode != "auto" && mode != "manual" {
        return Err("Persisted Codex connection intent mode is invalid.".to_owned());
    }
    if let Some(resolved_command) = record.get("resolvedCommand") {
        let command = resolved_command
            .as_str()
            .ok_or_else(|| "Persisted Codex connection intent resolvedCommand must be a string when present.".to_owned())?;
        if command.trim().is_empty() {
            return Err("Persisted Codex connection intent resolvedCommand must not be blank.".to_owned());
        }
    }
    if desired && mode == "manual" {
        let manual_path = record.get("manualPath").and_then(Value::as_str).map(str::trim).unwrap_or_default();
        if manual_path.is_empty() {
            return Err("Persisted manual Codex connection intent is missing its executable path.".to_owned());
        }
    }
    Ok(desired)
}

pub fn restore_persistent_connection(app: &AppHandle, state: &ConnectorHostState) -> Result<(), String> {
    let app_data_root = app.path().app_data_dir().map_err(|error| format!("Desktop app-data directory could not be resolved: {error}"))?;
    let intent_path = app_data_root.join("connections").join("codex.json");
    let desired = match fs::read(&intent_path) {
        Ok(raw) => persisted_connection_desired(&raw)?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => false,
        Err(error) => return Err(format!("Persisted Codex connection intent could not be read: {error}")),
    };
    if !desired {
        return Ok(());
    }
    request(app, state, "inspect", None, None).map(|_| ())
}

fn validate_diagnostics_preset(preset: Option<&str>) -> Result<Option<&str>, String> {
    match preset {
        None => Ok(None),
        Some("1d" | "7d" | "30d" | "90d" | "all") => Ok(preset),
        Some(_) => Err("Diagnostics preset must be one of: 1d, 7d, 30d, 90d, all.".to_owned()),
    }
}

#[tauri::command]
pub fn codex_connector_status(app: AppHandle, state: State<'_, ConnectorHostState>) -> Result<Value, String> {
    request(&app, &state, "inspect", None, None)
}

#[tauri::command]
pub fn codex_connector_connect(app: AppHandle, state: State<'_, ConnectorHostState>, manual_path: Option<String>) -> Result<Value, String> {
    request(&app, &state, "connect", manual_path.as_deref(), None)
}

#[tauri::command]
pub fn codex_connector_disconnect(app: AppHandle, state: State<'_, ConnectorHostState>) -> Result<Value, String> {
    request(&app, &state, "disconnect", None, None)
}

#[tauri::command]
pub fn codex_diagnostics_summary(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    preset: Option<String>,
) -> Result<Value, String> {
    let preset = validate_diagnostics_preset(preset.as_deref())?;
    request(&app, &state, "diagnostics", None, preset)
}

#[tauri::command]
pub fn codex_diagnostics_export(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    preset: Option<String>,
) -> Result<Value, String> {
    let preset = validate_diagnostics_preset(preset.as_deref())?;
    request(&app, &state, "export", None, preset)
}

#[tauri::command]
pub fn codex_diagnostics_measure(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    preset: Option<String>,
) -> Result<Value, String> {
    let preset = validate_diagnostics_preset(preset.as_deref())?;
    request(&app, &state, "measure", None, preset)
}

#[cfg(test)]
mod tests {
    use super::{persisted_connection_desired, validate_diagnostics_preset};

    #[test]
    fn accepts_supported_diagnostics_presets() {
        for preset in ["1d", "7d", "30d", "90d", "all"] {
            assert_eq!(validate_diagnostics_preset(Some(preset)).unwrap(), Some(preset));
        }
        assert_eq!(validate_diagnostics_preset(None).unwrap(), None);
    }

    #[test]
    fn rejects_arbitrary_diagnostics_presets() {
        let error = validate_diagnostics_preset(Some("custom-script")).unwrap_err();
        assert!(error.contains("1d, 7d, 30d, 90d, all"));
    }

    #[test]
    fn does_not_start_connector_host_for_disconnected_intent() {
        let raw = br#"{"schemaVersion":1,"desiredConnected":false,"mode":"auto"}"#;
        assert!(!persisted_connection_desired(raw).unwrap());
    }

    #[test]
    fn restores_connector_host_only_for_valid_connected_intent() {
        let legacy_auto = br#"{"schemaVersion":1,"desiredConnected":true,"mode":"auto"}"#;
        assert!(persisted_connection_desired(legacy_auto).unwrap());

        let pinned_auto = br#"{"schemaVersion":1,"desiredConnected":true,"mode":"auto","resolvedCommand":"C:\\Tools\\codex.exe"}"#;
        assert!(persisted_connection_desired(pinned_auto).unwrap());

        let manual = br#"{"schemaVersion":1,"desiredConnected":true,"mode":"manual","manualPath":"C:\\Tools\\codex.exe"}"#;
        assert!(persisted_connection_desired(manual).unwrap());
    }

    #[test]
    fn malformed_connected_intent_fails_closed_before_host_spawn() {
        let missing_manual_path = br#"{"schemaVersion":1,"desiredConnected":true,"mode":"manual"}"#;
        assert!(persisted_connection_desired(missing_manual_path).is_err());

        let unsupported_mode = br#"{"schemaVersion":1,"desiredConnected":true,"mode":"shell"}"#;
        assert!(persisted_connection_desired(unsupported_mode).is_err());

        let invalid_resolved_command = br#"{"schemaVersion":1,"desiredConnected":true,"mode":"auto","resolvedCommand":42}"#;
        assert!(persisted_connection_desired(invalid_resolved_command).is_err());

        let blank_resolved_command = br#"{"schemaVersion":1,"desiredConnected":true,"mode":"auto","resolvedCommand":"   "}"#;
        assert!(persisted_connection_desired(blank_resolved_command).is_err());
    }
}
