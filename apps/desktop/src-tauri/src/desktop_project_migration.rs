use crate::{
    desktop_project_registry::{
        clear_startup_recovery, finalize_legacy_migration, legacy_migration_status,
        mark_legacy_migration_not_needed, mark_legacy_migration_recovery,
        restore_last_active_project, DesktopProjectRegistryState, LegacyMigrationImport,
        LegacyMigrationState,
    },
    first_run_project_state::PersistFirstRunProjectStateInput,
    project_scoped_persistence::{
        LEGACY_FIRST_RUN_REQUEST_FILE, LEGACY_SOURCE_REVIEW_INPUT_FILE,
        LEGACY_SOURCE_REVIEW_PRESENTATION_FILE,
    },
    project_source_review_bridge::{
        configuration_value, validate_presentation, ProjectSourceReviewConfigurationInput,
    },
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};
use tauri::Manager;
use uuid::Uuid;

const PROJECTS_DIR: &str = "projects";
const REGISTRY_FILE: &str = "registry.json";
const PLAN_FILE: &str = ".legacy-migration-plan.json";
const FIRST_RUN_MAX_BYTES: u64 = 2 * 1024 * 1024;
const SOURCE_REVIEW_MAX_BYTES: u64 = 4 * 1024 * 1024;
const PRESENTATION_MAX_BYTES: u64 = 8 * 1024 * 1024;
const PROJECT_BRAIN_METADATA_MAX_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Debug, Clone)]
struct LegacyJson {
    bytes: Vec<u8>,
    value: Value,
}

#[derive(Debug, Clone, Default)]
struct LegacyMaterial {
    first_run: Option<LegacyJson>,
    source_review: Option<LegacyJson>,
    presentation: Option<LegacyJson>,
}

impl LegacyMaterial {
    fn is_empty(&self) -> bool {
        self.first_run.is_none() && self.source_review.is_none() && self.presentation.is_none()
    }
}

#[derive(Debug, Clone)]
struct LegacyCandidate {
    local_root: PathBuf,
    project_id: Option<String>,
    stable_project_identity: Option<String>,
    source_fingerprint: String,
    material: LegacyMaterial,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct LegacyMigrationPlan {
    schema_version: u32,
    source_fingerprint: String,
    desktop_project_id: String,
    local_root: String,
    project_id: Option<String>,
    stable_project_identity: Option<String>,
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

fn ensure_real_directory(path: &Path, create: bool, label: &str) -> Result<bool, String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err(format!("{label} must be a real non-symbolic-link directory."));
            }
            Ok(true)
        }
        Err(error) if error.kind() == ErrorKind::NotFound && !create => Ok(false),
        Err(error) if error.kind() == ErrorKind::NotFound => {
            fs::create_dir_all(path).map_err(|error| format!("{label} could not be prepared: {error}"))?;
            let metadata = fs::symlink_metadata(path)
                .map_err(|error| format!("{label} could not be inspected after creation: {error}"))?;
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err(format!("{label} must be a real non-symbolic-link directory."));
            }
            Ok(true)
        }
        Err(error) => Err(format!("{label} could not be inspected: {error}")),
    }
}

fn bounded_json_file(
    path: &Path,
    label: &str,
    max_bytes: u64,
) -> Result<Option<LegacyJson>, String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("{label} could not be inspected: {error}")),
    };
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err(format!("{label} must be a real non-symbolic-link file."));
    }
    if metadata.len() > max_bytes {
        return Err(format!("{label} exceeds the bounded migration size limit."));
    }
    let bytes = fs::read(path).map_err(|error| format!("{label} could not be read: {error}"))?;
    let value = serde_json::from_slice(&bytes)
        .map_err(|error| format!("{label} is invalid JSON: {error}"))?;
    Ok(Some(LegacyJson { bytes, value }))
}

fn read_legacy_material(app_data: &Path) -> Result<LegacyMaterial, String> {
    Ok(LegacyMaterial {
        first_run: bounded_json_file(
            &app_data.join(LEGACY_FIRST_RUN_REQUEST_FILE),
            "Legacy First Run state",
            FIRST_RUN_MAX_BYTES,
        )?,
        source_review: bounded_json_file(
            &app_data.join(LEGACY_SOURCE_REVIEW_INPUT_FILE),
            "Legacy Project Source & Review input",
            SOURCE_REVIEW_MAX_BYTES,
        )?,
        presentation: bounded_json_file(
            &app_data.join(LEGACY_SOURCE_REVIEW_PRESENTATION_FILE),
            "Legacy Project Source & Review presentation",
            PRESENTATION_MAX_BYTES,
        )?,
    })
}

