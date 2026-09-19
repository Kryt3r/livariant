use serde::Serialize;
use std::{env, path::{Path, PathBuf}, process::Command};

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

fn user_visible_path(path: &Path) -> String {
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
    raw.into_owned()
}

fn github_repository_id(remote: &str) -> Option<String> {
    let normalized = remote.trim().trim_end_matches('/').trim_end_matches(".git");
    if let Some(rest) = normalized.strip_prefix("https://github.com/") { return Some(rest.to_owned()); }
    if let Some(rest) = normalized.strip_prefix("http://github.com/") { return Some(rest.to_owned()); }
    if let Some(rest) = normalized.strip_prefix("git@github.com:") { return Some(rest.to_owned()); }
    if let Some(rest) = normalized.strip_prefix("ssh://git@github.com/") { return Some(rest.to_owned()); }
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
            local_path: user_visible_path(&canonical),
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
        local_path: user_visible_path(&canonical),
        display_name,
        provider: Some(if repository_id.is_some() { "github" } else { "git" }),
        repository_id,
        remote_url: remote,
    }
}

#[tauri::command]
pub fn pick_first_run_folder() -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const SCRIPT: &str = "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; if ([Globalization.CultureInfo]::CurrentUICulture.Name -like 'de-*') { $dialog.Description = 'Projektordner auswählen' } else { $dialog.Description = 'Select a project folder' }; $dialog.ShowNewFolderButton = $false; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath) }";

        let system_root = env::var_os("SystemRoot").ok_or_else(|| "Windows system root is unavailable.".to_owned())?;
        let powershell = PathBuf::from(system_root)
            .join("System32")
            .join("WindowsPowerShell")
            .join("v1.0")
            .join("powershell.exe");
        if !powershell.is_file() {
            return Err("Windows system PowerShell is unavailable for native folder selection.".to_owned());
        }

        let output = Command::new(&powershell)
            .args(["-NoProfile", "-NonInteractive", "-STA", "-Command", SCRIPT])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|error| format!("Native folder picker could not be started: {error}"))?;
        if !output.status.success() {
            return Err("Native folder picker did not complete successfully.".to_owned());
        }
        let selected = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        return Ok(if selected.is_empty() { None } else { Some(selected) });
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Native folder selection is not available on this Desktop platform yet.".to_owned())
    }
}


#[cfg(test)]
mod tests {
    use super::user_visible_path;
    use std::path::Path;

    #[cfg(target_os = "windows")]
    #[test]
    fn user_visible_path_strips_windows_verbatim_drive_prefix() {
        assert_eq!(
            user_visible_path(Path::new(r"\\?\C:\Users\Robin\Desktop\Livariant\livariant-internal")),
            r"C:\Users\Robin\Desktop\Livariant\livariant-internal"
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn user_visible_path_converts_windows_verbatim_unc_prefix() {
        assert_eq!(
            user_visible_path(Path::new(r"\\?\UNC\server\share\repo")),
            r"\\server\share\repo"
        );
    }
}
