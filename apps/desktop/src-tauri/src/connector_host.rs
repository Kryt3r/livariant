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
    fn request(&mut self, method: &'static str, manual_path: Option<&str>) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id = self.next_id.checked_add(1).ok_or_else(|| "Connector host request id space exhausted.".to_owned())?;
        let request = match manual_path {
            Some(path) => json!({ "id": id, "method": method, "manualPath": path }),
            None => json!({ "id": id, "method": method }),
        };
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

    let diagnostics_root = app.path().app_data_dir().map_err(|error| format!("Desktop app-data directory could not be resolved: {error}"))?.join("diagnostics");
    fs::create_dir_all(&diagnostics_root).map_err(|error| format!("Diagnostics directory could not be created: {error}"))?;

    let mut child = hidden_command(&node)
        .arg(&host)
        .current_dir(install_root)
        .env("LIVARIANT_DIAGNOSTICS_ROOT", &diagnostics_root)
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

fn request(app: &AppHandle, state: &ConnectorHostState, method: &'static str, manual_path: Option<&str>) -> Result<Value, String> {
    let mut guard = state.process.lock().map_err(|_| "Connector host state lock is poisoned.".to_owned())?;
    if guard.is_none() {
        *guard = Some(spawn_host(app)?);
    }
    let result = guard.as_mut().expect("connector host initialized").request(method, manual_path);
    if result.is_err() {
        *guard = None;
    }
    result
}

#[tauri::command]
pub fn codex_connector_status(app: AppHandle, state: State<'_, ConnectorHostState>) -> Result<Value, String> {
    request(&app, &state, "inspect", None)
}

#[tauri::command]
pub fn codex_connector_connect(app: AppHandle, state: State<'_, ConnectorHostState>, manual_path: Option<String>) -> Result<Value, String> {
    request(&app, &state, "connect", manual_path.as_deref())
}

#[tauri::command]
pub fn codex_connector_disconnect(app: AppHandle, state: State<'_, ConnectorHostState>) -> Result<Value, String> {
    request(&app, &state, "disconnect", None)
}

#[tauri::command]
pub fn codex_diagnostics_summary(app: AppHandle, state: State<'_, ConnectorHostState>) -> Result<Value, String> {
    request(&app, &state, "diagnostics", None)
}

#[tauri::command]
pub fn codex_diagnostics_measure(app: AppHandle, state: State<'_, ConnectorHostState>) -> Result<Value, String> {
    request(&app, &state, "measure", None)
}