fn is_pre_project_first_run_progress(material: &LegacyMaterial) -> Result<bool, String> {
    if material.source_review.is_some() || material.presentation.is_some() {
        return Ok(false);
    }
    let Some(first_run) = material.first_run.as_ref() else {
        return Ok(false);
    };
    let request = validate_first_run(first_run)?;
    let project = request
        .onboarding_state
        .get("project")
        .and_then(Value::as_object)
        .ok_or_else(|| "Legacy First Run state omits project state.".to_owned())?;
    let has_project_id = project
        .get("projectId")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|value| !value.is_empty());
    let has_local_root = project
        .get("localRoot")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|value| !value.is_empty());
    let has_source_registry = project.get("sourceRegistry").is_some_and(Value::is_object);
    Ok(!has_project_id && !has_local_root && !has_source_registry)
}

fn optional_string(value: Option<&Value>) -> Option<String> {
    value
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn nested<'a>(value: &'a Value, path: &[&str]) -> Option<&'a Value> {
    let mut current = value;
    for key in path {
        current = current.get(*key)?;
    }
    Some(current)
}

fn consistent_string(label: &str, values: impl IntoIterator<Item = Option<String>>) -> Result<Option<String>, String> {
    let mut observed: Option<String> = None;
    for value in values.into_iter().flatten() {
        if value.chars().count() > 4096 {
            return Err(format!("{label} exceeds the supported length."));
        }
        match observed.as_deref() {
            Some(existing) if existing != value => {
                return Err(format!("Legacy migration found contradictory {label} values."));
            }
            None => observed = Some(value),
            _ => {}
        }
    }
    Ok(observed)
}

fn canonical_directory(value: &str, label: &str) -> Result<PathBuf, String> {
    if value.trim().is_empty() || value.chars().count() > 4096 {
        return Err(format!("{label} is invalid."));
    }
    let canonical = fs::canonicalize(value)
        .map_err(|error| format!("{label} could not be resolved: {error}"))?;
    let metadata = fs::metadata(&canonical)
        .map_err(|error| format!("{label} could not be inspected: {error}"))?;
    if !metadata.is_dir() {
        return Err(format!("{label} must resolve to a directory."));
    }
    Ok(canonical)
}

fn same_directory(one: &Path, two: &Path) -> bool {
    #[cfg(target_os = "windows")]
    {
        one.to_string_lossy().replace('/', "\\").to_ascii_lowercase()
            == two.to_string_lossy().replace('/', "\\").to_ascii_lowercase()
    }
    #[cfg(not(target_os = "windows"))]
    {
        one == two
    }
}

fn validate_first_run(first_run: &LegacyJson) -> Result<PersistFirstRunProjectStateInput, String> {
    let parsed: PersistFirstRunProjectStateInput = serde_json::from_slice(&first_run.bytes)
        .map_err(|error| format!("Legacy First Run state has an unsupported shape: {error}"))?;
    if parsed.schema_version != 1 || !parsed.onboarding_state.is_object() {
        return Err("Legacy First Run state has an unsupported schema.".to_owned());
    }
    if parsed.onboarding_state.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
        return Err("Legacy First Run onboarding state has an unsupported schema.".to_owned());
    }
    Ok(parsed)
}

fn validate_source_review(source: &LegacyJson) -> Result<(), String> {
    let parsed: ProjectSourceReviewConfigurationInput = serde_json::from_slice(&source.bytes)
        .map_err(|error| format!("Legacy Project Source & Review input has an unsupported shape: {error}"))?;
    configuration_value(&parsed)
        .map(|_| ())
        .map_err(|error| format!("Legacy Project Source & Review input was rejected: {error}"))
}

fn validate_legacy_presentation(presentation: &LegacyJson) -> Result<(), String> {
    validate_presentation(&presentation.value)
        .map_err(|error| format!("Legacy Project Source & Review presentation was rejected: {error}"))
}

fn observe_stable_project_identity(local_root: &Path) -> Result<Option<String>, String> {
    let brain_root = local_root.join(".project-brain");
    let metadata = match fs::symlink_metadata(&brain_root) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Project Brain directory could not be inspected during migration: {error}")),
    };
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err("Project Brain directory is not a safe real directory; migration cannot infer identity.".to_owned());
    }

    let metadata_path = brain_root.join("metadata.json");
    let metadata = match fs::symlink_metadata(&metadata_path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            return Err("Project Brain metadata is missing; migration cannot safely observe stable identity.".to_owned())
        }
        Err(error) => return Err(format!("Project Brain metadata could not be inspected during migration: {error}")),
    };
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("Project Brain metadata is not a safe real file; migration cannot infer identity.".to_owned());
    }
    if metadata.len() > PROJECT_BRAIN_METADATA_MAX_BYTES {
        return Err("Project Brain metadata exceeds the bounded migration size limit.".to_owned());
    }

    let value: Value = serde_json::from_slice(
        &fs::read(&metadata_path)
            .map_err(|error| format!("Project Brain metadata could not be read during migration: {error}"))?,
    )
    .map_err(|error| format!("Project Brain metadata is invalid JSON: {error}"))?;
    let Some(project_brain) = value.get("projectBrain").and_then(Value::as_object) else {
        return Err("Project Brain metadata omits projectBrain.".to_owned());
    };
    let schema = project_brain.get("schemaVersion").and_then(Value::as_u64);
    if schema != Some(2) {
        return Ok(None);
    }
    let project_id = project_brain
        .get("projectId")
        .and_then(Value::as_str)
        .ok_or_else(|| "Schema-2 Project Brain metadata omits stable project identity.".to_owned())?;
    Ok(Some(canonical_uuid(project_id, "Stable Project Identity")?))
}

