use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    env,
    fs,
    io::Write,
    path::PathBuf,
    process::{Command, Stdio},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const GITHUB_API: &str = "https://api.github.com";
const API_VERSION: &str = "2022-11-28";
const USER_AGENT: &str = "Livariant-Desktop";
const SECRET_FILE: &str = "github-user-access-token.dpapi";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredCredential {
    access_token: String,
    expires_at: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubTelemetrySurface {
    state: &'static str,
    items: Value,
    detail: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubProjectTelemetry {
    state: &'static str,
    repository_id: String,
    observed_at_unix: u64,
    repository: GitHubTelemetrySurface,
    actions: GitHubTelemetrySurface,
    pull_requests: GitHubTelemetrySurface,
    issues: GitHubTelemetrySurface,
    releases: GitHubTelemetrySurface,
    boundaries: Value,
}

fn now_seconds() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or(Duration::ZERO).as_secs()
}

fn unavailable(detail: impl Into<String>) -> GitHubTelemetrySurface {
    GitHubTelemetrySurface {
        state: "unavailable",
        items: Value::Array(Vec::new()),
        detail: Some(detail.into()),
    }
}

fn available(items: Value) -> GitHubTelemetrySurface {
    GitHubTelemetrySurface {
        state: "available",
        items,
        detail: None,
    }
}

fn boundaries() -> Value {
    json!({
        "remoteEvidenceIsProjectTruth": false,
        "telemetryGrantsAuthority": false,
        "writeCapabilityEnabled": false,
        "workflowDispatchEnabled": false,
        "pullRequestMutationEnabled": false,
        "issueMutationEnabled": false,
        "releaseMutationEnabled": false,
        "mergeEnabled": false,
        "changesProjectOwnedFiles": false,
        "performsSemanticApply": false
    })
}

fn validate_repository_id(repository_id: &str) -> Result<String, String> {
    let normalized = repository_id.trim();
    let mut parts = normalized.split('/');
    let owner = parts.next().unwrap_or_default();
    let name = parts.next().unwrap_or_default();
    if owner.is_empty() || name.is_empty() || parts.next().is_some() {
        return Err("GitHub repository ID must use exact owner/name form.".to_owned());
    }
    let valid = |value: &str| value.chars().all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.'));
    if !valid(owner) || !valid(name) {
        return Err("GitHub repository ID contains unsupported characters.".to_owned());
    }
    Ok(format!("{owner}/{name}"))
}

#[cfg(target_os = "windows")]
fn powershell_path() -> PathBuf {
    env::var_os("SystemRoot")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(r"C:\Windows"))
        .join("System32")
        .join("WindowsPowerShell")
        .join("v1.0")
        .join("powershell.exe")
}

