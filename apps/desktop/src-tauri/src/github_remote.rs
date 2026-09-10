use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{env, process::Command, sync::Mutex, time::{Duration, SystemTime, UNIX_EPOCH}};
use tauri::State;

const GITHUB_API: &str = "https://api.github.com";
const GITHUB_LOGIN: &str = "https://github.com/login";
const CREDENTIAL_SERVICE: &str = "Livariant";
const CREDENTIAL_USER: &str = "github-user-access-token";
const API_VERSION: &str = "2022-11-28";
const USER_AGENT: &str = "Livariant-Desktop";

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
    serde_json::json!({
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
fn store_credential(credential: &StoredCredential) -> Result<(), String> {
    let entry = keyring::Entry::new(CREDENTIAL_SERVICE, CREDENTIAL_USER)
        .map_err(|error| format!("Windows credential entry could not be prepared: {error}"))?;
    let value = serde_json::to_string(credential).map_err(|error| format!("GitHub credential could not be serialized: {error}"))?;
    entry.set_password(&value).map_err(|error| format!("GitHub credential could not be stored in Windows Credential Manager: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn store_credential(_: &StoredCredential) -> Result<(), String> {
    Err("Persistent GitHub credential storage is not implemented for this platform yet.".to_owned())
}

#[cfg(target_os = "windows")]
fn load_credential() -> Result<Option<StoredCredential>, String> {
    let entry = keyring::Entry::new(CREDENTIAL_SERVICE, CREDENTIAL_USER)
        .map_err(|error| format!("Windows credential entry could not be prepared: {error}"))?;
    match entry.get_password() {
        Ok(raw) => serde_json::from_str(&raw).map(Some).map_err(|error| format!("Stored GitHub credential is invalid: {error}")),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("GitHub credential could not be read from Windows Credential Manager: {error}")),
    }
}

#[cfg(not(target_os = "windows"))]
fn load_credential() -> Result<Option<StoredCredential>, String> {
    Ok(None)
}

#[cfg(target_os = "windows")]
fn delete_credential() -> Result<(), String> {
    let entry = keyring::Entry::new(CREDENTIAL_SERVICE, CREDENTIAL_USER)
        .map_err(|error| format!("Windows credential entry could not be prepared: {error}"))?;
    match entry.delete_password() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("GitHub credential could not be removed from Windows Credential Manager: {error}")),
    }
}

#[cfg(not(target_os = "windows"))]
fn delete_credential() -> Result<(), String> {
    Ok(())
}

fn github_post_form<T: for<'de> Deserialize<'de>>(url: &str, form: &[(&str, &str)]) -> Result<T, String> {
    ureq::post(url)
        .set("Accept", "application/json")
        .set("User-Agent", USER_AGENT)
        .send_form(form)
        .map_err(|error| format!("GitHub authorization request failed: {error}"))?
        .into_json::<T>()
        .map_err(|error| format!("GitHub authorization response was invalid: {error}"))
}

fn refresh_credential(client_id: &str, credential: &StoredCredential) -> Result<StoredCredential, String> {
    let refresh_token = credential.refresh_token.as_deref().ok_or_else(|| "GitHub access token expired and no refresh token is available.".to_owned())?;
    if credential.refresh_token_expires_at.is_some_and(|expiry| expiry <= now_seconds() + 30) {
        return Err("GitHub refresh token has expired. Reconnect GitHub.".to_owned());
    }
    let response: TokenResponse = github_post_form(
        &format!("{GITHUB_LOGIN}/oauth/access_token"),
        &[("client_id", client_id), ("grant_type", "refresh_token"), ("refresh_token", refresh_token)],
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

fn github_get_json(path: &str, token: &str) -> Result<Value, String> {
    ureq::get(&format!("{GITHUB_API}{path}"))
        .set("Accept", "application/vnd.github+json")
        .set("Authorization", &format!("Bearer {token}"))
        .set("X-GitHub-Api-Version", API_VERSION)
        .set("User-Agent", USER_AGENT)
        .call()
        .map_err(|error| format!("GitHub API request failed: {error}"))?
        .into_json::<Value>()
        .map_err(|error| format!("GitHub API response was invalid: {error}"))
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
        return GitHubConnectionStatus {
            state: "not-configured",
            connected: false,
            configured: false,
            login: None,
            detail: "Livariant GitHub App client ID is not configured in this build.".to_owned(),
            boundaries: boundaries(),
        };
    }
    match usable_credential().and_then(|credential| authenticated_login(&credential.access_token)) {
        Ok(login) => GitHubConnectionStatus {
            state: "connected",
            connected: true,
            configured: true,
            login: Some(login),
            detail: "GitHub is connected for bounded read capability. Connection grants no Livariant Authority.".to_owned(),
            boundaries: boundaries(),
        },
        Err(error) => GitHubConnectionStatus {
            state: "disconnected",
            connected: false,
            configured: true,
            login: None,
            detail: error,
            boundaries: boundaries(),
        },
    }
}

#[tauri::command]
pub fn github_begin_device_authorization(state: State<'_, GitHubRemoteState>) -> Result<GitHubDeviceAuthorization, String> {
    let client_id = github_client_id().ok_or_else(|| "Livariant GitHub App client ID is not configured in this build.".to_owned())?;
    let response: DeviceCodeResponse = github_post_form(&format!("{GITHUB_LOGIN}/device/code"), &[("client_id", &client_id)])?;
    let now = now_seconds();
    let expires_at = now.saturating_add(response.expires_in);
    let interval_seconds = response.interval.unwrap_or(5).max(5);
    let pending = PendingDeviceAuthorization { device_code: response.device_code, expires_at, interval_seconds };
    *state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())? = Some(pending);
    Ok(GitHubDeviceAuthorization {
        state: "verification-required",
        user_code: response.user_code,
        verification_uri: response.verification_uri,
        expires_at,
        interval_seconds,
    })
}

#[tauri::command]
pub fn github_open_verification_page() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg("https://github.com/login/device")
            .spawn()
            .map_err(|error| format!("GitHub verification page could not be opened: {error}"))?;
        return Ok(());
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Opening the GitHub verification page is not implemented for this platform yet.".to_owned())
    }
}