fn without_observations(value: &Value) -> Value {
    let mut value = value.clone();
    if let Some(object) = value.as_object_mut() {
        object.insert("observations".to_owned(), json!([]));
    }
    value
}

fn fnv1a(bytes: &[u8], offset: u64) -> u64 {
    let mut hash = offset;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01B3);
    }
    hash
}

fn source_fingerprint(
    local_root: &Path,
    project_id: Option<&str>,
    stable_project_identity: Option<&str>,
    material: &LegacyMaterial,
) -> Result<String, String> {
    let normalized = json!({
        "schemaVersion": 1,
        "localRoot": local_root.to_string_lossy(),
        "projectId": project_id,
        "stableProjectIdentity": stable_project_identity,
        "firstRun": material.first_run.as_ref().map(|file| file.value.clone()),
        "sourceReview": material.source_review.as_ref().map(|file| without_observations(&file.value)),
    });
    let bytes = serde_json::to_vec(&normalized)
        .map_err(|error| format!("Legacy migration fingerprint material could not be serialized: {error}"))?;
    let first = fnv1a(&bytes, 0xcbf2_9ce4_8422_2325);
    let second = fnv1a(&bytes, 0x8422_2325_cbf2_9ce4);
    Ok(format!("{first:016x}{second:016x}"))
}

fn candidate_from_material(material: LegacyMaterial) -> Result<LegacyCandidate, String> {
    if material.is_empty() {
        return Err("Legacy migration candidate requires at least one legacy state file.".to_owned());
    }

    let first_run = match material.first_run.as_ref() {
        Some(file) => Some(validate_first_run(file)?),
        None => None,
    };
    if let Some(source) = material.source_review.as_ref() {
        validate_source_review(source)?;
    }
    if let Some(presentation) = material.presentation.as_ref() {
        validate_legacy_presentation(presentation)?;
    }

    let first_run_root = first_run.as_ref().and_then(|request| {
        optional_string(nested(&request.onboarding_state, &["project", "localRoot"]))
    });
    let understanding_root = first_run.as_ref().and_then(|request| {
        optional_string(nested(&request.onboarding_state, &["understanding", "projectRoot"]))
    });

    let canonical_first_run_root = match first_run_root.as_deref() {
        Some(value) => Some(canonical_directory(value, "Legacy First Run project localRoot")?),
        None => None,
    };
    let canonical_understanding_root = match understanding_root.as_deref() {
        Some(value) => Some(canonical_directory(value, "Legacy First Run understanding projectRoot")?),
        None => None,
    };
    if let (Some(one), Some(two)) = (
        canonical_first_run_root.as_ref(),
        canonical_understanding_root.as_ref(),
    ) {
        if !same_directory(one, two) {
            return Err("Legacy First Run state contains contradictory project roots.".to_owned());
        }
    }

    let source_root = material.source_review.as_ref().and_then(|source| {
        optional_string(nested(&source.value, &["primary", "localPath"]))
    });
    let local_root = if let Some(root) = canonical_first_run_root.or(canonical_understanding_root) {
        root
    } else if let Some(root) = source_root.as_deref() {
        canonical_directory(root, "Legacy Project Source primary localPath")?
    } else {
        return Err("Legacy state does not expose a safely resolvable Desktop project local root.".to_owned());
    };

    let first_project_id = first_run.as_ref().and_then(|request| {
        optional_string(nested(&request.onboarding_state, &["project", "projectId"]))
    });
    let first_registry_project_id = first_run.as_ref().and_then(|request| {
        optional_string(nested(
            &request.onboarding_state,
            &["project", "sourceRegistry", "projectId"],
        ))
    });
    let source_project_id = material.source_review.as_ref().and_then(|source| {
        optional_string(source.value.get("projectId"))
    });
    let presentation_project_id = material.presentation.as_ref().and_then(|presentation| {
        optional_string(presentation.value.get("projectId"))
    });
    let project_id = consistent_string(
        "projectId",
        [
            first_project_id,
            first_registry_project_id,
            source_project_id,
            presentation_project_id,
        ],
    )?;
    if project_id.as_ref().is_some_and(|value| value.chars().count() > 240) {
        return Err("Legacy projectId exceeds the supported length.".to_owned());
    }

    let stable_project_identity = observe_stable_project_identity(&local_root)?;
    let source_fingerprint = source_fingerprint(
        &local_root,
        project_id.as_deref(),
        stable_project_identity.as_deref(),
        &material,
    )?;

    Ok(LegacyCandidate {
        local_root,
        project_id,
        stable_project_identity,
        source_fingerprint,
        material,
    })
}

