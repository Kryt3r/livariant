use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{Manager, State};
use uuid::Uuid;

const REGISTRY_SCHEMA_VERSION: u32 = 1;
const PROJECTS_DIR: &str = "projects";
const REGISTRY_FILE: &str = "registry.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum DesktopProjectRegistrationState {
    Registered,
    Detached,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct DesktopProjectRecord {
    desktop_project_id: String,
    display_name: String,
    local_root: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    project_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stable_project_identity: Option<String>,
    state: DesktopProjectRegistrationState,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct DesktopProjectRegistry {
    schema_version: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_active_desktop_project_id: Option<String>,
    projects: Vec<DesktopProjectRecord>,
}

impl Default for DesktopProjectRegistry {
    fn default() -> Self {
        Self {
            schema_version: REGISTRY_SCHEMA_VERSION,
            last_active_desktop_project_id: None,
            projects: Vec::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub(crate) struct ActiveProjectScope {
    pub(crate) generation: u64,
    pub(crate) desktop_project_id: String,
    pub(crate) local_root: PathBuf,
    pub(crate) state_root: PathBuf,
}

#[derive(Debug, Default)]
struct ActiveProjectRuntime {
    generation: u64,
    active: Option<ActiveProjectScope>,
}

#[derive(Debug, Default)]
pub struct DesktopProjectRegistryState {
    runtime: Mutex<ActiveProjectRuntime>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProjectRegisterInput {
    local_root: String,
    display_name: Option<String>,
    project_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProjectEntrySnapshot {
    desktop_project_id: String,
    display_name: String,
    local_root: String,
    project_id: Option<String>,
    stable_project_identity: Option<String>,
    state: &'static str,
    availability: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveDesktopProjectSnapshot {
    desktop_project_id: String,
    generation: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProjectRegistrySnapshot {
    schema_version: u32,
    projects: Vec<DesktopProjectEntrySnapshot>,
    active: Option<ActiveDesktopProjectSnapshot>,
    boundaries: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProjectMutationResult {
    state: &'static str,
    created: bool,
    snapshot: DesktopProjectRegistrySnapshot,
    boundaries: serde_json::Value,
}

fn boundaries() -> serde_json::Value {
    serde_json::json!({
        "registryIsProjectTruth": false,
        "registryGrantsAuthority": false,
        "activationGrantsAuthority": false,
        "changesProjectOwnedFiles": false,
        "deletesRepositories": false,
        "deletesLocalCheckouts": false,
        "performsSemanticApply": false
    })
}

fn normalized_optional(value: Option<&str>, field: &str, max: usize) -> Result<Option<String>, String> {
    match value.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => {
            if value.chars().count() > max {
                return Err(format!("{field} exceeds the supported length."));
            }
            Ok(Some(value.to_owned()))
        }
        None => Ok(None),
    }
}

fn normalized_display_name(value: Option<&str>, local_root: &Path) -> Result<String, String> {
    if let Some(value) = normalized_optional(value, "displayName", 160)? {
        return Ok(value);
    }
    let fallback = local_root
        .file_name()
        .and_then(|value| value.to_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("Project");
    if fallback.chars().count() > 160 {
        return Err("Derived project display name exceeds the supported length.".to_owned());
    }
    Ok(fallback.to_owned())
}

fn canonical_uuid(value: &str, field: &str) -> Result<String, String> {
    let trimmed = value.trim();
    let parsed = Uuid::parse_str(trimmed).map_err(|_| format!("{field} must be a canonical UUID."))?;
    let canonical = parsed.hyphenated().to_string();
    if canonical != trimmed {
        return Err(format!("{field} must use canonical lowercase UUID form."));
    }
    Ok(canonical)
}

fn path_for_storage(path: &Path) -> String {
    let raw = path.to_string_lossy();
    #[cfg(target_os = "windows")]
    {
        if let Some(rest) = raw.strip_prefix(r"\\?\UNC\") {
            return format!(r"\\{rest}");
        }
        if let Some(rest) = raw.strip_prefix(r"\\?\") {
            return rest.to_owned();
        }
    }
    raw.to_string()
}

fn path_key(value: &str) -> String {
    #[cfg(target_os = "windows")]
    {
        return value.replace('/', "\\").to_ascii_lowercase();
    }
    #[cfg(not(target_os = "windows"))]
    {
        value.to_owned()
    }
}

fn canonical_local_root(value: &str) -> Result<PathBuf, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("Project localRoot must not be empty.".to_owned());
    }
    if trimmed.chars().count() > 4096 {
        return Err("Project localRoot exceeds the supported length.".to_owned());
    }
    let canonical = fs::canonicalize(trimmed)
        .map_err(|error| format!("Project localRoot could not be resolved: {error}"))?;
    let metadata = fs::metadata(&canonical)
        .map_err(|error| format!("Project localRoot could not be inspected: {error}"))?;
    if !metadata.is_dir() {
        return Err("Project localRoot must resolve to a directory.".to_owned());
    }
    Ok(canonical)
}

fn projects_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?
        .join(PROJECTS_DIR))
}

fn registry_path(projects_root: &Path) -> PathBuf {
    projects_root.join(REGISTRY_FILE)
}

fn registry_backup_path(projects_root: &Path) -> PathBuf {
    projects_root.join("registry.json.bak")
}

fn ensure_projects_root(projects_root: &Path, create: bool) -> Result<bool, String> {
    match fs::symlink_metadata(projects_root) {
        Ok(metadata) => {
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err("Desktop project registry root must be a real non-symbolic-link directory.".to_owned());
            }
            Ok(true)
        }
        Err(error) if error.kind() == ErrorKind::NotFound && !create => Ok(false),
        Err(error) if error.kind() == ErrorKind::NotFound => {
            fs::create_dir_all(projects_root)
                .map_err(|error| format!("Desktop project registry directory could not be prepared: {error}"))?;
            let metadata = fs::symlink_metadata(projects_root)
                .map_err(|error| format!("Desktop project registry directory could not be inspected: {error}"))?;
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err("Desktop project registry root must be a real non-symbolic-link directory.".to_owned());
            }
            Ok(true)
        }
        Err(error) => Err(format!("Desktop project registry directory could not be inspected: {error}")),
    }
}

fn regular_file_exists(path: &Path, label: &str) -> Result<bool, String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            if !metadata.is_file() || metadata.file_type().is_symlink() {
                return Err(format!("{label} must be a real non-symbolic-link file."));
            }
            Ok(true)
        }
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(false),
        Err(error) => Err(format!("{label} could not be inspected: {error}")),
    }
}

