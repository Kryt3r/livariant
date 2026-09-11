use crate::connector_host::{codex_diagnostics_export, ConnectorHostState};
use serde::Serialize;
use serde_json::Value;
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{AppHandle, State};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticsExportSaveResult {
    saved: bool,
    file_name: Option<String>,
}

fn require_false(value: &Value, object: &str, field: &str) -> Result<(), String> {
    let observed = value
        .get(object)
        .and_then(Value::as_object)
        .and_then(|record| record.get(field))
        .and_then(Value::as_bool);
    if observed != Some(false) {
        return Err(format!("Diagnostics export boundary {object}.{field} must be false before saving."));
    }
    Ok(())
}

fn validate_export_for_save(value: &Value) -> Result<(), String> {
    if value.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
        return Err("Diagnostics export schema version is unsupported.".to_owned());
    }
    if value.get("kind").and_then(Value::as_str) != Some("livariant-diagnostics-evidence-export") {
        return Err("Diagnostics export kind is invalid.".to_owned());
    }
    for field in [
        "rawPromptsIncluded",
        "projectFileContentsIncluded",
        "localPathsIncluded",
        "credentialsIncluded",
    ] {
        require_false(value, "privacy", field)?;
    }
    for field in [
        "modelAuthoredUsageAcceptedAsObserved",
        "exportGrantsAuthority",
        "exportPerformsSemanticApply",
        "exportMutatesProjectFiles",
    ] {
        require_false(value, "boundaries", field)?;
    }
    Ok(())
}

fn selected_file_name(path: &Path) -> Option<String> {
    path.file_name().and_then(|value| value.to_str()).map(str::to_owned)
}

fn pick_export_path(default_file_name: &str) -> Result<Option<PathBuf>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const SCRIPT: &str = "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.SaveFileDialog; $dialog.Filter = 'JSON files (*.json)|*.json|All files (*.*)|*.*'; $dialog.DefaultExt = 'json'; $dialog.AddExtension = $true; $dialog.OverwritePrompt = $true; $dialog.FileName = $args[0]; if ([Globalization.CultureInfo]::CurrentUICulture.Name -like 'de-*') { $dialog.Title = 'Diagnosedaten exportieren' } else { $dialog.Title = 'Export diagnostics evidence' }; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.FileName) }";

        let system_root = env::var_os("SystemRoot").ok_or_else(|| "Windows system root is unavailable.".to_owned())?;
        let powershell = PathBuf::from(system_root)
            .join("System32")
            .join("WindowsPowerShell")
            .join("v1.0")
            .join("powershell.exe");
        if !powershell.is_file() {
            return Err("Windows system PowerShell is unavailable for native diagnostics export selection.".to_owned());
        }

        let output = Command::new(&powershell)
            .args(["-NoProfile", "-NonInteractive", "-STA", "-Command", SCRIPT, default_file_name])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|error| format!("Native diagnostics export dialog could not be started: {error}"))?;
        if !output.status.success() {
            return Err("Native diagnostics export dialog did not complete successfully.".to_owned());
        }
        let selected = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        return Ok(if selected.is_empty() { None } else { Some(PathBuf::from(selected)) });
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = default_file_name;
        Err("Native diagnostics export saving is not available on this Desktop platform yet.".to_owned())
    }
}

#[tauri::command]
pub fn save_codex_diagnostics_export(
    app: AppHandle,
    state: State<'_, ConnectorHostState>,
    preset: Option<String>,
) -> Result<DiagnosticsExportSaveResult, String> {
    let file_label = preset.clone().unwrap_or_else(|| "current".to_owned());
    let evidence = codex_diagnostics_export(app, state, preset)?;
    validate_export_for_save(&evidence)?;

    let default_file_name = format!("livariant-diagnostics-{file_label}.json");
    let Some(path) = pick_export_path(&default_file_name)? else {
        return Ok(DiagnosticsExportSaveResult { saved: false, file_name: None });
    };

    let mut encoded = serde_json::to_vec_pretty(&evidence)
        .map_err(|error| format!("Diagnostics export could not be serialized: {error}"))?;
    encoded.push(b'\n');
    fs::write(&path, encoded).map_err(|error| format!("Diagnostics export could not be saved: {error}"))?;

    Ok(DiagnosticsExportSaveResult {
        saved: true,
        file_name: selected_file_name(&path),
    })
}

#[cfg(test)]
mod tests {
    use super::validate_export_for_save;
    use serde_json::json;

    fn valid_export() -> serde_json::Value {
        json!({
            "schemaVersion": 1,
            "kind": "livariant-diagnostics-evidence-export",
            "privacy": {
                "rawPromptsIncluded": false,
                "projectFileContentsIncluded": false,
                "localPathsIncluded": false,
                "credentialsIncluded": false
            },
            "boundaries": {
                "modelAuthoredUsageAcceptedAsObserved": false,
                "exportGrantsAuthority": false,
                "exportPerformsSemanticApply": false,
                "exportMutatesProjectFiles": false
            }
        })
    }

    #[test]
    fn accepts_only_the_bounded_export_contract() {
        assert!(validate_export_for_save(&valid_export()).is_ok());
    }

    #[test]
    fn fails_closed_if_privacy_or_authority_boundary_changes() {
        let mut raw_prompt = valid_export();
        raw_prompt["privacy"]["rawPromptsIncluded"] = json!(true);
        assert!(validate_export_for_save(&raw_prompt).is_err());

        let mut authority = valid_export();
        authority["boundaries"]["exportGrantsAuthority"] = json!(true);
        assert!(validate_export_for_save(&authority).is_err());
    }

    #[test]
    fn rejects_unknown_export_identity() {
        let mut value = valid_export();
        value["kind"] = json!("other-export");
        assert!(validate_export_for_save(&value).is_err());
    }
}
