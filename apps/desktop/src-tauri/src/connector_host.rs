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
    app: &AppHandle,
    state: &ConnectorHostState,
    registry: &DesktopProjectRegistryState,
    method: &'static str,
    manual_path: Option<&str>,
    diagnostics_preset: Option<&str>,
    diagnostics_project_id: Option<&str>,
) -> Result<Value, String> {
    let scope = active_project_scope(app, registry)?;
    let mut guard = state.process.lock().map_err(|_| "Connector host state lock is poisoned.".to_owned())?;
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