fn project_state_root(projects_root: &Path, desktop_project_id: &str) -> Result<PathBuf, String> {
    let canonical = canonical_uuid(desktop_project_id, "desktopProjectId")?;
    Ok(projects_root.join(canonical))
}

fn validate_registry(registry: &DesktopProjectRegistry) -> Result<(), String> {
    if registry.schema_version != REGISTRY_SCHEMA_VERSION {
        return Err(format!(
            "Desktop project registry schema {} is unsupported.",
            registry.schema_version
        ));
    }

    let mut ids = HashSet::new();
    let mut registered_roots = HashSet::new();
    for (index, project) in registry.projects.iter().enumerate() {
        let id = canonical_uuid(&project.desktop_project_id, &format!("projects[{index}].desktopProjectId"))?;
        if !ids.insert(id.clone()) {
            return Err("Desktop project registry contains duplicate project identities.".to_owned());
        }
        if project.display_name.trim().is_empty() || project.display_name.chars().count() > 160 {
            return Err(format!("projects[{index}].displayName is invalid."));
        }
        if project.local_root.trim().is_empty() || project.local_root.chars().count() > 4096 {
            return Err(format!("projects[{index}].localRoot is invalid."));
        }
        if let Some(project_id) = project.project_id.as_deref() {
            normalized_optional(Some(project_id), &format!("projects[{index}].projectId"), 240)?;
        }
        if let Some(stable) = project.stable_project_identity.as_deref() {
            canonical_uuid(stable, &format!("projects[{index}].stableProjectIdentity"))?;
        }
        if project.state == DesktopProjectRegistrationState::Registered
            && !registered_roots.insert(path_key(project.local_root.trim()))
        {
            return Err("Desktop project registry contains duplicate registered local roots.".to_owned());
        }
    }

    if let Some(active) = registry.last_active_desktop_project_id.as_deref() {
        let active = canonical_uuid(active, "lastActiveDesktopProjectId")?;
        let Some(record) = registry.projects.iter().find(|project| project.desktop_project_id == active) else {
            return Err("Desktop project registry last-active identity does not exist.".to_owned());
        };
        if record.state != DesktopProjectRegistrationState::Registered {
            return Err("Desktop project registry last-active identity is detached.".to_owned());
        }
    }
    Ok(())
}

