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

use crate::desktop_project_registry::{
    active_diagnostics_project_id, active_project_scope, ActiveProjectScope, DesktopProjectRegistryState,
};

#[cfg(target_os = "windows")]
mod child_lifetime {
    use std::{
        ffi::c_void,
        mem::{size_of, zeroed},
        os::windows::io::AsRawHandle,
        process::Child,
        ptr,
    };

    type Handle = *mut c_void;
    const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION_CLASS: i32 = 9;
    const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: u32 = 0x0000_2000;

    #[repr(C)]
    struct JobObjectBasicLimitInformation {
        per_process_user_time_limit: i64,
        per_job_user_time_limit: i64,
        limit_flags: u32,
        minimum_working_set_size: usize,
        maximum_working_set_size: usize,
        active_process_limit: u32,
        affinity: usize,
        priority_class: u32,
        scheduling_class: u32,
    }

    #[repr(C)]
    struct IoCounters {
        read_operation_count: u64,
        write_operation_count: u64,
        other_operation_count: u64,
        read_transfer_count: u64,
        write_transfer_count: u64,
        other_transfer_count: u64,
    }

    #[repr(C)]
    struct JobObjectExtendedLimitInformation {
        basic_limit_information: JobObjectBasicLimitInformation,
        io_info: IoCounters,
        process_memory_limit: usize,
        job_memory_limit: usize,
        peak_process_memory_used: usize,
        peak_job_memory_used: usize,
    }

    #[link(name = "Kernel32")]
    extern "system" {
        fn CreateJobObjectW(attributes: *mut c_void, name: *const u16) -> Handle;
        fn SetInformationJobObject(
            job: Handle,
            information_class: i32,
            information: *mut c_void,
            information_length: u32,
        ) -> i32;
        fn AssignProcessToJobObject(job: Handle, process: Handle) -> i32;
        fn CloseHandle(handle: Handle) -> i32;
        fn GetLastError() -> u32;
    }

    pub(crate) struct ChildLifetimeGuard(Handle);

    // Windows kernel handles are process-wide objects and may be closed from a
    // different thread than the one that created them. The guard owns the only
    // Job Object handle and never dereferences the opaque HANDLE value.
    unsafe impl Send for ChildLifetimeGuard {}

    impl ChildLifetimeGuard {
        pub(crate) fn attach(child: &Child) -> Result<Self, String> {
            let job = unsafe { CreateJobObjectW(ptr::null_mut(), ptr::null()) };
            if job.is_null() {
                return Err(format!(
                    "Connector host Windows lifetime job could not be created (Windows error {}).",
                    unsafe { GetLastError() }
                ));
            }

            let mut information: JobObjectExtendedLimitInformation = unsafe { zeroed() };
            information.basic_limit_information.limit_flags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            let configured = unsafe {
                SetInformationJobObject(
                    job,
                    JOB_OBJECT_EXTENDED_LIMIT_INFORMATION_CLASS,
                    (&mut information as *mut JobObjectExtendedLimitInformation).cast::<c_void>(),
                    size_of::<JobObjectExtendedLimitInformation>() as u32,
                )
            };
            if configured == 0 {
                let error = unsafe { GetLastError() };
                unsafe { CloseHandle(job) };
                return Err(format!(
                    "Connector host Windows lifetime job could not enable kill-on-close (Windows error {error})."
                ));
            }

            let process = child.as_raw_handle() as Handle;
            let assigned = unsafe { AssignProcessToJobObject(job, process) };
            if assigned == 0 {
                let error = unsafe { GetLastError() };
                unsafe { CloseHandle(job) };
                return Err(format!(
                    "Connector host process could not be assigned to its Windows lifetime job (Windows error {error})."
                ));
            }

            Ok(Self(job))
        }
    }

