use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    env,
    fs,
    io::Write,
    path::PathBuf,
    process::{Command, Stdio},
    sync::Mutex,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::State;

const GITHUB_API: &str = "https://api.github.com";
const GITHUB_LOGIN: &str = "https://github.com/login";
const API_VERSION: &str = "2022-11-28";
const USER_AGENT: &str = "Livariant-Desktop";
const SECRET_FILE: &str = "github-user-access-token.dpapi";

#[derive(Debug, Clone)]
struct PendingDeviceAuthorization {
    device_code: String,
    expires_at: u64,
    interval_seconds: u64,
}

#[derive(Default)]
pub struct GitHubRemoteState {
    pending: Mutex<Option<PendingDeviceAuthorization>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubConnectionStatus {
    state: &'static str,
    connected: bool,
    configured: bool,
    login: Option<String>,
    detail: String,
    boundaries: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubDeviceAuthorization {
    state: &'static str,
    user_code: String,
    verification_uri: String,
    expires_at: u64,
    interval_seconds: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubDevicePollResult {
    state: &'static str,
    connected: bool,
    login: Option<String>,
    retry_after_seconds: Option<u64>,
    detail: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepositorySummary {
    repository_id: String,
    numeric_id: u64,
    display_name: String,
    owner: String,
    private: bool,
    default_branch: String,
    remote_url: String,
    html_url: String,
    archived: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredCredential {
    access_token: String,
    expires_at: Option<u64>,
    refresh_token: Option<String>,
    refresh_token_expires_at: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    expires_in: Option<u64>,
    refresh_token: Option<String>,
    refresh_token_expires_in: Option<u64>,
    error: Option<String>,
    error_description: Option<String>,
    interval: Option<u64>,
}

fn now_seconds() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or(Duration::ZERO).as_secs()
}

fn boundaries() -> Value {
    json!({
        "connectionGrantsAuthority": false,
        "repositorySelectionGrantsAuthority": false,
        "remoteEvidenceIsProjectTruth": false,
        "writeCapabilityEnabled": false,
        "changesProjectOwnedFiles": false,
        "performsSemanticApply": false
    })
}

fn github_client_id() -> Option<String> {
    env::var("LIVARIANT_GITHUB_CLIENT_ID")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .or_else(|| option_env!("LIVARIANT_GITHUB_CLIENT_ID").map(str::trim).filter(|value| !value.is_empty()).map(str::to_owned))
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

    let encoded_script: String = script.encode_utf16().flat_map(|unit| unit.to_le_bytes()).collect::<Vec<_>>().iter().map(|byte| format!("{byte:02x}")).collect();
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
        .map_err(|error| format!("Windows protected helper could not be started: {error}"))?;
    let raw = serde_json::to_vec(input).map_err(|error| format!("Windows helper input could not be serialized: {error}"))?;
    child.stdin.as_mut().ok_or_else(|| "Windows helper stdin was unavailable.".to_owned())?.write_all(&raw)
        .map_err(|error| format!("Windows helper input could not be written: {error}"))?;
    drop(child.stdin.take());
    let output = child.wait_with_output().map_err(|error| format!("Windows helper could not be awaited: {error}"))?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if detail.is_empty() { "Windows helper failed closed.".to_owned() } else { detail });
    }
    serde_json::from_slice(&output.stdout).map_err(|error| format!("Windows helper returned invalid JSON: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn run_powershell_json(_: &str, _: &Value) -> Result<Value, String> {
    Err("GitHub Desktop transport is currently implemented for Windows only.".to_owned())
}

#[cfg(target_os = "windows")]
fn secret_path() -> Result<PathBuf, String> {
    let appdata = env::var_os("APPDATA").ok_or_else(|| "APPDATA is unavailable for protected GitHub credential storage.".to_owned())?;
    Ok(PathBuf::from(appdata).join("Livariant").join("secrets").join(SECRET_FILE))
}

#[cfg(target_os = "windows")]
fn store_credential(credential: &StoredCredential) -> Result<(), String> {
    let path = secret_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("Protected GitHub credential directory could not be created: {error}"))?;
    }
    let plaintext = serde_json::to_string(credential).map_err(|error| format!("GitHub credential could not be serialized: {error}"))?;
    let result = run_powershell_json(
        "$p=ConvertFrom-Json ([Console]::In.ReadToEnd()); $s=ConvertTo-SecureString $p.value -AsPlainText -Force; $c=ConvertFrom-SecureString $s; @{cipher=$c}|ConvertTo-Json -Compress",
        &json!({"value": plaintext}),
    )?;
    let cipher = result.get("cipher").and_then(Value::as_str).filter(|value| !value.is_empty()).ok_or_else(|| "Windows DPAPI protection returned no ciphertext.".to_owned())?;
    let temp = path.with_extension("tmp");
    fs::write(&temp, cipher.as_bytes()).map_err(|error| format!("Protected GitHub credential temp file could not be written: {error}"))?;
    if path.exists() {
        fs::remove_file(&path).map_err(|error| format!("Previous protected GitHub credential could not be replaced: {error}"))?;
    }
    fs::rename(&temp, &path).map_err(|error| format!("Protected GitHub credential could not be committed: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn store_credential(_: &StoredCredential) -> Result<(), String> {
    Err("Persistent GitHub credential storage is not implemented for this platform yet.".to_owned())
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
    let raw = result.get("value").and_then(Value::as_str).ok_or_else(|| "Windows DPAPI unprotection returned no credential.".to_owned())?;
    serde_json::from_str(raw).map(Some).map_err(|error| format!("Stored GitHub credential is invalid: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn load_credential() -> Result<Option<StoredCredential>, String> { Ok(None) }

#[cfg(target_os = "windows")]
fn delete_credential() -> Result<(), String> {
    let path = secret_path()?;
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("Protected GitHub credential could not be removed: {error}")),
    }
}

#[cfg(not(target_os = "windows"))]
fn delete_credential() -> Result<(), String> { Ok(()) }

fn github_post_form<T: for<'de> Deserialize<'de>>(url: &str, form: Value) -> Result<T, String> {
    let response = run_powershell_json(
        "$p=ConvertFrom-Json ([Console]::In.ReadToEnd()); $body=@{}; $p.form.psobject.Properties|%{$body[$_.Name]=[string]$_.Value}; try{$r=Invoke-RestMethod -Method Post -Uri $p.url -Headers @{Accept='application/json';'User-Agent'=$p.userAgent} -Body $body -ContentType 'application/x-www-form-urlencoded'; $r|ConvertTo-Json -Compress -Depth 20}catch{Write-Error $_; exit 1}",
        &json!({"url": url, "form": form, "userAgent": USER_AGENT}),
    )?;
    serde_json::from_value(response).map_err(|error| format!("GitHub authorization response was invalid: {error}"))
}

fn github_get_json(path: &str, token: &str) -> Result<Value, String> {
    run_powershell_json(
        "$p=ConvertFrom-Json ([Console]::In.ReadToEnd()); try{$r=Invoke-RestMethod -Method Get -Uri $p.url -Headers @{Accept='application/vnd.github+json';Authorization=('Bearer '+$p.token);'X-GitHub-Api-Version'=$p.apiVersion;'User-Agent'=$p.userAgent}; $r|ConvertTo-Json -Compress -Depth 30}catch{Write-Error $_; exit 1}",
        &json!({"url": format!("{GITHUB_API}{path}"), "token": token, "apiVersion": API_VERSION, "userAgent": USER_AGENT}),
    )
}

fn refresh_credential(client_id: &str, credential: &StoredCredential) -> Result<StoredCredential, String> {
    let refresh_token = credential.refresh_token.as_deref().ok_or_else(|| "GitHub access token expired and no refresh token is available.".to_owned())?;
    if credential.refresh_token_expires_at.is_some_and(|expiry| expiry <= now_seconds() + 30) {
        return Err("GitHub refresh token has expired. Reconnect GitHub.".to_owned());
    }
    let response: TokenResponse = github_post_form(
        &format!("{GITHUB_LOGIN}/oauth/access_token"),
        json!({"client_id": client_id, "grant_type": "refresh_token", "refresh_token": refresh_token}),
    )?;
    let access_token = response.access_token.ok_or_else(|| response.error_description.or(response.error).unwrap_or_else(|| "GitHub token refresh returned no access token.".to_owned()))?;
    let now = now_seconds();
    Ok(StoredCredential {
        access_token,
        expires_at: response.expires_in.map(|seconds| now.saturating_add(seconds)),
        refresh_token: response.refresh_token.or_else(|| credential.refresh_token.clone()),
        refresh_token_expires_at: response.refresh_token_expires_in.map(|seconds| now.saturating_add(seconds)).or(credential.refresh_token_expires_at),
    })
}

fn usable_credential() -> Result<StoredCredential, String> {
    let client_id = github_client_id().ok_or_else(|| "Livariant GitHub App client ID is not configured in this build.".to_owned())?;
    let credential = load_credential()?.ok_or_else(|| "GitHub is not connected.".to_owned())?;
    if credential.expires_at.is_some_and(|expiry| expiry <= now_seconds() + 30) {
        let refreshed = refresh_credential(&client_id, &credential)?;
        store_credential(&refreshed)?;
        return Ok(refreshed);
    }
    Ok(credential)
}

fn authenticated_login(token: &str) -> Result<String, String> {
    github_get_json("/user", token)?
        .get("login")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| "GitHub user response did not include a login.".to_owned())
}

fn parse_repository(value: &Value) -> Result<GitHubRepositorySummary, String> {
    let object = value.as_object().ok_or_else(|| "GitHub repository entry was not an object.".to_owned())?;
    let full_name = object.get("full_name").and_then(Value::as_str).filter(|value| !value.trim().is_empty()).ok_or_else(|| "GitHub repository entry is missing full_name.".to_owned())?;
    let name = object.get("name").and_then(Value::as_str).unwrap_or(full_name);
    let owner = object.get("owner").and_then(Value::as_object).and_then(|owner| owner.get("login")).and_then(Value::as_str).unwrap_or("unknown");
    let default_branch = object.get("default_branch").and_then(Value::as_str).unwrap_or("unknown");
    let clone_url = object.get("clone_url").and_then(Value::as_str).ok_or_else(|| "GitHub repository entry is missing clone_url.".to_owned())?;
    let html_url = object.get("html_url").and_then(Value::as_str).ok_or_else(|| "GitHub repository entry is missing html_url.".to_owned())?;
    Ok(GitHubRepositorySummary {
        repository_id: full_name.to_owned(),
        numeric_id: object.get("id").and_then(Value::as_u64).unwrap_or_default(),
        display_name: name.to_owned(),
        owner: owner.to_owned(),
        private: object.get("private").and_then(Value::as_bool).unwrap_or(false),
        default_branch: default_branch.to_owned(),
        remote_url: clone_url.to_owned(),
        html_url: html_url.to_owned(),
        archived: object.get("archived").and_then(Value::as_bool).unwrap_or(false),
    })
}

#[tauri::command]
pub fn github_connection_status() -> GitHubConnectionStatus {
    let configured = github_client_id().is_some();
    if !configured {
        return GitHubConnectionStatus { state: "not-configured", connected: false, configured: false, login: None, detail: "Livariant GitHub App client ID is not configured in this build.".to_owned(), boundaries: boundaries() };
    }
    match usable_credential().and_then(|credential| authenticated_login(&credential.access_token)) {
        Ok(login) => GitHubConnectionStatus { state: "connected", connected: true, configured: true, login: Some(login), detail: "GitHub is connected for bounded read capability. Connection grants no Livariant Authority.".to_owned(), boundaries: boundaries() },
        Err(error) => GitHubConnectionStatus { state: "disconnected", connected: false, configured: true, login: None, detail: error, boundaries: boundaries() },
    }
}

#[tauri::command]
pub fn github_begin_device_authorization(state: State<'_, GitHubRemoteState>) -> Result<GitHubDeviceAuthorization, String> {
    let client_id = github_client_id().ok_or_else(|| "Livariant GitHub App client ID is not configured in this build.".to_owned())?;
    let response: DeviceCodeResponse = github_post_form(&format!("{GITHUB_LOGIN}/device/code"), json!({"client_id": client_id}))?;
    let now = now_seconds();
    let expires_at = now.saturating_add(response.expires_in);
    let interval_seconds = response.interval.unwrap_or(5).max(5);
    *state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())? = Some(PendingDeviceAuthorization { device_code: response.device_code, expires_at, interval_seconds });
    Ok(GitHubDeviceAuthorization { state: "verification-required", user_code: response.user_code, verification_uri: response.verification_uri, expires_at, interval_seconds })
}

#[tauri::command]
pub fn github_open_verification_page() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe").arg("https://github.com/login/device").spawn().map_err(|error| format!("GitHub verification page could not be opened: {error}"))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    { Err("Opening the GitHub verification page is not implemented for this platform yet.".to_owned()) }
}

#[tauri::command]
pub fn github_poll_device_authorization(state: State<'_, GitHubRemoteState>) -> Result<GitHubDevicePollResult, String> {
    let client_id = github_client_id().ok_or_else(|| "Livariant GitHub App client ID is not configured in this build.".to_owned())?;
    let pending = state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())?.clone().ok_or_else(|| "No GitHub device authorization is pending.".to_owned())?;
    if pending.expires_at <= now_seconds() {
        *state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())? = None;
        return Ok(GitHubDevicePollResult { state: "expired", connected: false, login: None, retry_after_seconds: None, detail: "GitHub authorization code expired. Start again.".to_owned() });
    }
    let response: TokenResponse = github_post_form(&format!("{GITHUB_LOGIN}/oauth/access_token"), json!({"client_id": client_id, "device_code": pending.device_code, "grant_type": "urn:ietf:params:oauth:grant-type:device_code"}))?;
    if let Some(error) = response.error.as_deref() {
        if error == "authorization_pending" {
            return Ok(GitHubDevicePollResult { state: "pending", connected: false, login: None, retry_after_seconds: Some(pending.interval_seconds), detail: "Waiting for GitHub authorization.".to_owned() });
        }
        if error == "slow_down" {
            return Ok(GitHubDevicePollResult { state: "pending", connected: false, login: None, retry_after_seconds: Some(response.interval.unwrap_or(pending.interval_seconds + 5).max(pending.interval_seconds + 5)), detail: "GitHub requested slower authorization polling.".to_owned() });
        }
        if matches!(error, "expired_token" | "access_denied") {
            *state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())? = None;
        }
        return Ok(GitHubDevicePollResult { state: "failed", connected: false, login: None, retry_after_seconds: None, detail: response.error_description.unwrap_or_else(|| error.to_owned()) });
    }
    let access_token = response.access_token.ok_or_else(|| "GitHub authorization returned neither a token nor an error.".to_owned())?;
    let now = now_seconds();
    let credential = StoredCredential {
        access_token,
        expires_at: response.expires_in.map(|seconds| now.saturating_add(seconds)),
        refresh_token: response.refresh_token,
        refresh_token_expires_at: response.refresh_token_expires_in.map(|seconds| now.saturating_add(seconds)),
    };
    let login = authenticated_login(&credential.access_token)?;
    store_credential(&credential)?;
    *state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())? = None;
    Ok(GitHubDevicePollResult { state: "connected", connected: true, login: Some(login), retry_after_seconds: None, detail: "GitHub read connection established. No project-change Authority was granted.".to_owned() })
}

#[tauri::command]
pub fn github_disconnect(state: State<'_, GitHubRemoteState>) -> Result<(), String> {
    delete_credential()?;
    *state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())? = None;
    Ok(())
}

#[tauri::command]
pub fn github_list_repositories() -> Result<Vec<GitHubRepositorySummary>, String> {
    let credential = usable_credential()?;
    let value = github_get_json("/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", &credential.access_token)?;
    let items = value.as_array().ok_or_else(|| "GitHub repository list response was not an array.".to_owned())?;
    items.iter().map(parse_repository).collect()
}

#[cfg(test)]
mod tests {
    use super::{boundaries, github_client_id};

    #[test]
    fn connection_boundaries_remain_non_authoritative() {
        let value = boundaries();
        assert_eq!(value["connectionGrantsAuthority"], false);
        assert_eq!(value["repositorySelectionGrantsAuthority"], false);
        assert_eq!(value["remoteEvidenceIsProjectTruth"], false);
        assert_eq!(value["writeCapabilityEnabled"], false);
    }

    #[test]
    fn missing_client_id_is_supported_as_fail_closed_configuration() {
        let _ = github_client_id();
    }
}