fn load_registry(projects_root: &Path) -> Result<DesktopProjectRegistry, String> {
    if !ensure_projects_root(projects_root, false)? {
        return Ok(DesktopProjectRegistry::default());
    }
    let path = registry_path(projects_root);
    let backup = registry_backup_path(projects_root);
    if !regular_file_exists(&path, "Desktop project registry")? {
        if regular_file_exists(&backup, "Desktop project registry backup")? {
            return Err("Desktop project registry recovery is required; a backup exists without a canonical registry.".to_owned());
        }
        return Ok(DesktopProjectRegistry::default());
    }
    let bytes = fs::read(&path).map_err(|error| format!("Desktop project registry could not be read: {error}"))?;
    let registry: DesktopProjectRegistry = serde_json::from_slice(&bytes)
        .map_err(|error| format!("Desktop project registry is invalid JSON: {error}"))?;
    validate_registry(&registry)?;
    Ok(registry)
}

fn write_registry(projects_root: &Path, registry: &DesktopProjectRegistry) -> Result<(), String> {
    validate_registry(registry)?;
    ensure_projects_root(projects_root, true)?;

    let target = registry_path(projects_root);
    let temp = projects_root.join(format!(".registry-{}.tmp", Uuid::new_v4()));
    let backup = registry_backup_path(projects_root);
    let serialized = serde_json::to_vec_pretty(registry)
        .map_err(|error| format!("Desktop project registry could not be serialized: {error}"))?;
    fs::write(&temp, serialized)
        .map_err(|error| format!("Desktop project registry temporary file could not be written: {error}"))?;

    let persisted: DesktopProjectRegistry = serde_json::from_slice(
        &fs::read(&temp).map_err(|error| format!("Desktop project registry temporary file could not be re-read: {error}"))?,
    ).map_err(|error| format!("Desktop project registry temporary file is invalid: {error}"))?;
    validate_registry(&persisted)?;

    if regular_file_exists(&backup, "Desktop project registry backup")? {
        fs::remove_file(&backup)
            .map_err(|error| format!("Previous Desktop project registry backup could not be removed: {error}"))?;
    }

    if regular_file_exists(&target, "Desktop project registry")? {
        fs::rename(&target, &backup)
            .map_err(|error| format!("Desktop project registry could not be checkpointed before replacement: {error}"))?;
    }

    if let Err(error) = fs::rename(&temp, &target) {
        if backup.exists() && !target.exists() {
            let _ = fs::rename(&backup, &target);
        }
        let _ = fs::remove_file(&temp);
        return Err(format!("Desktop project registry could not be committed: {error}"));
    }

    if backup.exists() {
        // The canonical registry is already committed at this point. Backup cleanup
        // must not turn a successful commit into an ambiguous reported failure.
        let _ = fs::remove_file(&backup);
    }
    Ok(())
}

fn real_state_directory(projects_root: &Path, desktop_project_id: &str, create: bool) -> Result<PathBuf, String> {
    ensure_projects_root(projects_root, create)?;
    let root = project_state_root(projects_root, desktop_project_id)?;
    match fs::symlink_metadata(&root) {
        Ok(metadata) => {
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err("Desktop project state directory must be a real non-symbolic-link directory.".to_owned());
            }
        }
        Err(error) if error.kind() == ErrorKind::NotFound && create => {
            fs::create_dir(&root)
                .map_err(|error| format!("Desktop project state directory could not be prepared: {error}"))?;
            let metadata = fs::symlink_metadata(&root)
                .map_err(|error| format!("Desktop project state directory could not be inspected: {error}"))?;
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err("Desktop project state directory must be a real non-symbolic-link directory.".to_owned());
            }
        }
        Err(error) if error.kind() == ErrorKind::NotFound => {
            return Err("Desktop project state directory is missing.".to_owned());
        }
        Err(error) => {
            return Err(format!("Desktop project state directory could not be inspected: {error}"));
        }
    }
    Ok(root)
}