fn plan_for_candidate(candidate: &LegacyCandidate, desktop_project_id: String) -> LegacyMigrationPlan {
    LegacyMigrationPlan {
        schema_version: 1,
        source_fingerprint: candidate.source_fingerprint.clone(),
        desktop_project_id,
        local_root: candidate.local_root.to_string_lossy().to_string(),
        project_id: candidate.project_id.clone(),
        stable_project_identity: candidate.stable_project_identity.clone(),
    }
}

fn validate_plan(plan: &LegacyMigrationPlan, candidate: &LegacyCandidate) -> Result<(), String> {
    if plan.schema_version != 1 {
        return Err("Legacy migration plan has an unsupported schema.".to_owned());
    }
    canonical_uuid(&plan.desktop_project_id, "legacy migration desktopProjectId")?;
    if plan.source_fingerprint != candidate.source_fingerprint {
        return Err("Legacy migration source changed after migration staging began.".to_owned());
    }
    let plan_root = canonical_directory(&plan.local_root, "Legacy migration plan localRoot")?;
    if !same_directory(&plan_root, &candidate.local_root) {
        return Err("Legacy migration plan localRoot no longer matches the legacy source.".to_owned());
    }
    if plan.project_id != candidate.project_id
        || plan.stable_project_identity != candidate.stable_project_identity
    {
        return Err("Legacy migration plan identity no longer matches the legacy source.".to_owned());
    }
    Ok(())
}

fn write_json_file(path: &Path, value: &impl Serialize, label: &str) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("{label} could not be serialized: {error}"))?;
    fs::write(path, bytes).map_err(|error| format!("{label} could not be written: {error}"))
}

fn read_plan(path: &Path) -> Result<LegacyMigrationPlan, String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("Legacy migration plan could not be inspected: {error}"))?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("Legacy migration plan must be a real non-symbolic-link file.".to_owned());
    }
    if metadata.len() > 64 * 1024 {
        return Err("Legacy migration plan exceeds the bounded size limit.".to_owned());
    }
    serde_json::from_slice(
        &fs::read(path).map_err(|error| format!("Legacy migration plan could not be read: {error}"))?,
    )
    .map_err(|error| format!("Legacy migration plan is invalid: {error}"))
}

fn stage_name(fingerprint: &str) -> String {
    format!(".legacy-migration-{fingerprint}.stage")
}

fn remove_incomplete_stage(stage: &Path) -> Result<(), String> {
    let metadata = match fs::symlink_metadata(stage) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(format!("Legacy migration staging directory could not be inspected: {error}")),
    };
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err("Legacy migration staging path must be a real directory.".to_owned());
    }
    fs::remove_dir_all(stage)
        .map_err(|error| format!("Incomplete legacy migration staging directory could not be reset: {error}"))
}

fn populate_stage(stage: &Path, candidate: &LegacyCandidate, plan: &LegacyMigrationPlan) -> Result<(), String> {
    ensure_real_directory(stage, true, "Legacy migration staging directory")?;
    let first_run_dir = stage.join("first-run");
    let source_review_dir = stage.join("source-review");
    ensure_real_directory(&first_run_dir, true, "Legacy migration First Run staging directory")?;
    ensure_real_directory(&source_review_dir, true, "Legacy migration Source Review staging directory")?;

    if let Some(first_run) = candidate.material.first_run.as_ref() {
        fs::write(first_run_dir.join("request.json"), &first_run.bytes)
            .map_err(|error| format!("Legacy First Run state could not be staged: {error}"))?;
    }
    if let Some(source) = candidate.material.source_review.as_ref() {
        fs::write(source_review_dir.join("input.json"), &source.bytes)
            .map_err(|error| format!("Legacy Project Source & Review input could not be staged: {error}"))?;
    }
    if let Some(presentation) = candidate.material.presentation.as_ref() {
        fs::write(source_review_dir.join("presentation.json"), &presentation.bytes)
            .map_err(|error| format!("Legacy Project Source & Review presentation could not be staged: {error}"))?;
    }

    write_json_file(&stage.join(PLAN_FILE), plan, "Legacy migration plan")?;
    validate_staged_namespace(stage, candidate, plan)
}