#[cfg(target_os = "windows")]
fn run_powershell_json(script: &str, input: &Value) -> Result<Value, String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let encoded_script: String = script
        .encode_utf16()
        .flat_map(|unit| unit.to_le_bytes())
        .collect::<Vec<_>>()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    let bootstrap = format!(
        "$hex='{encoded_script}'; $bytes=for($i=0;$i -lt $hex.Length;$i+=2){{[Convert]::ToByte($hex.Substring($i,2),16)}}; $script=[Text.Encoding]::Unicode.GetString($bytes); & ([ScriptBlock]::Create($script))"
    );
    let mut child = Command::new(powershell_path())
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &bootstrap])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|error| format!("Windows GitHub telemetry helper could not be started: {error}"))?;
    let raw = serde_json::to_vec(input).map_err(|error| format!("GitHub telemetry helper input could not be serialized: {error}"))?;
    child.stdin.as_mut().ok_or_else(|| "GitHub telemetry helper stdin was unavailable.".to_owned())?
        .write_all(&raw)
        .map_err(|error| format!("GitHub telemetry helper input could not be written: {error}"))?;
    drop(child.stdin.take());
    let output = child.wait_with_output().map_err(|error| format!("GitHub telemetry helper could not be awaited: {error}"))?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if detail.is_empty() { "GitHub telemetry request failed closed.".to_owned() } else { detail });
    }
    serde_json::from_slice(&output.stdout).map_err(|error| format!("GitHub telemetry helper returned invalid JSON: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn run_powershell_json(_: &str, _: &Value) -> Result<Value, String> {
    Err("GitHub Desktop telemetry transport is currently implemented for Windows only.".to_owned())
}

#[cfg(target_os = "windows")]
fn secret_path() -> Result<PathBuf, String> {
    let appdata = env::var_os("APPDATA").ok_or_else(|| "APPDATA is unavailable for protected GitHub credential storage.".to_owned())?;
    Ok(PathBuf::from(appdata).join("Livariant").join("secrets").join(SECRET_FILE))
}

#[cfg(target_os = "windows")]
fn load_credential() -> Result<Option<StoredCredential>, String> {
    let path = secret_path()?;
    let cipher = match fs::read_to_string(&path) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Protected GitHub credential could not be read: {error}")),
    };
    let result = run_powershell_json(
        "$p=ConvertFrom-Json ([Console]::In.ReadToEnd()); $s=ConvertTo-SecureString $p.cipher; $b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try{$v=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)} finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)}; @{value=$v}|ConvertTo-Json -Compress",
        &json!({"cipher": cipher.trim()}),
    )?;
    let raw = result.get("value").and_then(Value::as_str).ok_or_else(|| "Windows DPAPI unprotection returned no GitHub credential.".to_owned())?;
    serde_json::from_str(raw).map(Some).map_err(|error| format!("Stored GitHub credential is invalid: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn load_credential() -> Result<Option<StoredCredential>, String> {
    Ok(None)
}

fn credential() -> Result<StoredCredential, String> {
    let credential = load_credential()?.ok_or_else(|| "GitHub is not connected.".to_owned())?;
    if credential.access_token.trim().is_empty() {
        return Err("Stored GitHub credential contains no access token.".to_owned());
    }
    if credential.expires_at.is_some_and(|expiry| expiry <= now_seconds() + 30) {
        return Err("GitHub access token is expired or about to expire. Refresh the GitHub connection before loading telemetry.".to_owned());
    }
    Ok(credential)
}

fn github_get_json(path: &str, token: &str) -> Result<Value, String> {
    run_powershell_json(
        "$p=ConvertFrom-Json ([Console]::In.ReadToEnd()); try{$r=Invoke-RestMethod -Method Get -Uri $p.url -Headers @{Accept='application/vnd.github+json';Authorization=('Bearer '+$p.token);'X-GitHub-Api-Version'=$p.apiVersion;'User-Agent'=$p.userAgent}; $r|ConvertTo-Json -Compress -Depth 30}catch{Write-Error $_; exit 1}",
        &json!({"url": format!("{GITHUB_API}{path}"), "token": token, "apiVersion": API_VERSION, "userAgent": USER_AGENT}),
    )
}

fn github_get_top_level_list_json(path: &str, token: &str) -> Result<Value, String> {
    run_powershell_json(
        "$p=ConvertFrom-Json ([Console]::In.ReadToEnd()); try{$r=Invoke-RestMethod -Method Get -Uri $p.url -Headers @{Accept='application/vnd.github+json';Authorization=('Bearer '+$p.token);'X-GitHub-Api-Version'=$p.apiVersion;'User-Agent'=$p.userAgent}; ConvertTo-Json -InputObject @($r) -Compress -Depth 30}catch{Write-Error $_; exit 1}",
        &json!({"url": format!("{GITHUB_API}{path}"), "token": token, "apiVersion": API_VERSION, "userAgent": USER_AGENT}),
    )
}

fn list_items(value: Value, field: Option<&str>) -> Result<Value, String> {
    let value = match field {
        Some(field) => value.get(field).cloned().ok_or_else(|| format!("GitHub response did not include {field}."))?,
        None => value,
    };
    if value.is_array() {
        Ok(value)
    } else {
        Err("GitHub response did not contain the expected list.".to_owned())
    }
}

fn project(value: &Value, fields: &[&str]) -> Value {
    let mut output = serde_json::Map::new();
    for field in fields {
        if let Some(value) = value.get(*field) {
            output.insert((*field).to_owned(), value.clone());
        }
    }
    Value::Object(output)
}

fn map_array(value: Value, fields: &[&str], exclude_pull_requests: bool) -> Result<Value, String> {
    let array = value.as_array().ok_or_else(|| "GitHub response did not contain the expected array.".to_owned())?;
    Ok(Value::Array(
        array
            .iter()
            .filter(|item| !exclude_pull_requests || item.get("pull_request").is_none())
            .map(|item| project(item, fields))
            .collect(),
    ))
}

fn surface_request(path: &str, token: &str, field: Option<&str>, fields: &[&str], exclude_pull_requests: bool) -> GitHubTelemetrySurface {
    let response = if field.is_none() {
        github_get_top_level_list_json(path, token)
    } else {
        github_get_json(path, token)
    };
    match response
        .and_then(|value| list_items(value, field))
        .and_then(|value| map_array(value, fields, exclude_pull_requests))
    {
        Ok(items) => available(items),
        Err(error) => unavailable(error),
    }
}

#[tauri::command]
pub fn github_project_telemetry(repository_id: String) -> Result<GitHubProjectTelemetry, String> {
    let repository_id = validate_repository_id(&repository_id)?;
    let credential = credential()?;
    let encoded_repository = repository_id.replace(' ', "%20");

    let repository = match github_get_json(&format!("/repos/{encoded_repository}"), &credential.access_token) {
        Ok(value) => available(Value::Array(vec![project(
            &value,
            &["id", "full_name", "private", "archived", "default_branch", "pushed_at", "updated_at", "open_issues_count", "html_url"],
        )])),
        Err(error) => unavailable(error),
    };

    let actions = surface_request(
        &format!("/repos/{encoded_repository}/actions/runs?per_page=10"),
        &credential.access_token,
        Some("workflow_runs"),
        &["id", "name", "event", "status", "conclusion", "head_branch", "head_sha", "run_number", "created_at", "updated_at", "html_url"],
        false,
    );
    let pull_requests = surface_request(
        &format!("/repos/{encoded_repository}/pulls?state=open&per_page=20&sort=updated&direction=desc"),
        &credential.access_token,
        None,
        &["number", "title", "state", "draft", "created_at", "updated_at", "html_url", "user", "head", "base"],
        false,
    );
    let issues = surface_request(
        &format!("/repos/{encoded_repository}/issues?state=open&per_page=20&sort=updated&direction=desc"),
        &credential.access_token,
        None,
        &["number", "title", "state", "created_at", "updated_at", "html_url", "user", "labels", "pull_request"],
        true,
    );
    let releases = surface_request(
        &format!("/repos/{encoded_repository}/releases?per_page=10"),
        &credential.access_token,
        None,
        &["id", "tag_name", "name", "draft", "prerelease", "created_at", "published_at", "html_url"],
        false,
    );

    Ok(GitHubProjectTelemetry {
        state: "ready",
        repository_id,
        observed_at_unix: now_seconds(),
        repository,
        actions,
        pull_requests,
        issues,
        releases,
        boundaries: boundaries(),
    })
}

#[cfg(test)]
mod tests {
    use super::{boundaries, list_items, validate_repository_id};
    use serde_json::json;

    #[test]
    fn repository_id_is_bounded_to_owner_name() {
        assert_eq!(validate_repository_id("Kryt3r/livariant").unwrap(), "Kryt3r/livariant");
        assert!(validate_repository_id("https://github.com/Kryt3r/livariant").is_err());
        assert!(validate_repository_id("Kryt3r/livariant/actions").is_err());
        assert!(validate_repository_id("Kryt3r/li vari ant").is_err());
    }

    #[test]
    fn top_level_list_shape_stays_fail_closed() {
        assert_eq!(list_items(json!([]), None).unwrap(), json!([]));
        assert_eq!(list_items(json!([{"number": 1}]), None).unwrap(), json!([{"number": 1}]));
        assert_eq!(list_items(json!([{"number": 1}, {"number": 2}]), None).unwrap(), json!([{"number": 1}, {"number": 2}]));
        assert!(list_items(json!({"number": 1}), None).is_err());
    }

    #[test]
    fn telemetry_boundaries_are_read_only() {
        let value = boundaries();
        assert_eq!(value["remoteEvidenceIsProjectTruth"], false);
        assert_eq!(value["telemetryGrantsAuthority"], false);
        assert_eq!(value["writeCapabilityEnabled"], false);
        assert_eq!(value["workflowDispatchEnabled"], false);
        assert_eq!(value["mergeEnabled"], false);
        assert_eq!(value["performsSemanticApply"], false);
    }
}