fn availability(record: &DesktopProjectRecord) -> &'static str {
    if record.state == DesktopProjectRegistrationState::Detached {
        return "detached";
    }
    let Ok(canonical) = canonical_local_root(&record.local_root) else {
        return "unavailable";
    };
    if path_key(&path_for_storage(&canonical)) == path_key(record.local_root.trim()) {
        "available"
    } else {
        "unavailable"
    }
}

fn entry_snapshot(record: &DesktopProjectRecord) -> DesktopProjectEntrySnapshot {
    DesktopProjectEntrySnapshot {
        desktop_project_id: record.desktop_project_id.clone(),
        display_name: record.display_name.clone(),
        local_root: record.local_root.clone(),
        project_id: record.project_id.clone(),
        stable_project_identity: record.stable_project_identity.clone(),
        state: match record.state {
            DesktopProjectRegistrationState::Registered => "registered",
            DesktopProjectRegistrationState::Detached => "detached",
        },
        availability: availability(record),
    }
}

fn registry_snapshot(
    registry: &DesktopProjectRegistry,
    runtime: &ActiveProjectRuntime,
) -> Result<DesktopProjectRegistrySnapshot, String> {
    validate_registry(registry)?;
    if let Some(active) = runtime.active.as_ref() {
        let valid = registry.projects.iter().any(|project| {
            project.desktop_project_id == active.desktop_project_id
                && project.state == DesktopProjectRegistrationState::Registered
        });
        if !valid {
            return Err("Active Desktop project no longer matches the registered project set.".to_owned());
        }
    }

    Ok(DesktopProjectRegistrySnapshot {
        schema_version: REGISTRY_SCHEMA_VERSION,
        projects: registry.projects.iter().map(entry_snapshot).collect(),
        active: runtime.active.as_ref().map(|active| ActiveDesktopProjectSnapshot {
            desktop_project_id: active.desktop_project_id.clone(),
            generation: active.generation,
        }),
        boundaries: boundaries(),
    })
}

fn register_at(
    projects_root: &Path,
    runtime: &ActiveProjectRuntime,
    input: DesktopProjectRegisterInput,
) -> Result<DesktopProjectMutationResult, String> {
    let canonical_root = canonical_local_root(&input.local_root)?;
    let stored_root = path_for_storage(&canonical_root);
    let project_id = normalized_optional(input.project_id.as_deref(), "projectId", 240)?;
    let mut registry = load_registry(projects_root)?;

    if let Some(existing) = registry
        .projects
        .iter()
        .find(|project| path_key(project.local_root.trim()) == path_key(&stored_root))
    {
        if existing.state == DesktopProjectRegistrationState::Detached {
            return Err("This local project is detached from Livariant; explicit re-adoption is required.".to_owned());
        }
        if let (Some(existing_project_id), Some(requested_project_id)) =
            (existing.project_id.as_deref(), project_id.as_deref())
        {
            if existing_project_id != requested_project_id {
                return Err("This local project is already registered with a different logical projectId.".to_owned());
            }
        }
        return Ok(DesktopProjectMutationResult {
            state: "existing",
            created: false,
            snapshot: registry_snapshot(&registry, runtime)?,
            boundaries: boundaries(),
        });
    }

    let desktop_project_id = Uuid::new_v4().hyphenated().to_string();
    let display_name = normalized_display_name(input.display_name.as_deref(), &canonical_root)?;
    real_state_directory(projects_root, &desktop_project_id, true)?;

    registry.projects.push(DesktopProjectRecord {
        desktop_project_id,
        display_name,
        local_root: stored_root,
        project_id,
        stable_project_identity: None,
        state: DesktopProjectRegistrationState::Registered,
    });
    write_registry(projects_root, &registry)?;

    Ok(DesktopProjectMutationResult {
        state: "registered",
        created: true,
        snapshot: registry_snapshot(&registry, runtime)?,
        boundaries: boundaries(),
    })
}