fn validate_staged_namespace(
    root: &Path,
    candidate: &LegacyCandidate,
    plan: &LegacyMigrationPlan,
) -> Result<(), String> {
    ensure_real_directory(root, false, "Legacy migration staged project namespace")?;
    let observed_plan = read_plan(&root.join(PLAN_FILE))?;
    if &observed_plan != plan {
        return Err("Legacy migration staged plan changed unexpectedly.".to_owned());
    }
    validate_plan(&observed_plan, candidate)?;

    if candidate.material.first_run.is_some() {
        let staged = bounded_json_file(
            &root.join("first-run").join("request.json"),
            "Staged First Run state",
            FIRST_RUN_MAX_BYTES,
        )?
        .ok_or_else(|| "Staged First Run state is missing.".to_owned())?;
        validate_first_run(&staged)?;
    }
    if candidate.material.source_review.is_some() {
        let staged = bounded_json_file(
            &root.join("source-review").join("input.json"),
            "Staged Project Source & Review input",
            SOURCE_REVIEW_MAX_BYTES,
        )?
        .ok_or_else(|| "Staged Project Source & Review input is missing.".to_owned())?;
        validate_source_review(&staged)?;
    }
    if candidate.material.presentation.is_some() {
        let staged = bounded_json_file(
            &root.join("source-review").join("presentation.json"),
            "Staged Project Source & Review presentation",
            PRESENTATION_MAX_BYTES,
        )?
        .ok_or_else(|| "Staged Project Source & Review presentation is missing.".to_owned())?;
        validate_legacy_presentation(&staged)?;
    }
    Ok(())
}

fn find_resumable_namespace(
    projects_root: &Path,
    candidate: &LegacyCandidate,
) -> Result<Option<(PathBuf, LegacyMigrationPlan)>, String> {
    if !ensure_real_directory(projects_root, false, "Desktop project registry root")? {
        return Ok(None);
    }
    let mut found = None;
    for entry in fs::read_dir(projects_root)
        .map_err(|error| format!("Desktop project registry directory could not be enumerated: {error}"))?
    {
        let entry = entry.map_err(|error| format!("Desktop project registry entry could not be inspected: {error}"))?;
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        if canonical_uuid(&name, "legacy migration project namespace").is_err() {
            continue;
        }
        let metadata = fs::symlink_metadata(entry.path())
            .map_err(|error| format!("Legacy migration project namespace could not be inspected: {error}"))?;
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err("Legacy migration project namespace must be a real non-symbolic-link directory.".to_owned());
        }
        let plan_path = entry.path().join(PLAN_FILE);
        if !plan_path.exists() {
            return Err("Desktop project recovery is required; an orphan project namespace has no legacy migration plan.".to_owned());
        }
        let plan = read_plan(&plan_path)?;
        validate_plan(&plan, candidate)?;
        if plan.desktop_project_id != name {
            return Err("Legacy migration namespace identity does not match its migration plan.".to_owned());
        }
        if found.is_some() {
            return Err("Desktop project recovery is required; multiple resumable legacy migration namespaces exist.".to_owned());
        }
        found = Some((entry.path(), plan));
    }
    Ok(found)
}

fn prepare_namespace(
    projects_root: &Path,
    candidate: &LegacyCandidate,
) -> Result<(PathBuf, LegacyMigrationPlan), String> {
    ensure_real_directory(projects_root, true, "Desktop project registry root")?;

    if let Some(found) = find_resumable_namespace(projects_root, candidate)? {
        validate_staged_namespace(&found.0, candidate, &found.1)?;
        return Ok(found);
    }

    let stage = projects_root.join(stage_name(&candidate.source_fingerprint));
    let plan_path = stage.join(PLAN_FILE);
    let plan = if stage.exists() {
        let metadata = fs::symlink_metadata(&stage)
            .map_err(|error| format!("Legacy migration staging directory could not be inspected: {error}"))?;
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err("Legacy migration staging path must be a real directory.".to_owned());
        }
        if plan_path.exists() {
            let plan = read_plan(&plan_path)?;
            validate_plan(&plan, candidate)?;
            validate_staged_namespace(&stage, candidate, &plan)?;
            plan
        } else {
            remove_incomplete_stage(&stage)?;
            let plan = plan_for_candidate(candidate, Uuid::new_v4().hyphenated().to_string());
            populate_stage(&stage, candidate, &plan)?;
            plan
        }
    } else {
        let plan = plan_for_candidate(candidate, Uuid::new_v4().hyphenated().to_string());
        populate_stage(&stage, candidate, &plan)?;
        plan
    };

    let final_root = projects_root.join(&plan.desktop_project_id);
    if final_root.exists() {
        return Err("Legacy migration target namespace already exists unexpectedly.".to_owned());
    }
    fs::rename(&stage, &final_root)
        .map_err(|error| format!("Legacy migration namespace could not be committed: {error}"))?;
    validate_staged_namespace(&final_root, candidate, &plan)?;
    Ok((final_root, plan))
}

