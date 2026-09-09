use serde::Serialize;
use std::{path::{Path, PathBuf}, process::Command};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FirstRunRepositoryInspection {
    is_repository: bool,
    local_path: String,
    display_name: String,
    provider: Option<&'static str>,
    repository_id: Option<String>,
    remote_url: Option<String>,
}

fn hidden_git(path: &Path, args: &[&str]) -> Option<String> {
    let mut command = Command::new("git");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let output = command.arg("-C").arg(path).args(args).output().ok()?;
    if !output.status.success() { return None; }
    Some(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}

fn github_repository_id(remote: &str) -> Option<String> {
    let normalized = remote.trim().trim_end_matches('/').trim_end_matches(".git");
    if let Some(rest) = normalized.strip_prefix("https://github.com/") {
        return Some(rest.to_owned());
    }
    if let Some(rest) = normalized.strip_prefix("http://github.com/") {
        return Some(rest.to_owned());
    }
    if let Some(rest) = normalized.strip_prefix("git@github.com:") {
        return Some(rest.to_owned());
    }
    if let Some(rest) = normalized.strip_prefix("ssh://git@github.com/") {
        return Some(rest.to_owned());
    }
    None
}

#[tauri::command]
pub fn inspect_first_run_repository(local_path: String) -> FirstRunRepositoryInspection {
    let requested = PathBuf::from(local_path.trim());
    let canonical = requested.canonicalize().unwrap_or(requested);
    let display_name = canonical.file_name().and_then(|value| value.to_str()).unwrap_or("project").to_owned();
    let inside = hidden_git(&canonical, &["rev-parse", "--is-inside-work-tree"]).as_deref() == Some("true");
    if !inside {
        return FirstRunRepositoryInspection {
            is_repository: false,
            local_path: canonical.to_string_lossy().to_string(),
            display_name,
            provider: None,
            repository_id: None,
            remote_url: None,
        };
    }

    let remote = hidden_git(&canonical, &["remote", "get-url", "origin"]).filter(|value| !value.is_empty());
    let repository_id = remote.as_deref().and_then(github_repository_id);
    FirstRunRepositoryInspection {
        is_repository: true,
        local_path: canonical.to_string_lossy().to_string(),
        display_name,
        provider: Some(if repository_id.is_some() { "github" } else { "git" }),
        repository_id,
        remote_url: remote,
    }
}
