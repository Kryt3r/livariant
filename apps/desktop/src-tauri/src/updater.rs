use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

const UPDATER_PUBLIC_KEY: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDEyNUJCNUJFNUNDNjc3QQpSV1I2Wjh6bFc3c2xBWnJSSFNndThoeEhoS1FubFlFU1VDSHlhNWVQS3kyZWZkZE9EYTd0eGIyaAo=";
const UPDATER_ENDPOINTS: &[&str] = &[
    "https://raw.githubusercontent.com/Kryt3r/livariant/desktop-preview-index/latest.json",
];
const UPDATER_PROGRESS_EVENT: &str = "livariant://updater-progress";

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseNotesLocale {
    title: String,
    items: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalizedReleaseNotes {
    schema_version: u32,
    de: ReleaseNotesLocale,
    en: ReleaseNotesLocale,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateProgress {
    phase: &'static str,
    target_version: String,
    downloaded_bytes: u64,
    total_bytes: Option<u64>,
    percent: Option<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResult {
    state: &'static str,
    current_version: String,
    available_version: Option<String>,
    detail: String,
    release_notes: Option<LocalizedReleaseNotes>,
}

fn result(
    state: &'static str,
    current_version: impl Into<String>,
    available_version: Option<String>,
    detail: impl Into<String>,
) -> UpdateResult {
    UpdateResult {
        state,
        current_version: current_version.into(),
        available_version,
        detail: detail.into(),
        release_notes: None,
    }
}

fn result_with_notes(
    state: &'static str,
    current_version: impl Into<String>,
    available_version: Option<String>,
    detail: impl Into<String>,
    release_notes: Option<LocalizedReleaseNotes>,
) -> UpdateResult {
    UpdateResult {
        state,
        current_version: current_version.into(),
        available_version,
        detail: detail.into(),
        release_notes,
    }
}

fn parse_release_notes(raw: Option<&str>) -> Option<LocalizedReleaseNotes> {
    let notes: LocalizedReleaseNotes = serde_json::from_str(raw?.trim()).ok()?;
    if notes.schema_version != 1
        || notes.de.title.trim().is_empty()
        || notes.en.title.trim().is_empty()
        || notes.de.items.is_empty()
        || notes.en.items.is_empty()
        || notes.de.items.iter().any(|item| item.trim().is_empty())
        || notes.en.items.iter().any(|item| item.trim().is_empty())
    {
        return None;
    }
    Some(notes)
}

fn emit_progress(app: &AppHandle, progress: UpdateProgress) {
    // Renderer progress is presentation evidence only. Failure to render it must never grant
    // authority or alter the updater's verification/install decision.
    let _ = app.emit(UPDATER_PROGRESS_EVENT, progress);
}

fn updater_configuration() -> Result<(String, Vec<String>), String> {
    #[cfg(feature = "ci-updater-acceptance")]
    {
        let public_key = std::env::var("LIVARIANT_CI_UPDATER_PUBLIC_KEY")
            .map_err(|_| "CI updater public key is missing.".to_owned())?;
        let endpoint = std::env::var("LIVARIANT_CI_UPDATER_ENDPOINT")
            .map_err(|_| "CI updater endpoint is missing.".to_owned())?;
        if public_key.trim().is_empty() || endpoint.trim().is_empty() {
            return Err("CI updater key and endpoint must not be empty.".to_owned());
        }
        return Ok((public_key, vec![endpoint]));
    }

    #[cfg(not(feature = "ci-updater-acceptance"))]
    {
        Ok((
            UPDATER_PUBLIC_KEY.to_owned(),
            UPDATER_ENDPOINTS.iter().map(|value| (*value).to_owned()).collect(),
        ))
    }
}

fn configured() -> bool {
    updater_configuration().is_ok()
}

fn validate_endpoint(endpoint: &tauri::Url) -> Result<(), String> {
    #[cfg(feature = "ci-updater-acceptance")]
    {
        let loopback = matches!(endpoint.host_str(), Some("127.0.0.1") | Some("localhost"));
        if endpoint.scheme() != "http" || !loopback {
            return Err(
                "CI updater acceptance endpoints must use loopback HTTP and are unavailable in production builds."
                    .to_owned(),
            );
        }
        return Ok(());
    }

    #[cfg(not(feature = "ci-updater-acceptance"))]
    {
        if endpoint.scheme() != "https" {
            return Err("Updater endpoints must use HTTPS.".to_owned());
        }
        Ok(())
    }
}

fn build_updater(app: &AppHandle) -> Result<tauri_plugin_updater::Updater, String> {
    let (public_key, endpoint_values) = updater_configuration()?;
    let mut endpoints = Vec::with_capacity(endpoint_values.len());
    for endpoint in endpoint_values {
        let parsed = tauri::Url::parse(&endpoint)
            .map_err(|error| format!("Configured updater endpoint is invalid: {error}"))?;
        validate_endpoint(&parsed)?;
        endpoints.push(parsed);
    }

    app.updater_builder()
        .pubkey(public_key)
        .endpoints(endpoints)
        .and_then(|builder| builder.build())
        .map_err(|error| format!("Updater could not be initialized: {error}"))
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> UpdateResult {
    let current_version = app.package_info().version.to_string();

    if !configured() {
        return result(
            "not-configured",
            current_version,
            None,
            "Updater signing identity or endpoint is missing. No network request was made.",
        );
    }

    let updater = match build_updater(&app) {
        Ok(value) => value,
        Err(error) => return result("invalid-config", current_version, None, error),
    };

    match updater.check().await {
        Ok(Some(update)) => result_with_notes(
            "available",
            current_version,
            Some(update.version.clone()),
            format!("A signed Livariant update to {} is available.", update.version),
            parse_release_notes(update.body.as_deref()),
        ),
        Ok(None) => result(
            "current",
            current_version,
            None,
            "This Livariant installation is current for the configured preview channel.",
        ),
        Err(error) => result(
            "error",
            current_version,
            None,
            format!("Update check failed without changing the installation: {error}"),
        ),
    }
}

#[tauri::command]
pub async fn apply_update(app: AppHandle, expected_version: String) -> UpdateResult {
    let current_version = app.package_info().version.to_string();

    if !configured() {
        return result(
            "not-configured",
            current_version,
            None,
            "Updater signing identity or endpoint is missing. No installation was changed.",
        );
    }

    let updater = match build_updater(&app) {
        Ok(value) => value,
        Err(error) => return result("invalid-config", current_version, None, error),
    };

    let update = match updater.check().await {
        Ok(Some(value)) => value,
        Ok(None) => {
            return result(
                "current",
                current_version,
                None,
                "No update is currently available; nothing was installed.",
            )
        }
        Err(error) => {
            return result(
                "error",
                current_version,
                None,
                format!("Update re-check failed without changing the installation: {error}"),
            )
        }
    };

    if update.version != expected_version {
        return result_with_notes(
            "changed",
            current_version,
            Some(update.version.clone()),
            format!(
                "The available update changed from {expected_version} to {}. Review the new version before installing it.",
                update.version
            ),
            parse_release_notes(update.body.as_deref()),
        );
    }

    let target_version = update.version.clone();
    emit_progress(
        &app,
        UpdateProgress {
            phase: "preparing",
            target_version: target_version.clone(),
            downloaded_bytes: 0,
            total_bytes: None,
            percent: None,
        },
    );

    let downloaded = Arc::new(AtomicU64::new(0));
    let known_total = Arc::new(AtomicU64::new(0));
    let download_app = app.clone();
    let download_version = target_version.clone();
    let download_counter = Arc::clone(&downloaded);
    let total_counter = Arc::clone(&known_total);
    let finished_app = app.clone();
    let finished_version = target_version.clone();
    let finished_downloaded = Arc::clone(&downloaded);
    let finished_total = Arc::clone(&known_total);

    if let Err(error) = update
        .download_and_install(
            move |chunk_length, content_length| {
                let observed = download_counter.fetch_add(chunk_length as u64, Ordering::Relaxed)
                    + chunk_length as u64;
                if let Some(total) = content_length {
                    total_counter.store(total, Ordering::Relaxed);
                }
                let total = total_counter.load(Ordering::Relaxed);
                let percent = if total > 0 {
                    Some(((observed.saturating_mul(100) / total).min(100)) as u8)
                } else {
                    None
                };
                emit_progress(
                    &download_app,
                    UpdateProgress {
                        phase: "downloading",
                        target_version: download_version.clone(),
                        downloaded_bytes: observed,
                        total_bytes: (total > 0).then_some(total),
                        percent,
                    },
                );
            },
            move || {
                let total = finished_total.load(Ordering::Relaxed);
                emit_progress(
                    &finished_app,
                    UpdateProgress {
                        phase: "downloaded",
                        target_version: finished_version.clone(),
                        downloaded_bytes: finished_downloaded.load(Ordering::Relaxed),
                        total_bytes: (total > 0).then_some(total),
                        percent: (total > 0).then_some(100),
                    },
                );
            },
        )
        .await
    {
        return result(
            "error",
            current_version,
            Some(target_version),
            format!("Signed update installation failed: {error}"),
        );
    }

    emit_progress(
        &app,
        UpdateProgress {
            phase: "restarting",
            target_version: target_version.clone(),
            downloaded_bytes: downloaded.load(Ordering::Relaxed),
            total_bytes: {
                let total = known_total.load(Ordering::Relaxed);
                (total > 0).then_some(total)
            },
            percent: Some(100),
        },
    );

    // Give the renderer a brief, bounded chance to present the truthful "installed/restarting"
    // state before Windows replaces the running process. This is presentation only.
    std::thread::sleep(Duration::from_millis(650));
    app.restart();
}

#[cfg(feature = "ci-updater-acceptance")]
fn write_ci_result(outcome: &UpdateResult) {
    let Ok(path) = std::env::var("LIVARIANT_CI_RESULT_PATH") else {
        return;
    };
    let Ok(json) = serde_json::to_vec_pretty(outcome) else {
        return;
    };
    let _ = std::fs::write(path, json);
}

#[cfg(feature = "ci-updater-acceptance")]
pub fn start_ci_acceptance_if_requested(app: AppHandle) {
    if std::env::var("LIVARIANT_CI_UPDATER_ACCEPTANCE").ok().as_deref() != Some("1") {
        return;
    }

    let expected_version = match std::env::var("LIVARIANT_CI_EXPECTED_VERSION") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            let outcome = result(
                "invalid-config",
                app.package_info().version.to_string(),
                None,
                "CI expected version is missing.",
            );
            write_ci_result(&outcome);
            app.exit(2);
            return;
        }
    };

    tauri::async_runtime::spawn(async move {
        let outcome = apply_update(app.clone(), expected_version.clone()).await;
        let accepted = outcome.state == "current" && outcome.current_version == expected_version;
        write_ci_result(&outcome);
        app.exit(if accepted { 0 } else { 2 });
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn localized_release_notes_require_both_languages_and_schema_one() {
        let valid = r#"{
            "schemaVersion": 1,
            "de": {"title": "Neu", "items": ["Deutsch"]},
            "en": {"title": "New", "items": ["English"]}
        }"#;
        assert!(parse_release_notes(Some(valid)).is_some());

        let missing_english = r#"{
            "schemaVersion": 1,
            "de": {"title": "Neu", "items": ["Deutsch"]},
            "en": {"title": "", "items": []}
        }"#;
        assert!(parse_release_notes(Some(missing_english)).is_none());
        assert!(parse_release_notes(Some("plain legacy notes")).is_none());
    }

    #[cfg(not(feature = "ci-updater-acceptance"))]
    #[test]
    fn updater_has_fixed_preview_signing_identity_and_https_endpoint() {
        assert!(configured());
        assert!(UPDATER_ENDPOINTS.iter().all(|endpoint| endpoint.starts_with("https://")));
    }
}