fn activate_at(
    projects_root: &Path,
    runtime: &mut ActiveProjectRuntime,
    desktop_project_id: &str,
) -> Result<DesktopProjectMutationResult, String> {
    let id = canonical_uuid(desktop_project_id, "desktopProjectId")?;
    let mut registry = load_registry(projects_root)?;
    let project = registry
        .projects
        .iter()
        .find(|project| project.desktop_project_id == id)
        .cloned()
        .ok_or_else(|| "Desktop project is not registered.".to_owned())?;

    if project.state != DesktopProjectRegistrationState::Registered {
        return Err("Detached Desktop project cannot be activated.".to_owned());
    }
    if availability(&project) != "available" {
        return Err("Desktop project local root is unavailable or no longer matches its registered location.".to_owned());
    }
    let local_root = canonical_local_root(&project.local_root)?;
    let state_root = real_state_directory(projects_root, &id, false)?;
    let next_generation = runtime
        .generation
        .checked_add(1)
        .ok_or_else(|| "Desktop project activation generation is exhausted.".to_owned())?;

    registry.last_active_desktop_project_id = Some(id.clone());
    write_registry(projects_root, &registry)?;

    runtime.generation = next_generation;
    runtime.active = Some(ActiveProjectScope {
        generation: next_generation,
        desktop_project_id: id,
        local_root,
        state_root,
    });

    Ok(DesktopProjectMutationResult {
        state: "activated",
        created: false,
        snapshot: registry_snapshot(&registry, runtime)?,
        boundaries: boundaries(),
    })
}

fn rename_at(
    projects_root: &Path,
    runtime: &ActiveProjectRuntime,
    desktop_project_id: &str,
    display_name: &str,
) -> Result<DesktopProjectMutationResult, String> {
    let id = canonical_uuid(desktop_project_id, "desktopProjectId")?;
    let name = normalized_optional(Some(display_name), "displayName", 160)?
        .ok_or_else(|| "displayName must not be empty.".to_owned())?;
    let mut registry = load_registry(projects_root)?;
    let project = registry
        .projects
        .iter_mut()
        .find(|project| project.desktop_project_id == id)
        .ok_or_else(|| "Desktop project is not registered.".to_owned())?;
    project.display_name = name;
    write_registry(projects_root, &registry)?;
    Ok(DesktopProjectMutationResult {
        state: "renamed",
        created: false,
        snapshot: registry_snapshot(&registry, runtime)?,
        boundaries: boundaries(),
    })
}

fn detach_at(
    projects_root: &Path,
    runtime: &mut ActiveProjectRuntime,
    desktop_project_id: &str,
) -> Result<DesktopProjectMutationResult, String> {
    let id = canonical_uuid(desktop_project_id, "desktopProjectId")?;
    let mut registry = load_registry(projects_root)?;
    let project = registry
        .projects
        .iter_mut()
        .find(|project| project.desktop_project_id == id)
        .ok_or_else(|| "Desktop project is not registered.".to_owned())?;
    project.state = DesktopProjectRegistrationState::Detached;
    if registry.last_active_desktop_project_id.as_deref() == Some(id.as_str()) {
        registry.last_active_desktop_project_id = None;
    }

    let active_is_target = runtime
        .active
        .as_ref()
        .is_some_and(|active| active.desktop_project_id == id);
    let next_generation = if active_is_target {
        Some(
            runtime
                .generation
                .checked_add(1)
                .ok_or_else(|| "Desktop project activation generation is exhausted.".to_owned())?,
        )
    } else {
        None
    };

    write_registry(projects_root, &registry)?;

    if let Some(generation) = next_generation {
        runtime.generation = generation;
        runtime.active = None;
    }

    Ok(DesktopProjectMutationResult {
        state: "detached",
        created: false,
        snapshot: registry_snapshot(&registry, runtime)?,
        boundaries: boundaries(),
    })
}

pub(crate) fn active_project_scope(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
) -> Result<ActiveProjectScope, String> {
    let projects_root = projects_root(app)?;
    let runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    let registry = load_registry(&projects_root)?;
    let active = runtime
        .active
        .clone()
        .ok_or_else(|| "No Desktop project is currently active.".to_owned())?;
    let record = registry
        .projects
        .iter()
        .find(|project| project.desktop_project_id == active.desktop_project_id)
        .ok_or_else(|| "Active Desktop project is no longer registered.".to_owned())?;
    if record.state != DesktopProjectRegistrationState::Registered || availability(record) != "available" {
        return Err("Active Desktop project is no longer safely available.".to_owned());
    }
    let current_local_root = canonical_local_root(&record.local_root)?;
    if path_key(&path_for_storage(&current_local_root)) != path_key(&path_for_storage(&active.local_root)) {
        return Err("Active Desktop project local-root binding changed after activation.".to_owned());
    }
    let current_state_root = real_state_directory(&projects_root, &active.desktop_project_id, false)?;
    if current_state_root != active.state_root {
        return Err("Active Desktop project state-root binding changed after activation.".to_owned());
    }
    Ok(active)
}

