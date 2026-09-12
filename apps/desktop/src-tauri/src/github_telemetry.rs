use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    env,
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

const GITHUB_API: &str = "https://api.github.com";
const API_VERSION: &str = "2022-11-28";
const USER_AGENT: &str = "Livariant-Desktop";
const SECRET_FILE: &str = "github-user-access-token.dpapi";
const CACHE_SCHEMA_VERSION: u32 = 1;
const CACHE_FRESH_SECONDS: u64 = 600;

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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubProjectTelemetryLoad {
    telemetry: Value,
    source: &'static str,
    cache_age_seconds: u64,
    fresh_until_unix: u64,
    fresh: bool,
    cache_persisted: bool,
    cache_detail: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GitHubTelemetryCacheStore {
    schema_version: u32,
    repository_id: String,
    telemetry: Value,
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

fn github_get_bundle(repository_id: &str, token: &str) -> Result<Value, String> {
    let encoded_repository = repository_id.replace(' ', "%20");
    run_powershell_json(
        "$p=ConvertFrom-Json ([Console]::In.ReadToEnd()); $h=@{Accept='application/vnd.github+json';Authorization=('Bearer '+$p.token);'X-GitHub-Api-Version'=$p.apiVersion;'User-Agent'=$p.userAgent}; function Get-Gh([string]$u){Invoke-RestMethod -Method Get -Uri $u -Headers $h}; try{$repo=Get-Gh $p.urls.repository; $actions=Get-Gh $p.urls.actions; $prs=Get-Gh $p.urls.pullRequests; $issues=Get-Gh $p.urls.issues; $releases=Get-Gh $p.urls.releases; @{repositoryJson=($repo|ConvertTo-Json -Compress -Depth 30);actionsJson=($actions|ConvertTo-Json -Compress -Depth 30);pullRequestsJson=(ConvertTo-Json -InputObject @($prs) -Compress -Depth 30);issuesJson=(ConvertTo-Json -InputObject @($issues) -Compress -Depth 30);releasesJson=(ConvertTo-Json -InputObject @($releases) -Compress -Depth 30)}|ConvertTo-Json -Compress -Depth 5}catch{Write-Error $_; exit 1}",
        &json!({
            "token": token,
            "apiVersion": API_VERSION,
            "userAgent": USER_AGENT,
            "urls": {
                "repository": format!("{GITHUB_API}/repos/{encoded_repository}"),
                "actions": format!("{GITHUB_API}/repos/{encoded_repository}/actions/runs?per_page=10"),
                "pullRequests": format!("{GITHUB_API}/repos/{encoded_repository}/pulls?state=open&per_page=20&sort=updated&direction=desc"),
                "issues": format!("{GITHUB_API}/repos/{encoded_repository}/issues?state=open&per_page=20&sort=updated&direction=desc"),
                "releases": format!("{GITHUB_API}/repos/{encoded_repository}/releases?per_page=10")
            }
        }),
    )
}

fn bundle_json(bundle: &Value, field: &str) -> Result<Value, String> {
    let raw = bundle
        .get(field)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("GitHub telemetry bundle did not include {field}."))?;
    serde_json::from_str(raw).map_err(|error| format!("GitHub telemetry bundle field {field} was invalid JSON: {error}"))
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

fn surface_from_value(value: Value, field: Option<&str>, fields: &[&str], exclude_pull_requests: bool) -> GitHubTelemetrySurface {
    match list_items(value, field).and_then(|value| map_array(value, fields, exclude_pull_requests)) {
        Ok(items) => available(items),
        Err(error) => unavailable(error),
    }
}

fn telemetry_cache_path(app: &tauri::AppHandle, repository_id: &str) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?;
    let encoded = repository_id
        .as_bytes()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    Ok(root.join("github").join("telemetry").join(format!("{encoded}.json")))
}

fn validate_surface(value: &Value, field: &str) -> Result<(), String> {
    let surface = value
        .get(field)
        .and_then(Value::as_object)
        .ok_or_else(|| format!("Cached GitHub telemetry is missing {field}."))?;
    let state = surface.get("state").and_then(Value::as_str).unwrap_or_default();
    if state != "available" && state != "unavailable" {
        return Err(format!("Cached GitHub telemetry {field} has an unsupported state."));
    }
    if !surface.get("items").is_some_and(Value::is_array) {
        return Err(format!("Cached GitHub telemetry {field} items are invalid."));
    }
    Ok(())
}

fn validate_cached_telemetry(value: &Value, repository_id: &str) -> Result<u64, String> {
    if value.get("state").and_then(Value::as_str) != Some("ready") {
        return Err("Cached GitHub telemetry is not in ready state.".to_owned());
    }
    if value.get("repositoryId").and_then(Value::as_str) != Some(repository_id) {
        return Err("Cached GitHub telemetry repository identity does not match the requested repository.".to_owned());
    }
    let observed_at = value
        .get("observedAtUnix")
        .and_then(Value::as_u64)
        .ok_or_else(|| "Cached GitHub telemetry has no valid observation time.".to_owned())?;
    for field in ["repository", "actions", "pullRequests", "issues", "releases"] {
        validate_surface(value, field)?;
    }
    let boundaries = value
        .get("boundaries")
        .and_then(Value::as_object)
        .ok_or_else(|| "Cached GitHub telemetry has no valid boundaries.".to_owned())?;
    for field in [
        "remoteEvidenceIsProjectTruth",
        "telemetryGrantsAuthority",
        "writeCapabilityEnabled",
        "workflowDispatchEnabled",
        "pullRequestMutationEnabled",
        "issueMutationEnabled",
        "releaseMutationEnabled",
        "mergeEnabled",
        "changesProjectOwnedFiles",
        "performsSemanticApply",
    ] {
        if boundaries.get(field).and_then(Value::as_bool) != Some(false) {
            return Err(format!("Cached GitHub telemetry boundary {field} is invalid."));
        }
    }
    Ok(observed_at)
}

fn read_cache(path: &Path, repository_id: &str) -> Result<Option<Value>, String> {
    if !path.is_file() {
        return Ok(None);
    }
    let bytes = fs::read(path).map_err(|error| format!("GitHub telemetry cache could not be read: {error}"))?;
    let store: GitHubTelemetryCacheStore = serde_json::from_slice(&bytes)
        .map_err(|error| format!("GitHub telemetry cache is invalid JSON: {error}"))?;
    if store.schema_version != CACHE_SCHEMA_VERSION {
        return Err(format!("Unsupported GitHub telemetry cache schema {}.", store.schema_version));
    }
    if store.repository_id != repository_id {
        return Err("GitHub telemetry cache repository identity does not match the requested repository.".to_owned());
    }
    validate_cached_telemetry(&store.telemetry, repository_id)?;
    Ok(Some(store.telemetry))
}

fn write_cache(path: &Path, repository_id: &str, telemetry: &Value) -> Result<(), String> {
    validate_cached_telemetry(telemetry, repository_id)?;
    let parent = path.parent().ok_or_else(|| "GitHub telemetry cache path has no parent.".to_owned())?;
    fs::create_dir_all(parent).map_err(|error| format!("GitHub telemetry cache directory could not be prepared: {error}"))?;
    let store = GitHubTelemetryCacheStore {
        schema_version: CACHE_SCHEMA_VERSION,
        repository_id: repository_id.to_owned(),
        telemetry: telemetry.clone(),
    };
    let temp = path.with_extension("json.tmp");
    let mut encoded = serde_json::to_vec_pretty(&store)
        .map_err(|error| format!("GitHub telemetry cache could not be serialized: {error}"))?;
    encoded.push(b'\n');
    fs::write(&temp, encoded).map_err(|error| format!("GitHub telemetry temporary cache could not be written: {error}"))?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| format!("Previous GitHub telemetry cache could not be replaced: {error}"))?;
    }
    fs::rename(&temp, path).map_err(|error| format!("GitHub telemetry cache could not be committed: {error}"))
}