    impl Drop for ChildLifetimeGuard {
        fn drop(&mut self) {
            if !self.0.is_null() {
                unsafe { CloseHandle(self.0) };
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod child_lifetime {
    use std::process::Child;

    pub(crate) struct ChildLifetimeGuard;

    impl ChildLifetimeGuard {
        pub(crate) fn attach(_child: &Child) -> Result<Self, String> {
            Ok(Self)
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    core_version: String,
    authority_issued: bool,
}

struct ConnectorHostProcess {
    desktop_project_id: String,
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
    next_id: u64,
    _lifetime_guard: child_lifetime::ChildLifetimeGuard,
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
        diagnostics_project_id: Option<&str>,
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
        if let Some(project_id) = diagnostics_project_id {
            request["diagnosticsProjectId"] = Value::String(project_id.to_owned());
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

fn ensure_real_child_directory(parent: &Path, child: &str) -> Result<PathBuf, String> {
    let path = parent.join(child);
    match fs::symlink_metadata(&path) {
        Ok(metadata) => {
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err(format!("Project {child} directory must be a real non-symbolic-link directory."));
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            if let Err(error) = fs::create_dir(&path) {
                if error.kind() != std::io::ErrorKind::AlreadyExists {
                    return Err(format!("Project {child} directory could not be created: {error}"));
                }
            }
            let metadata = fs::symlink_metadata(&path)
                .map_err(|error| format!("Project {child} directory could not be inspected: {error}"))?;
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err(format!("Project {child} directory must be a real non-symbolic-link directory."));
            }
        }
        Err(error) => return Err(format!("Project {child} directory could not be inspected: {error}")),
    }
    Ok(path)
}

fn legacy_codex_intent_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_root = app.path().app_data_dir()
        .map_err(|error| format!("Desktop app-data directory could not be resolved: {error}"))?;
    Ok(app_data_root.join("connections").join("codex.json"))
}

fn project_codex_intent_path(
    app: &AppHandle,
    scope: &ActiveProjectScope,
    migrate_legacy: bool,
) -> Result<PathBuf, String> {
    let connections = ensure_real_child_directory(&scope.state_root, "connections")?;
    let target = connections.join("codex.json");
    if !migrate_legacy || target.exists() {
        return Ok(target);
    }

    let legacy = legacy_codex_intent_path(app)?;
    let metadata = match fs::symlink_metadata(&legacy) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(target),
        Err(error) => return Err(format!("Legacy Codex connection intent could not be inspected: {error}")),
    };
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("Legacy Codex connection intent must be a real non-symbolic-link file.".to_owned());
    }
    let raw = fs::read(&legacy)
        .map_err(|error| format!("Legacy Codex connection intent could not be read: {error}"))?;
    persisted_connection_desired(&raw)?;

    let claimed = legacy.with_extension(format!("json.migrating-{}", std::process::id()));
    fs::rename(&legacy, &claimed)
        .map_err(|error| format!("Legacy Codex connection intent could not be claimed for migration: {error}"))?;
    let temporary = target.with_extension(format!("json.tmp-{}", std::process::id()));
    if let Err(error) = fs::write(&temporary, &raw).and_then(|_| fs::rename(&temporary, &target)) {
        let _ = fs::remove_file(&temporary);
        let _ = fs::rename(&claimed, &legacy);
        return Err(format!("Codex connection intent could not be migrated into the active project: {error}"));
    }
    let _ = fs::remove_file(&claimed);
    Ok(target)
}

fn spawn_host(app: &AppHandle, scope: &ActiveProjectScope) -> Result<ConnectorHostProcess, String> {
    let executable = std::env::current_exe()
        .map_err(|error| format!("Desktop executable location could not be resolved: {error}"))?;
    let install_root = executable
        .parent()
        .ok_or_else(|| "Desktop executable has no installation directory.".to_owned())?;
    let node = bundled_node_path(install_root);
    let host = install_root.join("runtime").join("core").join("dist").join("src").join("connectors").join("desktop-connector-host.js");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    if !node.is_file() || !host.is_file() || !manifest_path.is_file() {
        return Err("Bundled connector runtime is not present in this Desktop build.".to_owned());
    }

    let manifest: RuntimeManifest = serde_json::from_slice(
        &fs::read(&manifest_path).map_err(|error| format!("Runtime manifest could not be read: {error}"))?
    ).map_err(|error| format!("Runtime manifest is invalid: {error}"))?;
    if manifest.authority_issued {
        return Err("Ordinary bundled runtime material must never claim Authority.".to_owned());
    }

    let diagnostics_root = ensure_real_child_directory(&scope.state_root, "diagnostics")?;
    let connection_intent_path = project_codex_intent_path(app, scope, true)?;

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
    let lifetime_guard = match child_lifetime::ChildLifetimeGuard::attach(&child) {
        Ok(guard) => guard,
        Err(error) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }
    };
    let stdin = child.stdin.take().ok_or_else(|| "Connector host stdin was unavailable.".to_owned())?;
    let stdout = child.stdout.take().ok_or_else(|| "Connector host stdout was unavailable.".to_owned())?;
    Ok(ConnectorHostProcess {
        desktop_project_id: scope.desktop_project_id.clone(),
        child,
        stdin,
        stdout: BufReader::new(stdout),
        next_id: 1,
        _lifetime_guard: lifetime_guard,
    })
}

fn request(
    app: &AppHandle,
    state: &ConnectorHostState,
    registry: &DesktopProjectRegistryState,
    method: &'static str,
    manual_path: Option<&str>,
    diagnostics_preset: Option<&str>,
    diagnostics_project_id: Option<&str>,
) -> Result<Value, String> {
    let scope = active_project_scope(app, registry)?;
    let mut guard = state.process
        .lock()
        .map_err(|_| "Connector host state lock is poisoned.".to_owned())?;
    if guard.as_ref().is_some_and(|process| process.desktop_project_id != scope.desktop_project_id) {
        *guard = None;
    }
    if guard.is_none() {
        *guard = Some(spawn_host(app, &scope)?);
    }
    let result = guard
        .as_mut()
        .expect("connector host initialized")
        .request(method, manual_path, diagnostics_preset, diagnostics_project_id);
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

pub fn restore_persistent_connection(
    app: &AppHandle,
    state: &ConnectorHostState,
    registry: &DesktopProjectRegistryState,
) -> Result<(), String> {
    let scope = match active_project_scope(app, registry) {
        Ok(scope) => scope,
        Err(_) => return Ok(()),
    };
    let intent_path = project_codex_intent_path(app, &scope, true)?;
    let desired = match fs::read(&intent_path) {
        Ok(raw) => persisted_connection_desired(&raw)?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => false,
        Err(error) => return Err(format!("Project Codex connection intent could not be read: {error}")),
    };
    if !desired {
        return Ok(());
    }
    request(app, state, registry, "inspect", None, None, None).map(|_| ())
}

fn validate_diagnostics_preset(preset: Option<&str>) -> Result<Option<&str>, String> {
    match preset {
        None => Ok(None),
        Some("1d" | "7d" | "30d" | "90d" | "all") => Ok(preset),
        Some(_) => Err("Diagnostics preset must be one of: 1d, 7d, 30d, 90d, all.".to_owned()),
    }
}

#[tauri::command]
pub fn codex_connector_status(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    registry: State<'_, DesktopProjectRegistryState>,
) -> Result<Value, String> {
    request(&app, &state, registry.inner(), "inspect", None, None, None)
}

#[tauri::command]
pub fn codex_connector_connect(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    registry: State<'_, DesktopProjectRegistryState>,
    manual_path: Option<String>,
) -> Result<Value, String> {
    request(&app, &state, registry.inner(), "connect", manual_path.as_deref(), None, None)
}

#[tauri::command]
pub fn codex_connector_disconnect(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    registry: State<'_, DesktopProjectRegistryState>,
) -> Result<Value, String> {
    request(&app, &state, registry.inner(), "disconnect", None, None, None)
}

#[tauri::command]
pub fn codex_diagnostics_summary(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    registry: State<'_, DesktopProjectRegistryState>,
    preset: Option<String>,
) -> Result<Value, String> {
    let preset = validate_diagnostics_preset(preset.as_deref())?;
    let project_id = active_diagnostics_project_id(&app, registry.inner())?;
    request(&app, &state, registry.inner(), "diagnostics", None, preset, Some(&project_id))
}

#[tauri::command]
pub fn codex_diagnostics_export(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    registry: State<'_, DesktopProjectRegistryState>,
    preset: Option<String>,
) -> Result<Value, String> {
    let preset = validate_diagnostics_preset(preset.as_deref())?;
    let project_id = active_diagnostics_project_id(&app, registry.inner())?;
    request(&app, &state, registry.inner(), "export", None, preset, Some(&project_id))
}

#[tauri::command]
pub fn codex_diagnostics_measure(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    registry: State<'_, DesktopProjectRegistryState>,
    preset: Option<String>,
) -> Result<Value, String> {
    let preset = validate_diagnostics_preset(preset.as_deref())?;
    let project_id = active_diagnostics_project_id(&app, registry.inner())?;
    request(&app, &state, registry.inner(), "measure", None, preset, Some(&project_id))
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
