use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

const UPDATER_PUBLIC_KEY: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDEyNUJCNUJFNUNDNjc3QQpSV1I2Wjh6bFc3c2xBWnJSSFNndThoeEhoS1FubFlFU1VDSHlhNWVQS3kyZWZkZE9EYTd0eGIyaAo=";
const UPDATER_ENDPOINTS: &[&str] = &[
    "https://github.com/Kryt3r/livariant/releases/download/desktop-preview-feed/latest.json",
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResult {
    state: &'static str,
    current_version: String,
    available_version: Option<String>,
    detail: String,
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
    }
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
        Ok(Some(update)) => result(
            "available",
            current_version,
            Some(update.version.clone()),
            format!("A signed Livariant update to {} is available.", update.version),
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
        return result(
            "changed",
            current_version,
            Some(update.version.clone()),
            format!(
                "The available update changed from {expected_version} to {}. Review the new version before installing it.",
                update.version
            ),
        );
    }

    let target_version = update.version.clone();
    if let Err(error) = update.download_and_install(|_, _| {}, || {}).await {
        return result(
            "error",
            current_version,
            Some(target_version),
            format!("Signed update installation failed: {error}"),
        );
    }

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

    #[cfg(not(feature = "ci-updater-acceptance"))]
    #[test]
    fn updater_has_fixed_preview_signing_identity_and_https_endpoint() {
        assert!(configured());
        assert!(UPDATER_ENDPOINTS.iter().all(|endpoint| endpoint.starts_with("https://")));
    }
}