#[tauri::command]
pub fn github_poll_device_authorization(state: State<'_, GitHubRemoteState>) -> Result<GitHubDevicePollResult, String> {
    let client_id = github_client_id().ok_or_else(|| "Livariant GitHub App client ID is not configured in this build.".to_owned())?;
    let pending = state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())?.clone().ok_or_else(|| "No GitHub device authorization is pending.".to_owned())?;
    if pending.expires_at <= now_seconds() {
        *state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())? = None;
        return Ok(GitHubDevicePollResult { state: "expired", connected: false, login: None, retry_after_seconds: None, detail: "GitHub authorization code expired. Start again.".to_owned() });
    }
    let response: TokenResponse = github_post_form(
        &format!("{GITHUB_LOGIN}/oauth/access_token"),
        &[("client_id", &client_id), ("device_code", &pending.device_code), ("grant_type", "urn:ietf:params:oauth:grant-type:device_code")],
    )?;
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
    Ok(GitHubDevicePollResult { state: "connected", connected: true, login: Some(login), retry_after_seconds: None, detail: "GitHub authorization completed with bounded read capability.".to_owned() })
}

#[tauri::command]
pub fn github_disconnect(state: State<'_, GitHubRemoteState>) -> Result<GitHubConnectionStatus, String> {
    delete_credential()?;
    *state.pending.lock().map_err(|_| "GitHub authorization state lock is poisoned.".to_owned())? = None;
    Ok(GitHubConnectionStatus {
        state: "disconnected",
        connected: false,
        configured: github_client_id().is_some(),
        login: None,
        detail: "GitHub connection removed. Repository associations and local checkouts were not deleted.".to_owned(),
        boundaries: boundaries(),
    })
}

#[tauri::command]
pub fn github_list_repositories() -> Result<Vec<GitHubRepositorySummary>, String> {
    let credential = usable_credential()?;
    let mut repositories = Vec::new();
    for page in 1..=10 {
        let value = github_get_json(&format!("/user/repos?per_page=100&page={page}&sort=full_name&direction=asc"), &credential.access_token)?;
        let page_items = value.as_array().ok_or_else(|| "GitHub repositories response was not an array.".to_owned())?;
        if page_items.is_empty() { break; }
        for item in page_items { repositories.push(parse_repository(item)?); }
        if page_items.len() < 100 { break; }
    }
    Ok(repositories)
}

#[cfg(test)]
mod tests {
    use super::{parse_repository, StoredCredential};
    use serde_json::json;

    #[test]
    fn repository_summary_preserves_remote_identity_without_authority() {
        let summary = parse_repository(&json!({
            "id": 42,
            "full_name": "Kryt3r/livariant-internal",
            "name": "livariant-internal",
            "private": true,
            "default_branch": "main",
            "clone_url": "https://github.com/Kryt3r/livariant-internal.git",
            "html_url": "https://github.com/Kryt3r/livariant-internal",
            "archived": false,
            "owner": { "login": "Kryt3r" }
        })).unwrap();
        assert_eq!(summary.repository_id, "Kryt3r/livariant-internal");
        assert!(summary.private);
        assert_eq!(summary.default_branch, "main");
    }

    #[test]
    fn credential_json_contains_only_token_material_for_secret_store() {
        let value = serde_json::to_string(&StoredCredential {
            access_token: "ghu_example".to_owned(),
            expires_at: Some(123),
            refresh_token: Some("ghr_example".to_owned()),
            refresh_token_expires_at: Some(456),
        }).unwrap();
        assert!(value.contains("ghu_example"));
        assert!(value.contains("ghr_example"));
        assert!(!value.contains("repository"));
    }
}