pub(crate) fn active_generation_matches(
    state: &DesktopProjectRegistryState,
    desktop_project_id: &str,
    generation: u64,
) -> Result<bool, String> {
    let runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    Ok(runtime.active.as_ref().is_some_and(|active| {
        active.desktop_project_id == desktop_project_id && active.generation == generation
    }))
}

#[tauri::command]
pub fn desktop_project_registry_snapshot(
    app: tauri::AppHandle,
    state: State<'_, DesktopProjectRegistryState>,
) -> Result<DesktopProjectRegistrySnapshot, String> {
    let projects_root = projects_root(&app)?;
    let runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    let registry = load_registry(&projects_root)?;
    registry_snapshot(&registry, &runtime)
}

#[tauri::command]
pub fn desktop_project_register(
    app: tauri::AppHandle,
    state: State<'_, DesktopProjectRegistryState>,
    input: DesktopProjectRegisterInput,
) -> Result<DesktopProjectMutationResult, String> {
    let projects_root = projects_root(&app)?;
    let runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    register_at(&projects_root, &runtime, input)
}

#[tauri::command]
pub fn desktop_project_activate(
    app: tauri::AppHandle,
    state: State<'_, DesktopProjectRegistryState>,
    desktop_project_id: String,
) -> Result<DesktopProjectMutationResult, String> {
    let projects_root = projects_root(&app)?;
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    activate_at(&projects_root, &mut runtime, &desktop_project_id)
}

#[tauri::command]
pub fn desktop_project_rename(
    app: tauri::AppHandle,
    state: State<'_, DesktopProjectRegistryState>,
    desktop_project_id: String,
    display_name: String,
) -> Result<DesktopProjectMutationResult, String> {
    let projects_root = projects_root(&app)?;
    let runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    rename_at(&projects_root, &runtime, &desktop_project_id, &display_name)
}

