use crate::desktop_project_registry::ProjectPersistenceScope;
use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};
use tauri::Manager;
use uuid::Uuid;

pub(crate) const LEGACY_FIRST_RUN_REQUEST_FILE: &str = "first-run-project-source-review-request.json";
pub(crate) const LEGACY_SOURCE_REVIEW_INPUT_FILE: &str = "project-source-review-input.json";
pub(crate) const LEGACY_SOURCE_REVIEW_PRESENTATION_FILE: &str = "project-source-review-presentation.json";

fn app_data_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))
}

fn ensure_real_directory(path: &Path, create: bool, label: &str) -> Result<(), String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err(format!("{label} must be a real non-symbolic-link directory."));
            }
            Ok(())
        }
        Err(error) if error.kind() == ErrorKind::NotFound && !create => Ok(()),
        Err(error) if error.kind() == ErrorKind::NotFound => {
            fs::create_dir(path)
                .map_err(|error| format!("{label} could not be prepared: {error}"))?;
            let metadata = fs::symlink_metadata(path)
                .map_err(|error| format!("{label} could not be inspected after creation: {error}"))?;
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err(format!("{label} must be a real non-symbolic-link directory."));
            }
            Ok(())
        }
        Err(error) => Err(format!("{label} could not be inspected: {error}")),
    }
}

fn legacy_root(root: &Path, create: bool) -> Result<PathBuf, String> {
    if create {
        fs::create_dir_all(root)
            .map_err(|error| format!("Livariant app-data directory could not be prepared: {error}"))?;
    }
    Ok(root.to_path_buf())
}

fn active_child_directory(
    state_root: &Path,
    child: &str,
    create: bool,
    label: &str,
) -> Result<PathBuf, String> {
    ensure_real_directory(state_root, false, "Desktop project state root")?;
    let path = state_root.join(child);
    ensure_real_directory(&path, create, label)?;
    Ok(path)
}

fn file_path_for_roots(
    scope: &ProjectPersistenceScope,
    app_data: &Path,
    area: &str,
    active_file: &str,
    legacy_file: &str,
    create_parent: bool,
) -> Result<PathBuf, String> {
    match scope {
        ProjectPersistenceScope::Active(active) => Ok(
            active_child_directory(
                &active.state_root,
                area,
                create_parent,
                "Desktop project persistence directory",
            )?
            .join(active_file),
        ),
        ProjectPersistenceScope::LegacySingleProject => {
            Ok(legacy_root(app_data, create_parent)?.join(legacy_file))
        }
    }
}

pub(crate) fn first_run_request_path(
    app: &tauri::AppHandle,
    scope: &ProjectPersistenceScope,
    create_parent: bool,
) -> Result<PathBuf, String> {
    file_path_for_roots(
        scope,
        &app_data_root(app)?,
        "first-run",
        "request.json",
        LEGACY_FIRST_RUN_REQUEST_FILE,
        create_parent,
    )
}

pub(crate) fn source_review_input_path(
    app: &tauri::AppHandle,
    scope: &ProjectPersistenceScope,
    create_parent: bool,
) -> Result<PathBuf, String> {
    file_path_for_roots(
        scope,
        &app_data_root(app)?,
        "source-review",
        "input.json",
        LEGACY_SOURCE_REVIEW_INPUT_FILE,
        create_parent,
    )
}

pub(crate) fn source_review_presentation_path(
    app: &tauri::AppHandle,
    scope: &ProjectPersistenceScope,
    create_parent: bool,
) -> Result<PathBuf, String> {
    file_path_for_roots(
        scope,
        &app_data_root(app)?,
        "source-review",
        "presentation.json",
        LEGACY_SOURCE_REVIEW_PRESENTATION_FILE,
        create_parent,
    )
}

pub(crate) fn operation_temp_path(
    app: &tauri::AppHandle,
    scope: &ProjectPersistenceScope,
    label: &str,
) -> Result<PathBuf, String> {
    let file = format!(".{label}-{}.tmp", Uuid::new_v4().hyphenated());
    match scope {
        ProjectPersistenceScope::Active(active) => {
            ensure_real_directory(&active.state_root, false, "Desktop project state root")?;
            let runtime = active.state_root.join("runtime");
            ensure_real_directory(&runtime, true, "Desktop project runtime directory")?;
            let transient = runtime.join("transient");
            ensure_real_directory(&transient, true, "Desktop project transient directory")?;
            Ok(transient.join(file))
        }
        ProjectPersistenceScope::LegacySingleProject => {
            Ok(legacy_root(&app_data_root(app)?, true)?.join(file))
        }
    }
}

pub(crate) fn staged_path_for_target(target: &Path, label: &str) -> Result<PathBuf, String> {
    let parent = target
        .parent()
        .ok_or_else(|| "Project-scoped persistence target has no parent directory.".to_owned())?;
    ensure_real_directory(parent, false, "Project-scoped persistence target directory")?;
    Ok(parent.join(format!(".{label}-{}.tmp", Uuid::new_v4().hyphenated())))
}