fn load_result(
    telemetry: Value,
    repository_id: &str,
    source: &'static str,
    cache_persisted: bool,
    cache_detail: Option<String>,
) -> Result<GitHubProjectTelemetryLoad, String> {
    let observed_at = validate_cached_telemetry(&telemetry, repository_id)?;
    let now = now_seconds();
    let cache_age_seconds = now.saturating_sub(observed_at);
    let fresh_until_unix = observed_at.saturating_add(CACHE_FRESH_SECONDS);
    Ok(GitHubProjectTelemetryLoad {
        telemetry,
        source,
        cache_age_seconds,
        fresh_until_unix,
        fresh: now <= fresh_until_unix,
        cache_persisted,
        cache_detail,
    })
}

fn fetch_telemetry(repository_id: &str) -> Result<GitHubProjectTelemetry, String> {
    let credential = credential()?;
    let bundle = github_get_bundle(repository_id, &credential.access_token)?;

    let repository_value = bundle_json(&bundle, "repositoryJson")?;
    let repository = if repository_value.is_object() {
        available(Value::Array(vec![project(
            &repository_value,
            &["id", "full_name", "private", "archived", "default_branch", "pushed_at", "updated_at", "open_issues_count", "html_url"],
        )]))
    } else {
        unavailable("GitHub repository response did not contain the expected object.")
    };

    let actions = surface_from_value(
        bundle_json(&bundle, "actionsJson")?,
        Some("workflow_runs"),
        &["id", "name", "event", "status", "conclusion", "head_branch", "head_sha", "run_number", "created_at", "updated_at", "html_url"],
        false,
    );
    let pull_requests = surface_from_value(
        bundle_json(&bundle, "pullRequestsJson")?,
        None,
        &["number", "title", "state", "draft", "created_at", "updated_at", "html_url", "user", "head", "base"],
        false,
    );
    let issues = surface_from_value(
        bundle_json(&bundle, "issuesJson")?,
        None,
        &["number", "title", "state", "created_at", "updated_at", "html_url", "user", "labels", "pull_request"],
        true,
    );
    let releases = surface_from_value(
        bundle_json(&bundle, "releasesJson")?,
        None,
        &["id", "tag_name", "name", "draft", "prerelease", "created_at", "published_at", "html_url"],
        false,
    );

    Ok(GitHubProjectTelemetry {
        state: "ready",
        repository_id: repository_id.to_owned(),
        observed_at_unix: now_seconds(),
        repository,
        actions,
        pull_requests,
        issues,
        releases,
        boundaries: boundaries(),
    })
}