#[tauri::command]
pub fn desktop_project_detach(
    app: tauri::AppHandle,
    state: State<'_, DesktopProjectRegistryState>,
    desktop_project_id: String,
) -> Result<DesktopProjectMutationResult, String> {
    let projects_root = projects_root(&app)?;
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    detach_at(&projects_root, &mut runtime, &desktop_project_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn test_root(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "livariant-desktop-project-registry-{name}-{}",
            Uuid::new_v4()
        ))
    }

    fn project(root: &Path, name: &str) -> PathBuf {
        let path = root.join(name);
        fs::create_dir_all(&path).expect("create project");
        path
    }

    fn register_input(local_root: &Path, display_name: Option<&str>) -> DesktopProjectRegisterInput {
        DesktopProjectRegisterInput {
            local_root: local_root.to_string_lossy().to_string(),
            display_name: display_name.map(str::to_owned),
            project_id: Some("logical-project".to_owned()),
        }
    }

    #[test]
    fn registers_distinct_projects_with_distinct_machine_local_identity() {
        let root = test_root("distinct");
        let projects = root.join("app-data").join("projects");
        let one = project(&root, "one");
        let two = project(&root, "two");
        let runtime = ActiveProjectRuntime::default();

        let first = register_at(&projects, &runtime, register_input(&one, Some("Same name"))).expect("register one");
        let second = register_at(&projects, &runtime, register_input(&two, Some("Same name"))).expect("register two");

        assert!(first.created);
        assert!(second.created);
        let registry = load_registry(&projects).expect("registry");
        assert_eq!(registry.projects.len(), 2);
        assert_ne!(registry.projects[0].desktop_project_id, registry.projects[1].desktop_project_id);
        assert_eq!(registry.projects[0].display_name, registry.projects[1].display_name);
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn same_physical_root_returns_existing_registration_instead_of_duplicate() {
        let root = test_root("duplicate-root");
        let projects = root.join("app-data").join("projects");
        let local = project(&root, "one");
        let runtime = ActiveProjectRuntime::default();

        let first = register_at(&projects, &runtime, register_input(&local, None)).expect("first");
        let second = register_at(&projects, &runtime, register_input(&local, Some("Other label"))).expect("second");

        assert!(first.created);
        assert!(!second.created);
        assert_eq!(load_registry(&projects).expect("registry").projects.len(), 1);
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn rename_changes_display_name_only() {
        let root = test_root("rename");
        let projects = root.join("app-data").join("projects");
        let local = project(&root, "one");
        let runtime = ActiveProjectRuntime::default();
        register_at(&projects, &runtime, register_input(&local, Some("Before"))).expect("register");
        let before = load_registry(&projects).expect("before").projects[0].clone();

        rename_at(&projects, &runtime, &before.desktop_project_id, "After").expect("rename");
        let after = load_registry(&projects).expect("after").projects[0].clone();

        assert_eq!(after.display_name, "After");
        assert_eq!(after.desktop_project_id, before.desktop_project_id);
        assert_eq!(after.local_root, before.local_root);
        assert_eq!(after.project_id, before.project_id);
        assert_eq!(after.stable_project_identity, before.stable_project_identity);
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn activation_advances_generation_and_failed_target_keeps_previous_binding() {
        let root = test_root("activation");
        let projects = root.join("app-data").join("projects");
        let one = project(&root, "one");
        let two = project(&root, "two");
        let mut runtime = ActiveProjectRuntime::default();
        register_at(&projects, &runtime, register_input(&one, Some("One"))).expect("register one");
        register_at(&projects, &runtime, register_input(&two, Some("Two"))).expect("register two");
        let registry = load_registry(&projects).expect("registry");
        let one_id = registry.projects[0].desktop_project_id.clone();
        let two_id = registry.projects[1].desktop_project_id.clone();

        activate_at(&projects, &mut runtime, &one_id).expect("activate one");
        let first_generation = runtime.active.as_ref().expect("active one").generation;
        activate_at(&projects, &mut runtime, &two_id).expect("activate two");
        let second_generation = runtime.active.as_ref().expect("active two").generation;
        assert!(second_generation > first_generation);

        fs::remove_dir_all(&two).expect("remove target");
        let error = activate_at(&projects, &mut runtime, &two_id).expect_err("unavailable activation rejected");
        assert!(error.contains("unavailable"));
        assert_eq!(runtime.active.as_ref().expect("previous remains").desktop_project_id, two_id);
        assert_eq!(runtime.active.as_ref().expect("previous remains").generation, second_generation);
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn activation_of_unavailable_other_target_does_not_relabel_current_project() {
        let root = test_root("failed-switch");
        let projects = root.join("app-data").join("projects");
        let one = project(&root, "one");
        let two = project(&root, "two");
        let mut runtime = ActiveProjectRuntime::default();
        register_at(&projects, &runtime, register_input(&one, Some("One"))).expect("register one");
        register_at(&projects, &runtime, register_input(&two, Some("Two"))).expect("register two");
        let registry = load_registry(&projects).expect("registry");
        let one_id = registry.projects[0].desktop_project_id.clone();
        let two_id = registry.projects[1].desktop_project_id.clone();
        activate_at(&projects, &mut runtime, &one_id).expect("activate one");
        let generation = runtime.active.as_ref().expect("active").generation;

        fs::remove_dir_all(&two).expect("remove target");
        assert!(activate_at(&projects, &mut runtime, &two_id).is_err());
        let active = runtime.active.as_ref().expect("one stays active");
        assert_eq!(active.desktop_project_id, one_id);
        assert_eq!(active.generation, generation);
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn detach_invalidates_active_generation_without_deleting_project_files() {
        let root = test_root("detach");
        let projects = root.join("app-data").join("projects");
        let local = project(&root, "one");
        let marker = local.join("user-file.txt");
        let mut file = fs::File::create(&marker).expect("marker");
        writeln!(file, "keep").expect("write marker");

        let mut runtime = ActiveProjectRuntime::default();
        register_at(&projects, &runtime, register_input(&local, Some("One"))).expect("register");
        let id = load_registry(&projects).expect("registry").projects[0].desktop_project_id.clone();
        activate_at(&projects, &mut runtime, &id).expect("activate");
        let generation = runtime.active.as_ref().expect("active").generation;

        detach_at(&projects, &mut runtime, &id).expect("detach");
        assert!(runtime.active.is_none());
        assert!(runtime.generation > generation);
        assert!(marker.is_file());
        assert!(project_state_root(&projects, &id).expect("state root").is_dir());
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn stale_generation_check_distinguishes_old_activation() {
        let root = test_root("generation-check");
        let projects = root.join("app-data").join("projects");
        let local = project(&root, "one");
        let mut runtime = ActiveProjectRuntime::default();
        let state = DesktopProjectRegistryState::default();

        register_at(&projects, &runtime, register_input(&local, Some("One"))).expect("register");
        let id = load_registry(&projects).expect("registry").projects[0].desktop_project_id.clone();
        activate_at(&projects, &mut runtime, &id).expect("activate");
        let first = runtime.active.as_ref().expect("active").generation;

        {
            let mut guard = state.runtime.lock().expect("lock");
            *guard = runtime;
        }
        assert!(active_generation_matches(&state, &id, first).expect("match"));

        {
            let mut guard = state.runtime.lock().expect("lock");
            guard.generation += 1;
            let generation = guard.generation;
            guard.active.as_mut().expect("active").generation = generation;
        }
        assert!(!active_generation_matches(&state, &id, first).expect("stale mismatch"));
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn duplicate_root_with_conflicting_logical_project_id_fails_closed() {
        let root = test_root("duplicate-project-id");
        let projects = root.join("app-data").join("projects");
        let local = project(&root, "one");
        let runtime = ActiveProjectRuntime::default();
        register_at(&projects, &runtime, register_input(&local, Some("One"))).expect("register");

        let conflicting = DesktopProjectRegisterInput {
            local_root: local.to_string_lossy().to_string(),
            display_name: Some("One".to_owned()),
            project_id: Some("different-project".to_owned()),
        };
        assert!(register_at(&projects, &runtime, conflicting).is_err());
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[cfg(unix)]
    #[test]
    fn symlinked_registry_file_is_rejected() {
        use std::os::unix::fs::symlink;

        let root = test_root("registry-symlink");
        let projects = root.join("app-data").join("projects");
        fs::create_dir_all(&projects).expect("projects root");
        let outside = root.join("outside-registry.json");
        fs::write(&outside, br#"{"schemaVersion":1,"projects":[]}"#).expect("outside registry");
        symlink(&outside, registry_path(&projects)).expect("registry symlink");

        let error = load_registry(&projects).expect_err("symlink rejected");
        assert!(error.contains("non-symbolic-link"));
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[cfg(unix)]
    #[test]
    fn symlinked_projects_root_is_rejected() {
        use std::os::unix::fs::symlink;

        let root = test_root("projects-root-symlink");
        let app_data = root.join("app-data");
        let outside = root.join("outside-projects");
        fs::create_dir_all(&app_data).expect("app data");
        fs::create_dir_all(&outside).expect("outside");
        let projects = app_data.join("projects");
        symlink(&outside, &projects).expect("projects root symlink");

        let error = load_registry(&projects).expect_err("symlink root rejected");
        assert!(error.contains("non-symbolic-link"));
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn corrupt_registry_with_duplicate_identity_fails_closed() {
        let root = test_root("corrupt");
        let projects = root.join("app-data").join("projects");
        fs::create_dir_all(&projects).expect("projects root");
        let id = Uuid::new_v4().hyphenated().to_string();
        let local = project(&root, "one");
        let local_root = path_for_storage(&fs::canonicalize(&local).expect("canonical"));
        let raw = serde_json::json!({
            "schemaVersion": 1,
            "lastActiveDesktopProjectId": null,
            "projects": [
                {"desktopProjectId": id, "displayName": "One", "localRoot": local_root, "state": "registered"},
                {"desktopProjectId": id, "displayName": "Two", "localRoot": local_root, "state": "registered"}
            ]
        });
        fs::write(registry_path(&projects), serde_json::to_vec_pretty(&raw).expect("serialize")).expect("write");

        assert!(load_registry(&projects).is_err());
        fs::remove_dir_all(&root).expect("cleanup");
    }
}
