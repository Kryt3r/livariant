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
const PROJECT_BRAIN_METADATA_MAX_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum DesktopProjectRegistrationState {
    Registered,
    Detached,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum LegacyMigrationState {
    #[default]
    Pending,
    NotNeeded,
    Complete,
    RecoveryRequired,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
struct LegacyMigrationRecord {
    state: LegacyMigrationState,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_fingerprint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<String>,
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
    #[serde(default)]
    legacy_migration: LegacyMigrationRecord,
}

impl Default for DesktopProjectRegistry {
    fn default() -> Self {
        Self {
            schema_version: REGISTRY_SCHEMA_VERSION,
            last_active_desktop_project_id: None,
            projects: Vec::new(),
            legacy_migration: LegacyMigrationRecord::default(),
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

#[derive(Debug, Clone)]
pub(crate) enum ProjectPersistenceScope {
    Active(ActiveProjectScope),
    LegacySingleProject,
}

impl ProjectPersistenceScope {
    pub(crate) fn is_project_namespaced(&self) -> bool {
        matches!(self, Self::Active(_))
    }
}

#[derive(Debug, Default)]
struct ActiveProjectRuntime {
    generation: u64,
    active: Option<ActiveProjectScope>,
    startup_recovery: Option<String>,
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
    legacy_migration: LegacyMigrationRecord,
    startup_recovery: Option<String>,
    boundaries: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderProjectDescriptor {
    pub(crate) desktop_project_id: String,
    pub(crate) local_root: String,
    pub(crate) project_id: Option<String>,
    pub(crate) stable_project_identity: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProjectMutationResult {
    state: &'static str,
    created: bool,
    snapshot: DesktopProjectRegistrySnapshot,
    boundaries: serde_json::Value,
}

#[derive(Debug, Clone)]
pub(crate) struct LegacyMigrationStatus {
    pub(crate) state: LegacyMigrationState,
    pub(crate) source_fingerprint: Option<String>,
    pub(crate) project_count: usize,
}

#[derive(Debug, Clone)]
pub(crate) struct LegacyMigrationImport {
    pub(crate) desktop_project_id: String,
    pub(crate) local_root: String,
    pub(crate) project_id: Option<String>,
    pub(crate) stable_project_identity: Option<String>,
    pub(crate) source_fingerprint: String,
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

    match registry.legacy_migration.state {
        LegacyMigrationState::Pending | LegacyMigrationState::NotNeeded => {
            if registry.legacy_migration.source_fingerprint.is_some() || registry.legacy_migration.detail.is_some() {
                return Err("Desktop project registry legacy migration metadata is inconsistent.".to_owned());
            }
        }
        LegacyMigrationState::Complete => {
            let fingerprint = registry
                .legacy_migration
                .source_fingerprint
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty() && value.len() <= 128)
                .ok_or_else(|| "Completed legacy migration requires a bounded source fingerprint.".to_owned())?;
            if fingerprint.len() > 128 || registry.legacy_migration.detail.is_some() {
                return Err("Completed legacy migration metadata is invalid.".to_owned());
            }
            if registry.projects.is_empty() {
                return Err("Completed legacy migration requires a registered Desktop project.".to_owned());
            }
        }
        LegacyMigrationState::RecoveryRequired => {
            if let Some(fingerprint) = registry.legacy_migration.source_fingerprint.as_deref() {
                let fingerprint = fingerprint.trim();
                if fingerprint.is_empty() || fingerprint.len() > 128 {
                    return Err("Legacy migration recovery fingerprint is invalid.".to_owned());
                }
            }
            let detail = registry
                .legacy_migration
                .detail
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty() && value.chars().count() <= 512)
                .ok_or_else(|| "Legacy migration recovery requires a bounded detail.".to_owned())?;
            if detail.chars().count() > 512 {
                return Err("Legacy migration recovery detail is invalid.".to_owned());
            }
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

fn has_orphan_project_namespace(projects_root: &Path) -> Result<bool, String> {
    for entry in fs::read_dir(projects_root)
        .map_err(|error| format!("Desktop project registry directory could not be enumerated: {error}"))?
    {
        let entry = entry.map_err(|error| format!("Desktop project registry entry could not be inspected: {error}"))?;
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else { continue; };
        if canonical_uuid(&name, "project namespace").is_err() {
            continue;
        }
        let metadata = fs::symlink_metadata(entry.path())
            .map_err(|error| format!("Desktop project namespace could not be inspected: {error}"))?;
        if metadata.is_dir() || metadata.file_type().is_symlink() {
            return Ok(true);
        }
    }
    Ok(false)
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
        if has_orphan_project_namespace(projects_root)? {
            return Err("Desktop project registry recovery is required; project state exists without a canonical registry.".to_owned());
        }
        return Ok(DesktopProjectRegistry::default());
    }
    let bytes = fs::read(&path).map_err(|error| format!("Desktop project registry could not be read: {error}"))?;
    let registry: DesktopProjectRegistry = serde_json::from_slice(&bytes)
        .map_err(|error| format!("Desktop project registry is invalid JSON: {error}"))?;
    validate_registry(&registry)?;
    Ok(registry)
}

fn load_registry_for_legacy_finalize(
    projects_root: &Path,
    expected_desktop_project_id: &str,
) -> Result<DesktopProjectRegistry, String> {
    let expected = canonical_uuid(expected_desktop_project_id, "desktopProjectId")?;
    if !ensure_projects_root(projects_root, false)? {
        return Ok(DesktopProjectRegistry::default());
    }

    let path = registry_path(projects_root);
    let backup = registry_backup_path(projects_root);
    if regular_file_exists(&path, "Desktop project registry")? {
        return load_registry(projects_root);
    }
    if regular_file_exists(&backup, "Desktop project registry backup")? {
        return Err("Desktop project registry recovery is required; a backup exists without a canonical registry.".to_owned());
    }

    let mut observed_expected = false;
    for entry in fs::read_dir(projects_root)
        .map_err(|error| format!("Desktop project registry directory could not be enumerated: {error}"))?
    {
        let entry = entry.map_err(|error| format!("Desktop project registry entry could not be inspected: {error}"))?;
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        if canonical_uuid(&name, "project namespace").is_err() {
            continue;
        }
        let metadata = fs::symlink_metadata(entry.path())
            .map_err(|error| format!("Desktop project namespace could not be inspected: {error}"))?;
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err("Desktop project namespace must be a real non-symbolic-link directory.".to_owned());
        }
        if name != expected || observed_expected {
            return Err("Desktop project registry recovery is required; unexpected project state exists before legacy migration finalization.".to_owned());
        }
        observed_expected = true;
    }

    if !observed_expected {
        return Err("Legacy migration finalization expected a committed project namespace, but none was found.".to_owned());
    }
    Ok(DesktopProjectRegistry::default())
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
        legacy_migration: registry.legacy_migration.clone(),
        startup_recovery: runtime.startup_recovery.clone(),
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

    if let Some(existing_index) = registry
        .projects
        .iter()
        .position(|project| path_key(project.local_root.trim()) == path_key(&stored_root))
    {
        let existing = registry.projects[existing_index].clone();
        if let (Some(existing_project_id), Some(requested_project_id)) =
            (existing.project_id.as_deref(), project_id.as_deref())
        {
            if existing_project_id != requested_project_id {
                return Err("This local project is already registered with a different logical projectId.".to_owned());
            }
        }
        if existing.state == DesktopProjectRegistrationState::Detached {
            let display_name = normalized_display_name(input.display_name.as_deref(), &canonical_root)?;
            let project = &mut registry.projects[existing_index];
            project.state = DesktopProjectRegistrationState::Registered;
            project.display_name = display_name;
            if project.project_id.is_none() {
                project.project_id = project_id;
            }
            real_state_directory(projects_root, &project.desktop_project_id, false)?;
            write_registry(projects_root, &registry)?;
            return Ok(DesktopProjectMutationResult {
                state: "registered",
                created: false,
                snapshot: registry_snapshot(&registry, runtime)?,
                boundaries: boundaries(),
            });
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
    let state_root = real_state_directory(projects_root, &desktop_project_id, true)?;

    registry.projects.push(DesktopProjectRecord {
        desktop_project_id,
        display_name,
        local_root: stored_root,
        project_id,
        stable_project_identity: None,
        state: DesktopProjectRegistrationState::Registered,
    });
    if let Err(error) = write_registry(projects_root, &registry) {
        // This directory belongs to the just-created machine-local registration.
        // Remove it only while it is still empty. If cleanup itself cannot be
        // proven safe, the orphan namespace remains visible to recovery checks.
        let _ = fs::remove_dir(&state_root);
        return Err(error);
    }

    Ok(DesktopProjectMutationResult {
        state: "registered",
        created: true,
        snapshot: registry_snapshot(&registry, runtime)?,
        boundaries: boundaries(),
    })
}

fn registered_project_roots(
    projects_root: &Path,
    desktop_project_id: &str,
) -> Result<(PathBuf, PathBuf), String> {
    let id = canonical_uuid(desktop_project_id, "desktopProjectId")?;
    let registry = load_registry(projects_root)?;
    let project = registry
        .projects
        .iter()
        .find(|project| project.desktop_project_id == id)
        .ok_or_else(|| "Desktop project is not registered.".to_owned())?;
    if project.state != DesktopProjectRegistrationState::Registered {
        return Err("Detached Desktop project cannot be activated.".to_owned());
    }
    if availability(project) != "available" {
        return Err("Desktop project local root is unavailable or no longer matches its registered location.".to_owned());
    }
    let local_root = canonical_local_root(&project.local_root)?;
    let state_root = real_state_directory(projects_root, &id, false)?;
    Ok((local_root, state_root))
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

#[cfg(feature = "ci-multi-project-acceptance")]
pub(crate) fn ci_register_project(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
    local_root: &Path,
    display_name: &str,
    project_id: &str,
) -> Result<String, String> {
    let projects_root = projects_root(app)?;
    let runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    let result = register_at(
        &projects_root,
        &runtime,
        DesktopProjectRegisterInput {
            local_root: local_root.to_string_lossy().to_string(),
            display_name: Some(display_name.to_owned()),
            project_id: Some(project_id.to_owned()),
        },
    )?;
    let canonical_root = canonical_local_root(&local_root.to_string_lossy())?;
    let stored_root = path_for_storage(&canonical_root);
    let registry = load_registry(&projects_root)?;
    registry
        .projects
        .iter()
        .find(|project| path_key(project.local_root.trim()) == path_key(&stored_root))
        .map(|project| project.desktop_project_id.clone())
        .ok_or_else(|| "CI project registration completed without a discoverable Desktop project identity.".to_owned())
}

#[cfg(feature = "ci-multi-project-acceptance")]
pub(crate) fn ci_activate_project(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
    desktop_project_id: &str,
) -> Result<ActiveProjectScope, String> {
    let projects_root = projects_root(app)?;
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    activate_at(&projects_root, &mut runtime, desktop_project_id)?;
    runtime
        .active
        .clone()
        .ok_or_else(|| "CI project activation did not produce an active Desktop project.".to_owned())
}

#[cfg(feature = "ci-multi-project-acceptance")]
pub(crate) fn ci_detach_project(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
    desktop_project_id: &str,
) -> Result<(), String> {
    let projects_root = projects_root(app)?;
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    detach_at(&projects_root, &mut runtime, desktop_project_id)?;
    Ok(())
}

#[cfg(feature = "ci-multi-project-acceptance")]
pub(crate) fn ci_project_state_root(
    app: &tauri::AppHandle,
    desktop_project_id: &str,
) -> Result<PathBuf, String> {
    let projects_root = projects_root(app)?;
    real_state_directory(&projects_root, desktop_project_id, false)
}

pub(crate) fn registered_provider_projects(
    app: &tauri::AppHandle,
) -> Result<Vec<ProviderProjectDescriptor>, String> {
    let projects_root = projects_root(app)?;
    let registry = load_registry(&projects_root)?;
    let mut projects = Vec::new();
    for project in registry.projects {
        if project.state != DesktopProjectRegistrationState::Registered || availability(&project) != "available" {
            continue;
        }
        let local_root = canonical_local_root(&project.local_root)?;
        projects.push(ProviderProjectDescriptor {
            desktop_project_id: project.desktop_project_id,
            local_root: path_for_storage(&local_root),
            project_id: project.project_id,
            stable_project_identity: project.stable_project_identity,
        });
    }
    Ok(projects)
}

fn observed_machine_local_stable_project_identity(
    projects_root: &Path,
    desktop_project_id: &str,
) -> Result<Option<String>, String> {
    let state_root = project_state_root(projects_root, desktop_project_id)?;
    let brain_root = state_root.join(".project-brain");
    let brain_metadata = match fs::symlink_metadata(&brain_root) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Machine-local Project Brain could not be inspected for Diagnostics: {error}")),
    };
    if !brain_metadata.is_dir() || brain_metadata.file_type().is_symlink() {
        return Err("Machine-local Project Brain must be a real non-symbolic-link directory for Diagnostics.".to_owned());
    }

    let metadata_path = brain_root.join("metadata.json");
    let metadata = match fs::symlink_metadata(&metadata_path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Machine-local Project Brain metadata could not be inspected for Diagnostics: {error}")),
    };
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("Machine-local Project Brain metadata must be a real non-symbolic-link file for Diagnostics.".to_owned());
    }
    if metadata.len() > PROJECT_BRAIN_METADATA_MAX_BYTES {
        return Err("Machine-local Project Brain metadata exceeds the Diagnostics identity size bound.".to_owned());
    }

    let value: serde_json::Value = serde_json::from_slice(
        &fs::read(&metadata_path)
            .map_err(|error| format!("Machine-local Project Brain metadata could not be read for Diagnostics: {error}"))?,
    )
    .map_err(|error| format!("Machine-local Project Brain metadata is invalid JSON: {error}"))?;
    let project_brain = value
        .get("projectBrain")
        .and_then(serde_json::Value::as_object)
        .ok_or_else(|| "Machine-local Project Brain metadata omits projectBrain.".to_owned())?;
    if project_brain.get("schemaVersion").and_then(serde_json::Value::as_u64) != Some(2) {
        return Ok(None);
    }
    let project_id = project_brain
        .get("projectId")
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| "Schema-2 machine-local Project Brain metadata omits stable project identity.".to_owned())?;
    Ok(Some(canonical_uuid(project_id, "stableProjectIdentity")?))
}

fn bind_stable_project_identity_at(
    projects_root: &Path,
    desktop_project_id: &str,
    stable_project_identity: &str,
) -> Result<(), String> {
    let id = canonical_uuid(desktop_project_id, "desktopProjectId")?;
    let stable = canonical_uuid(stable_project_identity, "stableProjectIdentity")?;
    let mut registry = load_registry(projects_root)?;
    let project = registry
        .projects
        .iter_mut()
        .find(|project| project.desktop_project_id == id)
        .ok_or_else(|| "Desktop project is not registered.".to_owned())?;
    match project.stable_project_identity.as_deref() {
        Some(existing) if existing != stable => {
            return Err("Desktop project registry stable identity conflicts with the machine-local Project Brain.".to_owned());
        }
        Some(_) => return Ok(()),
        None => project.stable_project_identity = Some(stable),
    }
    write_registry(projects_root, &registry)
}

fn diagnostics_project_id(
    projects_root: &Path,
    record: &DesktopProjectRecord,
) -> Result<String, String> {
    if let Some(project_id) = record
        .project_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        if project_id.chars().count() > 240 {
            return Err("Active Desktop project projectId exceeds the supported Diagnostics scope length.".to_owned());
        }
        return Ok(project_id.to_owned());
    }

    if let Some(stable) = record.stable_project_identity.as_deref() {
        return canonical_uuid(stable, "stableProjectIdentity");
    }

    if let Some(stable) = observed_machine_local_stable_project_identity(projects_root, &record.desktop_project_id)? {
        return Ok(stable);
    }

    Err("Project-focused Diagnostics is unavailable because the active Desktop project has neither a logical projectId nor a stable Project Brain identity.".to_owned())
}

pub(crate) fn active_diagnostics_project_id(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
) -> Result<String, String> {
    let projects_root = projects_root(app)?;
    let runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    if let Some(recovery) = runtime.startup_recovery.as_deref() {
        return Err(format!("Desktop project recovery is required: {recovery}"));
    }
    let registry = load_registry(&projects_root)?;
    let active = runtime
        .active
        .as_ref()
        .ok_or_else(|| "Project-focused Diagnostics requires an active Desktop project.".to_owned())?;
    let record = registry
        .projects
        .iter()
        .find(|project| project.desktop_project_id == active.desktop_project_id)
        .ok_or_else(|| "Active Desktop project is no longer registered.".to_owned())?;
    if record.state != DesktopProjectRegistrationState::Registered || availability(record) != "available" {
        return Err("Active Desktop project is no longer safely available for Diagnostics.".to_owned());
    }
    diagnostics_project_id(&projects_root, record)
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

pub(crate) fn project_persistence_scope(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
) -> Result<ProjectPersistenceScope, String> {
    let projects_root = projects_root(app)?;
    let runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    if let Some(recovery) = runtime.startup_recovery.as_deref() {
        return Err(format!("Desktop project recovery is required: {recovery}"));
    }
    let registry = load_registry(&projects_root)?;

    if let Some(active) = runtime.active.clone() {
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
        return Ok(ProjectPersistenceScope::Active(active));
    }

    if registry.projects.is_empty()
        && matches!(
            registry.legacy_migration.state,
            LegacyMigrationState::Pending | LegacyMigrationState::NotNeeded
        )
    {
        return Ok(ProjectPersistenceScope::LegacySingleProject);
    }

    Err(match registry.legacy_migration.state {
        LegacyMigrationState::Complete => {
            "Legacy singleton persistence is disabled after completed migration; no Desktop project is active.".to_owned()
        }
        LegacyMigrationState::RecoveryRequired => {
            registry
                .legacy_migration
                .detail
                .clone()
                .unwrap_or_else(|| "Legacy migration recovery is required before project-scoped persistence can continue.".to_owned())
        }
        LegacyMigrationState::Pending | LegacyMigrationState::NotNeeded => {
            "Desktop projects are registered, but no project is active; project-scoped persistence is unavailable.".to_owned()
        }
    })
}

fn persistence_scope_matches_runtime(
    registry: &DesktopProjectRegistry,
    runtime: &ActiveProjectRuntime,
    scope: &ProjectPersistenceScope,
) -> bool {
    match scope {
        ProjectPersistenceScope::Active(expected) => {
            runtime.active.as_ref().is_some_and(|current| {
                current.desktop_project_id == expected.desktop_project_id
                    && current.generation == expected.generation
            }) && registry.projects.iter().any(|project| {
                project.desktop_project_id == expected.desktop_project_id
                    && project.state == DesktopProjectRegistrationState::Registered
            })
        }
        ProjectPersistenceScope::LegacySingleProject => {
            runtime.active.is_none() && registry.projects.is_empty()
        }
    }
}

pub(crate) fn with_project_persistence_scope_current<T>(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
    scope: &ProjectPersistenceScope,
    operation: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    let projects_root = projects_root(app)?;
    let runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    let registry = load_registry(&projects_root)?;

    if !persistence_scope_matches_runtime(&registry, &runtime, scope) {
        return Err(match scope {
            ProjectPersistenceScope::Active(_) => {
                "Project-scoped operation is stale because the active Desktop project changed.".to_owned()
            }
            ProjectPersistenceScope::LegacySingleProject => {
                "Legacy single-project persistence became stale after Desktop project registration/activation.".to_owned()
            }
        });
    }

    match scope {
        ProjectPersistenceScope::Active(expected) => {
            let record = registry
                .projects
                .iter()
                .find(|project| project.desktop_project_id == expected.desktop_project_id)
                .ok_or_else(|| "Project-scoped operation target is no longer registered.".to_owned())?;
            if record.state != DesktopProjectRegistrationState::Registered || availability(record) != "available" {
                return Err("Project-scoped operation target is no longer safely available.".to_owned());
            }
            let current_state_root = real_state_directory(&projects_root, &expected.desktop_project_id, false)?;
            if current_state_root != expected.state_root {
                return Err("Project-scoped operation target state-root binding changed.".to_owned());
            }
        }
        ProjectPersistenceScope::LegacySingleProject => {}
    }

    operation()
}

pub(crate) fn ensure_project_persistence_scope_current(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
    scope: &ProjectPersistenceScope,
) -> Result<(), String> {
    with_project_persistence_scope_current(app, state, scope, || Ok(()))
}

pub(crate) fn mark_startup_recovery(
    state: &DesktopProjectRegistryState,
    detail: impl Into<String>,
) -> Result<(), String> {
    let detail = detail.into();
    if detail.trim().is_empty() || detail.chars().count() > 1024 {
        return Err("Desktop project startup recovery detail is invalid.".to_owned());
    }
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    runtime.active = None;
    runtime.startup_recovery = Some(detail);
    Ok(())
}

pub(crate) fn clear_startup_recovery(
    state: &DesktopProjectRegistryState,
) -> Result<(), String> {
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    runtime.startup_recovery = None;
    Ok(())
}

pub(crate) fn legacy_migration_status(
    app: &tauri::AppHandle,
) -> Result<LegacyMigrationStatus, String> {
    let projects_root = projects_root(app)?;
    let registry = load_registry(&projects_root)?;
    Ok(LegacyMigrationStatus {
        state: registry.legacy_migration.state.clone(),
        source_fingerprint: registry.legacy_migration.source_fingerprint.clone(),
        project_count: registry.projects.len(),
    })
}

pub(crate) fn mark_legacy_migration_not_needed(
    app: &tauri::AppHandle,
) -> Result<(), String> {
    let projects_root = projects_root(app)?;
    let mut registry = load_registry(&projects_root)?;
    if registry.legacy_migration.state == LegacyMigrationState::Complete {
        return Ok(());
    }
    if registry.legacy_migration.state == LegacyMigrationState::RecoveryRequired {
        return Err("Legacy migration is in recovery-required state.".to_owned());
    }
    registry.legacy_migration = LegacyMigrationRecord {
        state: LegacyMigrationState::NotNeeded,
        source_fingerprint: None,
        detail: None,
    };
    write_registry(&projects_root, &registry)
}

pub(crate) fn mark_legacy_migration_recovery(
    app: &tauri::AppHandle,
    source_fingerprint: Option<String>,
    detail: &str,
) -> Result<(), String> {
    let projects_root = projects_root(app)?;
    let mut registry = load_registry(&projects_root)?;
    let detail = detail.trim();
    if detail.is_empty() || detail.chars().count() > 512 {
        return Err("Legacy migration recovery detail is invalid.".to_owned());
    }
    if let Some(fingerprint) = source_fingerprint.as_deref() {
        let fingerprint = fingerprint.trim();
        if fingerprint.is_empty() || fingerprint.len() > 128 {
            return Err("Legacy migration recovery fingerprint is invalid.".to_owned());
        }
    }
    registry.legacy_migration = LegacyMigrationRecord {
        state: LegacyMigrationState::RecoveryRequired,
        source_fingerprint,
        detail: Some(detail.to_owned()),
    };
    registry.last_active_desktop_project_id = None;
    write_registry(&projects_root, &registry)
}

pub(crate) fn finalize_legacy_migration(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
    import: LegacyMigrationImport,
) -> Result<(), String> {
    let projects_root = projects_root(app)?;
    let id = canonical_uuid(&import.desktop_project_id, "desktopProjectId")?;
    let canonical_root = canonical_local_root(&import.local_root)?;
    let stored_root = path_for_storage(&canonical_root);
    let project_id = normalized_optional(import.project_id.as_deref(), "projectId", 240)?;
    let stable_project_identity = match import.stable_project_identity.as_deref() {
        Some(value) => Some(canonical_uuid(value, "stableProjectIdentity")?),
        None => None,
    };
    if import.source_fingerprint.trim().is_empty() || import.source_fingerprint.len() > 128 {
        return Err("Legacy migration source fingerprint is invalid.".to_owned());
    }
    let display_name = normalized_display_name(None, &canonical_root)?;
    let state_root = real_state_directory(&projects_root, &id, false)?;

    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    let mut registry = load_registry_for_legacy_finalize(&projects_root, &id)?;

    if registry.legacy_migration.state == LegacyMigrationState::Complete {
        if registry.legacy_migration.source_fingerprint.as_deref() == Some(import.source_fingerprint.as_str())
            && registry.projects.iter().any(|project| project.desktop_project_id == id)
        {
            runtime.startup_recovery = None;
            return Ok(());
        }
        return Err("A different legacy migration is already recorded complete.".to_owned());
    }
    if registry.legacy_migration.state == LegacyMigrationState::RecoveryRequired {
        return Err("Legacy migration is in recovery-required state.".to_owned());
    }
    if !registry.projects.is_empty() {
        return Err("Legacy migration cannot create a project because Desktop projects are already registered.".to_owned());
    }

    registry.projects.push(DesktopProjectRecord {
        desktop_project_id: id.clone(),
        display_name,
        local_root: stored_root,
        project_id,
        stable_project_identity,
        state: DesktopProjectRegistrationState::Registered,
    });
    registry.last_active_desktop_project_id = Some(id.clone());
    registry.legacy_migration = LegacyMigrationRecord {
        state: LegacyMigrationState::Complete,
        source_fingerprint: Some(import.source_fingerprint),
        detail: None,
    };
    write_registry(&projects_root, &registry)?;

    let next_generation = runtime
        .generation
        .checked_add(1)
        .ok_or_else(|| "Desktop project activation generation is exhausted.".to_owned())?;
    runtime.generation = next_generation;
    runtime.active = Some(ActiveProjectScope {
        generation: next_generation,
        desktop_project_id: id,
        local_root: canonical_root,
        state_root,
    });
    runtime.startup_recovery = None;
    Ok(())
}

pub(crate) fn restore_last_active_project(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
) -> Result<(), String> {
    let projects_root = projects_root(app)?;
    let mut registry = load_registry(&projects_root)?;
    if registry.legacy_migration.state == LegacyMigrationState::RecoveryRequired {
        return Ok(());
    }
    let Some(id) = registry.last_active_desktop_project_id.clone() else {
        return Ok(());
    };
    let Some(project) = registry.projects.iter().find(|project| project.desktop_project_id == id).cloned() else {
        return Err("Desktop project registry last-active identity does not exist.".to_owned());
    };
    if project.state != DesktopProjectRegistrationState::Registered || availability(&project) != "available" {
        return Ok(());
    }
    let local_root = canonical_local_root(&project.local_root)?;
    let state_root = real_state_directory(&projects_root, &id, false)?;
    write_registry(&projects_root, &registry)?;

    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "Desktop project registry state lock is poisoned.".to_owned())?;
    let next_generation = runtime
        .generation
        .checked_add(1)
        .ok_or_else(|| "Desktop project activation generation is exhausted.".to_owned())?;
    runtime.generation = next_generation;
    runtime.active = Some(ActiveProjectScope {
        generation: next_generation,
        desktop_project_id: id,
        local_root,
        state_root,
    });
    runtime.startup_recovery = None;
    Ok(())
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
    let (local_root, state_root) = registered_project_roots(&projects_root, &desktop_project_id)?;
    crate::project_knowledge_bridge::ensure_project_brain_storage_for_roots(&local_root, &state_root)?;
    let stable_project_identity = observed_machine_local_stable_project_identity(&projects_root, &desktop_project_id)?
        .ok_or_else(|| "Project activation completed without a stable machine-local Project Brain identity.".to_owned())?;
    bind_stable_project_identity_at(&projects_root, &desktop_project_id, &stable_project_identity)?;
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
    fn diagnostics_identity_uses_machine_local_project_brain_when_logical_project_id_is_missing() {
        let root = test_root("diagnostics-stable-identity");
        let projects = root.join("app-data").join("projects");
        let local = project(&root, "checkout");
        let runtime = ActiveProjectRuntime::default();
        let registered = register_at(&projects, &runtime, DesktopProjectRegisterInput {
            local_root: local.to_string_lossy().to_string(),
            display_name: Some("Diagnostics project".to_owned()),
            project_id: None,
        }).expect("register project");
        let record = registered.snapshot.projects.first().expect("registered project");
        let desktop_id = record.desktop_project_id.clone();
        let stable = Uuid::new_v4().hyphenated().to_string();
        let state_root = project_state_root(&projects, &desktop_id).expect("state root");
        let brain = state_root.join(".project-brain");
        fs::create_dir(&brain).expect("brain directory");
        fs::write(
            brain.join("metadata.json"),
            serde_json::to_vec(&serde_json::json!({
                "projectBrain": {
                    "schemaVersion": 2,
                    "projectId": stable,
                }
            })).expect("metadata"),
        ).expect("write metadata");

        let registry = load_registry(&projects).expect("registry");
        let stored = registry.projects.iter().find(|project| project.desktop_project_id == desktop_id).expect("project");
        assert_eq!(diagnostics_project_id(&projects, stored).expect("diagnostics identity"), stable);

        bind_stable_project_identity_at(&projects, &desktop_id, &stable).expect("bind identity");
        let rebound = load_registry(&projects).expect("rebound registry");
        let rebound_project = rebound.projects.iter().find(|project| project.desktop_project_id == desktop_id).expect("rebound project");
        assert_eq!(rebound_project.stable_project_identity.as_deref(), Some(stable.as_str()));

        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn diagnostics_identity_rejects_conflicting_machine_local_project_brain_identity() {
        let root = test_root("diagnostics-identity-conflict");
        let projects = root.join("app-data").join("projects");
        let local = project(&root, "checkout");
        let runtime = ActiveProjectRuntime::default();
        let registered = register_at(&projects, &runtime, DesktopProjectRegisterInput {
            local_root: local.to_string_lossy().to_string(),
            display_name: None,
            project_id: None,
        }).expect("register project");
        let desktop_id = registered.snapshot.projects.first().expect("registered project").desktop_project_id.clone();
        let first = Uuid::new_v4().hyphenated().to_string();
        let second = Uuid::new_v4().hyphenated().to_string();
        bind_stable_project_identity_at(&projects, &desktop_id, &first).expect("first bind");
        let error = bind_stable_project_identity_at(&projects, &desktop_id, &second).expect_err("conflict rejected");
        assert!(error.contains("conflicts with the machine-local Project Brain"));
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn registry_without_legacy_migration_field_defaults_to_pending() {
        let value = serde_json::json!({
            "schemaVersion": 1,
            "projects": []
        });
        let registry: DesktopProjectRegistry = serde_json::from_value(value).expect("old registry");
        assert_eq!(registry.legacy_migration.state, LegacyMigrationState::Pending);
        validate_registry(&registry).expect("old registry remains valid");
    }

    #[test]
    fn legacy_finalize_loader_allows_only_the_expected_orphan_namespace() {
        let root = test_root("legacy-finalize-loader");
        let projects = root.join("app-data").join("projects");
        fs::create_dir_all(&projects).expect("projects");
        let expected = Uuid::new_v4().hyphenated().to_string();
        fs::create_dir(projects.join(&expected)).expect("expected namespace");

        let registry = load_registry_for_legacy_finalize(&projects, &expected)
            .expect("expected migration namespace allowed");
        assert!(registry.projects.is_empty());

        let unexpected = Uuid::new_v4().hyphenated().to_string();
        fs::create_dir(projects.join(&unexpected)).expect("unexpected namespace");
        assert!(load_registry_for_legacy_finalize(&projects, &expected).is_err());

        fs::remove_dir_all(&root).expect("cleanup");
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
    fn detached_project_can_be_explicitly_readopted_without_new_identity() {
        let root = test_root("readopt");
        let projects = root.join("app-data").join("projects");
        let local = project(&root, "one");
        let mut runtime = ActiveProjectRuntime::default();

        let first = register_at(&projects, &runtime, register_input(&local, Some("Before"))).expect("register");
        let project_id = first.snapshot.projects[0].desktop_project_id.clone();
        detach_at(&projects, &mut runtime, &project_id).expect("detach");

        let readopted = register_at(&projects, &runtime, register_input(&local, Some("After"))).expect("readopt");
        assert!(!readopted.created);
        assert_eq!(readopted.state, "registered");
        let registry = load_registry(&projects).expect("registry");
        assert_eq!(registry.projects.len(), 1);
        assert_eq!(registry.projects[0].desktop_project_id, project_id);
        assert_eq!(registry.projects[0].display_name, "After");
        assert_eq!(registry.projects[0].state, DesktopProjectRegistrationState::Registered);

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
    fn persistence_scope_runtime_match_rejects_stale_generation_and_legacy_after_registration() {
        let desktop_project_id = Uuid::new_v4().hyphenated().to_string();
        let active = ActiveProjectScope {
            generation: 4,
            desktop_project_id: desktop_project_id.clone(),
            local_root: PathBuf::from("project"),
            state_root: PathBuf::from("state"),
        };
        let runtime = ActiveProjectRuntime {
            generation: 4,
            active: Some(active.clone()),
        };
        let registry = DesktopProjectRegistry {
            schema_version: REGISTRY_SCHEMA_VERSION,
            last_active_desktop_project_id: Some(desktop_project_id.clone()),
            projects: vec![DesktopProjectRecord {
                desktop_project_id,
                display_name: "Project".to_owned(),
                local_root: "project".to_owned(),
                project_id: Some("project".to_owned()),
                stable_project_identity: None,
                state: DesktopProjectRegistrationState::Registered,
            }],
        };

        assert!(persistence_scope_matches_runtime(
            &registry,
            &runtime,
            &ProjectPersistenceScope::Active(active.clone()),
        ));

        let mut stale = active;
        stale.generation = 3;
        assert!(!persistence_scope_matches_runtime(
            &registry,
            &runtime,
            &ProjectPersistenceScope::Active(stale),
        ));
        assert!(!persistence_scope_matches_runtime(
            &registry,
            &runtime,
            &ProjectPersistenceScope::LegacySingleProject,
        ));

        let empty_registry = DesktopProjectRegistry::default();
        let empty_runtime = ActiveProjectRuntime::default();
        assert!(persistence_scope_matches_runtime(
            &empty_registry,
            &empty_runtime,
            &ProjectPersistenceScope::LegacySingleProject,
        ));
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
    fn missing_registry_with_existing_project_namespace_requires_recovery() {
        let root = test_root("orphan-namespace");
        let projects = root.join("app-data").join("projects");
        fs::create_dir_all(&projects).expect("projects root");
        let orphan = projects.join(Uuid::new_v4().hyphenated().to_string());
        fs::create_dir(&orphan).expect("orphan namespace");

        let error = load_registry(&projects).expect_err("orphan namespace rejected");
        assert!(error.contains("recovery is required"));
        assert!(error.contains("without a canonical registry"));
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn empty_projects_root_without_registry_is_a_clean_empty_registry() {
        let root = test_root("clean-empty");
        let projects = root.join("app-data").join("projects");
        fs::create_dir_all(&projects).expect("projects root");

        let registry = load_registry(&projects).expect("clean empty registry");
        assert!(registry.projects.is_empty());
        assert!(registry.last_active_desktop_project_id.is_none());
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