fn cleanup_plan(final_root: &Path) {
    let _ = fs::remove_file(final_root.join(PLAN_FILE));
}

fn cleanup_completed_plan(
    projects_root: &Path,
    source_fingerprint: &str,
) -> Result<(), String> {
    if !ensure_real_directory(projects_root, false, "Desktop project registry root")? {
        return Ok(());
    }
    for entry in fs::read_dir(projects_root)
        .map_err(|error| format!("Desktop project registry directory could not be enumerated: {error}"))?
    {
        let entry = entry.map_err(|error| format!("Desktop project registry entry could not be inspected: {error}"))?;
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        if canonical_uuid(&name, "completed legacy migration project namespace").is_err() {
            continue;
        }
        let plan_path = entry.path().join(PLAN_FILE);
        let metadata = match fs::symlink_metadata(&plan_path) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == ErrorKind::NotFound => continue,
            Err(error) => return Err(format!("Completed legacy migration plan could not be inspected: {error}")),
        };
        if !metadata.is_file() || metadata.file_type().is_symlink() {
            return Err("Completed legacy migration plan must be a real non-symbolic-link file.".to_owned());
        }
        let plan = read_plan(&plan_path)?;
        if plan.desktop_project_id == name && plan.source_fingerprint == source_fingerprint {
            fs::remove_file(&plan_path)
                .map_err(|error| format!("Completed legacy migration plan could not be cleaned up: {error}"))?;
        }
    }
    Ok(())
}

fn registry_exists(projects_root: &Path) -> Result<bool, String> {
    let path = projects_root.join(REGISTRY_FILE);
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            if !metadata.is_file() || metadata.file_type().is_symlink() {
                return Err("Desktop project registry must be a real non-symbolic-link file.".to_owned());
            }
            Ok(true)
        }
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(false),
        Err(error) => Err(format!("Desktop project registry could not be inspected: {error}")),
    }
}

fn migrate_candidate(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
    projects_root: &Path,
    candidate: &LegacyCandidate,
) -> Result<(), String> {
    let (final_root, plan) = prepare_namespace(projects_root, candidate)?;
    finalize_legacy_migration(
        app,
        state,
        LegacyMigrationImport {
            desktop_project_id: plan.desktop_project_id.clone(),
            local_root: plan.local_root.clone(),
            project_id: plan.project_id.clone(),
            stable_project_identity: plan.stable_project_identity.clone(),
            source_fingerprint: plan.source_fingerprint.clone(),
        },
    )?;
    cleanup_plan(&final_root);
    Ok(())
}