fn github_project_telemetry_blocking(
    app: tauri::AppHandle,
    repository_id: String,
    force_refresh: bool,
) -> Result<GitHubProjectTelemetryLoad, String> {
    let repository_id = validate_repository_id(&repository_id)?;
    let cache_path = telemetry_cache_path(&app, &repository_id)?;
    let mut ignored_cache_detail = None;

    if !force_refresh {
        match read_cache(&cache_path, &repository_id) {
            Ok(Some(telemetry)) => return load_result(telemetry, &repository_id, "cache", true, None),
            Ok(None) => {}
            Err(error) => ignored_cache_detail = Some(format!("Previous cache was ignored: {error}")),
        }
    }

    let telemetry = serde_json::to_value(fetch_telemetry(&repository_id)?)
        .map_err(|error| format!("GitHub telemetry could not be serialized: {error}"))?;
    let cache_write = write_cache(&cache_path, &repository_id, &telemetry);
    let (cache_persisted, cache_detail) = match cache_write {
        Ok(()) => (true, ignored_cache_detail),
        Err(error) => {
            let detail = match ignored_cache_detail {
                Some(previous) => format!("{previous}; new cache could not be persisted: {error}"),
                None => format!("GitHub telemetry cache could not be persisted: {error}"),
            };
            (false, Some(detail))
        }
    };
    load_result(telemetry, &repository_id, "remote", cache_persisted, cache_detail)
}

#[tauri::command]
pub async fn github_project_telemetry(
    app: tauri::AppHandle,
    repository_id: String,
    force_refresh: bool,
) -> Result<GitHubProjectTelemetryLoad, String> {
    tauri::async_runtime::spawn_blocking(move || github_project_telemetry_blocking(app, repository_id, force_refresh))
        .await
        .map_err(|error| format!("GitHub telemetry worker failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::{boundaries, list_items, validate_cached_telemetry, validate_repository_id};
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

    #[test]
    fn cached_telemetry_requires_exact_repository_and_non_authoritative_boundaries() {
        let telemetry = json!({
            "state": "ready",
            "repositoryId": "Kryt3r/livariant",
            "observedAtUnix": 42,
            "repository": {"state":"available","items":[],"detail":null},
            "actions": {"state":"available","items":[],"detail":null},
            "pullRequests": {"state":"available","items":[],"detail":null},
            "issues": {"state":"available","items":[],"detail":null},
            "releases": {"state":"available","items":[],"detail":null},
            "boundaries": boundaries()
        });
        assert_eq!(validate_cached_telemetry(&telemetry, "Kryt3r/livariant").unwrap(), 42);
        assert!(validate_cached_telemetry(&telemetry, "Kryt3r/livariant-internal").is_err());
        let mut forged = telemetry;
        forged["boundaries"]["telemetryGrantsAuthority"] = json!(true);
        assert!(validate_cached_telemetry(&forged, "Kryt3r/livariant").is_err());
    }
}