pub(crate) fn replace_staged_file(staged: &Path, target: &Path) -> Result<(), String> {
    if staged.parent() != target.parent() {
        return Err("Project-scoped staged file must share the target directory.".to_owned());
    }
    let staged_metadata = fs::symlink_metadata(staged)
        .map_err(|error| format!("Project-scoped staged file could not be inspected: {error}"))?;
    if !staged_metadata.is_file() || staged_metadata.file_type().is_symlink() {
        return Err("Project-scoped staged file must be a real non-symbolic-link file.".to_owned());
    }

    let parent = target
        .parent()
        .ok_or_else(|| "Project-scoped persistence target has no parent directory.".to_owned())?;
    ensure_real_directory(parent, false, "Project-scoped persistence target directory")?;
    let backup = parent.join(format!(".livariant-backup-{}.tmp", Uuid::new_v4().hyphenated()));
    let had_target = match fs::symlink_metadata(target) {
        Ok(metadata) => {
            if !metadata.is_file() || metadata.file_type().is_symlink() {
                return Err("Project-scoped persistence target must be a real non-symbolic-link file.".to_owned());
            }
            true
        }
        Err(error) if error.kind() == ErrorKind::NotFound => false,
        Err(error) => {
            return Err(format!("Project-scoped persistence target could not be inspected: {error}"));
        }
    };

    if had_target {
        fs::rename(target, &backup)
            .map_err(|error| format!("Project-scoped persistence target could not be checkpointed: {error}"))?;
    }

    if let Err(error) = fs::rename(staged, target) {
        if had_target && backup.exists() && !target.exists() {
            let _ = fs::rename(&backup, target);
        }
        return Err(format!("Project-scoped persistence target could not be committed: {error}"));
    }

    if had_target && backup.exists() {
        let _ = fs::remove_file(&backup);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{file_path_for_roots, replace_staged_file, staged_path_for_target};
    use crate::desktop_project_registry::{ActiveProjectScope, ProjectPersistenceScope};
    use std::{fs, path::PathBuf};
    use uuid::Uuid;

    fn root(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("livariant-project-persistence-{name}-{}", Uuid::new_v4()))
    }

    #[test]
    fn active_projects_get_distinct_namespaced_paths() {
        let base = root("namespaced");
        let app_data = base.join("app-data");
        let one_root = base.join("one");
        let two_root = base.join("two");
        fs::create_dir_all(&one_root).expect("one");
        fs::create_dir_all(&two_root).expect("two");

        let one = ProjectPersistenceScope::Active(ActiveProjectScope {
            generation: 1,
            desktop_project_id: Uuid::new_v4().hyphenated().to_string(),
            local_root: base.join("checkout-one"),
            state_root: one_root.clone(),
        });
        let two = ProjectPersistenceScope::Active(ActiveProjectScope {
            generation: 2,
            desktop_project_id: Uuid::new_v4().hyphenated().to_string(),
            local_root: base.join("checkout-two"),
            state_root: two_root.clone(),
        });

        let first = file_path_for_roots(&one, &app_data, "source-review", "input.json", "legacy.json", true)
            .expect("first path");
        let second = file_path_for_roots(&two, &app_data, "source-review", "input.json", "legacy.json", true)
            .expect("second path");

        assert_eq!(first, one_root.join("source-review").join("input.json"));
        assert_eq!(second, two_root.join("source-review").join("input.json"));
        assert_ne!(first, second);
        fs::remove_dir_all(&base).expect("cleanup");
    }

    #[test]
    fn legacy_scope_preserves_existing_single_project_path_until_migration() {
        let base = root("legacy");
        let app_data = base.join("app-data");
        let path = file_path_for_roots(
            &ProjectPersistenceScope::LegacySingleProject,
            &app_data,
            "first-run",
            "request.json",
            "first-run-project-source-review-request.json",
            true,
        )
        .expect("legacy path");

        assert_eq!(path, app_data.join("first-run-project-source-review-request.json"));
        fs::remove_dir_all(&base).expect("cleanup");
    }

    #[cfg(unix)]
    #[test]
    fn staged_path_rejects_symlinked_target_directory() {
        use std::os::unix::fs::symlink;

        let base = root("staged-parent-symlink");
        let outside = base.join("outside");
        let link = base.join("linked");
        fs::create_dir_all(&outside).expect("outside");
        symlink(&outside, &link).expect("link");

        let error = staged_path_for_target(&link.join("input.json"), "input")
            .expect_err("symlinked parent rejected");
        assert!(error.contains("non-symbolic-link"));
        fs::remove_dir_all(&base).expect("cleanup");
    }

    #[test]
    fn staged_replace_commits_without_leaving_backup() {
        let base = root("replace");
        fs::create_dir_all(&base).expect("base");
        let target = base.join("input.json");
        let staged = base.join("staged.tmp");
        fs::write(&target, b"old").expect("old");
        fs::write(&staged, b"new").expect("new");

        replace_staged_file(&staged, &target).expect("replace");
        assert_eq!(fs::read(&target).expect("read"), b"new");
        assert!(!staged.exists());
        let leftovers = fs::read_dir(&base)
            .expect("read dir")
            .filter_map(Result::ok)
            .map(|entry| entry.file_name().to_string_lossy().to_string())
            .collect::<Vec<_>>();
        assert_eq!(leftovers, vec!["input.json".to_owned()]);
        fs::remove_dir_all(&base).expect("cleanup");
    }
}