pub(crate) fn initialize(
    app: &tauri::AppHandle,
    state: &DesktopProjectRegistryState,
) -> Result<(), String> {
    clear_startup_recovery(state)?;
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?;
    ensure_real_directory(&app_data, true, "Livariant app-data directory")?;
    let projects_root = app_data.join(PROJECTS_DIR);
    let has_registry = registry_exists(&projects_root)?;

    if has_registry {
        let status = legacy_migration_status(app)?;
        match status.state {
            LegacyMigrationState::Complete => {
                if let Some(fingerprint) = status.source_fingerprint.as_deref() {
                    cleanup_completed_plan(&projects_root, fingerprint)?;
                }
                restore_last_active_project(app, state)?;
                return Ok(());
            }
            LegacyMigrationState::RecoveryRequired => {
                return Ok(());
            }
            LegacyMigrationState::Pending | LegacyMigrationState::NotNeeded => {}
        }

        let material = match read_legacy_material(&app_data) {
            Ok(material) => material,
            Err(error) => {
                mark_legacy_migration_recovery(
                    app,
                    None,
                    "Legacy singleton state could not be safely read; explicit recovery is required.",
                )?;
                return Err(error);
            }
        };
        if material.is_empty() {
            if status.project_count > 0 && status.state == LegacyMigrationState::Pending {
                mark_legacy_migration_not_needed(app)?;
            }
            restore_last_active_project(app, state)?;
            return Ok(());
        }
        if is_pre_project_first_run_progress(&material)? {
            if status.project_count > 0 {
                if status.state == LegacyMigrationState::Pending {
                    mark_legacy_migration_not_needed(app)?;
                }
                restore_last_active_project(app, state)?;
            }
            return Ok(());
        }

        let candidate = match candidate_from_material(material) {
            Ok(candidate) => candidate,
            Err(error) => {
                mark_legacy_migration_recovery(
                    app,
                    None,
                    "Legacy singleton state is contradictory or unsafe; explicit recovery is required.",
                )?;
                return Err(error);
            }
        };
        if status.project_count > 0 {
            mark_legacy_migration_recovery(
                app,
                Some(candidate.source_fingerprint.clone()),
                "Legacy singleton state exists alongside registered Desktop projects; explicit recovery is required before import.",
            )?;
            return Ok(());
        }

        migrate_candidate(app, state, &projects_root, &candidate)?;
        return Ok(());
    }

    let material = read_legacy_material(&app_data)?;
    if material.is_empty() {
        restore_last_active_project(app, state)?;
        return Ok(());
    }
    if is_pre_project_first_run_progress(&material)? {
        return Ok(());
    }
    let candidate = candidate_from_material(material)?;

    if find_resumable_namespace(&projects_root, &candidate)?.is_some() {
        migrate_candidate(app, state, &projects_root, &candidate)?;
        return Ok(());
    }

    let status = legacy_migration_status(app)?;
    if status.project_count > 0 {
        return Err("Desktop project recovery is required before legacy migration can continue.".to_owned());
    }
    migrate_candidate(app, state, &projects_root, &candidate)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn test_root(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "livariant-legacy-migration-{name}-{}",
            Uuid::new_v4()
        ))
    }

    fn project(root: &Path) -> PathBuf {
        let project = root.join("project");
        fs::create_dir_all(&project).expect("project");
        project
    }

    fn first_run_value(project: &Path, project_id: &str) -> Value {
        json!({
            "schemaVersion": 1,
            "onboardingState": {
                "schemaVersion": 1,
                "currentStep": "sources",
                "completed": false,
                "project": {
                    "projectId": project_id,
                    "localRoot": project.to_string_lossy(),
                    "sourceRegistry": {
                        "schemaVersion": 1,
                        "projectId": project_id,
                        "primary": {
                            "kind": "primary",
                            "identity": {
                                "provider": "github",
                                "repositoryId": "Kryt3r/livariant",
                                "displayName": "livariant"
                            },
                            "local": {"localPath": project.to_string_lossy()}
                        },
                        "additional": []
                    }
                },
                "understanding": {
                    "projectRoot": project.to_string_lossy(),
                    "questions": []
                },
                "providers": {"configuredProviderIds": [], "deferred": false},
                "health": {
                    "reviewed": false,
                    "readyForMainUi": false,
                    "openQuestionCount": 0,
                    "skippedQuestionCount": 0,
                    "hasProjectSelection": true,
                    "hasSourceRegistry": true
                },
                "boundaries": {
                    "unansweredQuestionGetsDefault": false,
                    "skippedQuestionBecomesKnown": false,
                    "onboardingEvidenceIsProjectTruth": false,
                    "repositoryDescriptionGrantsAuthority": false,
                    "grantsAuthority": false,
                    "mutationAuthorized": false,
                    "changesProjectOwnedFiles": false
                }
            },
            "selectedReviewPaths": ["README.md"],
            "decisions": []
        })
    }

    fn source_value(project: &Path, project_id: &str, observed_at: &str) -> Value {
        json!({
            "schemaVersion": 1,
            "projectId": project_id,
            "primary": {
                "identity": {
                    "provider": "github",
                    "repositoryId": "Kryt3r/livariant",
                    "displayName": "livariant",
                    "remoteUrl": null
                },
                "localPath": project.to_string_lossy()
            },
            "additional": [],
            "observations": [{
                "identity": {
                    "provider": "github",
                    "repositoryId": "Kryt3r/livariant",
                    "displayName": "livariant"
                },
                "reachability": "reachable",
                "observedAt": observed_at,
                "stale": false
            }],
            "selectedReviewPaths": ["README.md"],
            "decisions": []
        })
    }

    fn material(first: Value, source: Value) -> LegacyMaterial {
        LegacyMaterial {
            first_run: Some(LegacyJson {
                bytes: serde_json::to_vec_pretty(&first).expect("first bytes"),
                value: first,
            }),
            source_review: Some(LegacyJson {
                bytes: serde_json::to_vec_pretty(&source).expect("source bytes"),
                value: source,
            }),
            presentation: None,
        }
    }

    #[test]
    fn pre_project_first_run_progress_does_not_require_project_migration() {
        let state = json!({
            "schemaVersion": 1,
            "onboardingState": {
                "schemaVersion": 1,
                "currentStep": "project",
                "completed": false,
                "project": {},
                "understanding": {"projectRoot": "", "questions": []},
                "providers": {"configuredProviderIds": [], "deferred": false},
                "health": {
                    "reviewed": false,
                    "readyForMainUi": false,
                    "openQuestionCount": 0,
                    "skippedQuestionCount": 0,
                    "hasProjectSelection": false,
                    "hasSourceRegistry": false
                },
                "boundaries": {
                    "unansweredQuestionGetsDefault": false,
                    "skippedQuestionBecomesKnown": false,
                    "onboardingEvidenceIsProjectTruth": false,
                    "repositoryDescriptionGrantsAuthority": false,
                    "grantsAuthority": false,
                    "mutationAuthorized": false,
                    "changesProjectOwnedFiles": false
                }
            },
            "selectedReviewPaths": [],
            "decisions": []
        });
        let material = LegacyMaterial::default();
        material.first_run = Some(LegacyJson {
            bytes: serde_json::to_vec_pretty(&state).expect("state bytes"),
            value: state,
        });

        assert!(is_pre_project_first_run_progress(&material).expect("pre-project state accepted"));
        assert!(candidate_from_material(material).is_err());
    }

    #[test]
    fn coherent_legacy_state_derives_one_project() {
        let root = test_root("coherent");
        let project = project(&root);
        let candidate = candidate_from_material(material(
            first_run_value(&project, "livariant"),
            source_value(&project, "livariant", "2026-09-19T10:00:00Z"),
        ))
        .expect("candidate");

        assert!(same_directory(&candidate.local_root, &fs::canonicalize(&project).expect("canonical")));
        assert_eq!(candidate.project_id.as_deref(), Some("livariant"));
        assert_eq!(candidate.source_fingerprint.len(), 32);
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn contradictory_first_run_roots_fail_closed() {
        let root = test_root("contradictory-root");
        let one = project(&root);
        let two = root.join("other");
        fs::create_dir_all(&two).expect("other");
        let mut first = first_run_value(&one, "livariant");
        first["onboardingState"]["understanding"]["projectRoot"] =
            Value::String(two.to_string_lossy().to_string());

        let error = candidate_from_material(material(
            first,
            source_value(&one, "livariant", "2026-09-19T10:00:00Z"),
        ))
        .expect_err("contradiction rejected");
        assert!(error.contains("contradictory project roots"));
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn contradictory_project_ids_fail_closed() {
        let root = test_root("contradictory-id");
        let project = project(&root);
        let error = candidate_from_material(material(
            first_run_value(&project, "project-a"),
            source_value(&project, "project-b", "2026-09-19T10:00:00Z"),
        ))
        .expect_err("contradiction rejected");
        assert!(error.contains("contradictory projectId"));
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn fingerprint_ignores_volatile_source_observation_timestamps() {
        let root = test_root("fingerprint");
        let project = project(&root);
        let one = candidate_from_material(material(
            first_run_value(&project, "livariant"),
            source_value(&project, "livariant", "2026-09-19T10:00:00Z"),
        ))
        .expect("one");
        let two = candidate_from_material(material(
            first_run_value(&project, "livariant"),
            source_value(&project, "livariant", "2026-09-20T10:00:00Z"),
        ))
        .expect("two");

        assert_eq!(one.source_fingerprint, two.source_fingerprint);
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn staged_namespace_resume_keeps_same_desktop_project_identity() {
        let root = test_root("resume");
        let project = project(&root);
        let projects_root = root.join("app-data").join(PROJECTS_DIR);
        let candidate = candidate_from_material(material(
            first_run_value(&project, "livariant"),
            source_value(&project, "livariant", "2026-09-19T10:00:00Z"),
        ))
        .expect("candidate");

        let (final_root, first_plan) = prepare_namespace(&projects_root, &candidate).expect("first prepare");
        assert!(final_root.is_dir());
        assert!(final_root.join(PLAN_FILE).is_file());

        let (resumed_root, resumed_plan) = prepare_namespace(&projects_root, &candidate).expect("resume");
        assert_eq!(resumed_root, final_root);
        assert_eq!(resumed_plan.desktop_project_id, first_plan.desktop_project_id);
        assert_eq!(resumed_plan.source_fingerprint, first_plan.source_fingerprint);
        fs::remove_dir_all(&root).expect("cleanup");
    }

    #[test]
    fn migration_staging_never_deletes_legacy_source_files() {
        let root = test_root("preserve-legacy");
        let project = project(&root);
        let app_data = root.join("app-data");
        fs::create_dir_all(&app_data).expect("app data");
        let first_path = app_data.join(LEGACY_FIRST_RUN_REQUEST_FILE);
        let source_path = app_data.join(LEGACY_SOURCE_REVIEW_INPUT_FILE);
        fs::write(
            &first_path,
            serde_json::to_vec_pretty(&first_run_value(&project, "livariant")).expect("first"),
        )
        .expect("write first");
        fs::write(
            &source_path,
            serde_json::to_vec_pretty(&source_value(&project, "livariant", "2026-09-19T10:00:00Z"))
                .expect("source"),
        )
        .expect("write source");

        let candidate = candidate_from_material(read_legacy_material(&app_data).expect("material"))
            .expect("candidate");
        let projects_root = app_data.join(PROJECTS_DIR);
        prepare_namespace(&projects_root, &candidate).expect("prepare");

        assert!(first_path.is_file());
        assert!(source_path.is_file());
        fs::remove_dir_all(&root).expect("cleanup");
    }
}
