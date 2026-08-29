use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

const UPDATER_PUBLIC_KEY: &str = "";
const UPDATER_ENDPOINTS: &[&str] = &[];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
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
) -> UpdateCheckResult {
    UpdateCheckResult {
        state,
        current_version: current_version.into(),
        available_version,
        detail: detail.into(),
    }
}

fn configured() -> bool {
    !UPDATER_PUBLIC_KEY.trim().is_empty() && !UPDATER_ENDPOINTS.is_empty()
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> UpdateCheckResult {
    let current_version = app.package_info().version.to_string();

    if !configured() {
        return result(
            "not-configured",
            current_version,
            None,
            "Updater signing identity and endpoint are intentionally not configured yet. No network request was made.",
        );
    }

    let mut endpoints = Vec::with_capacity(UPDATER_ENDPOINTS.len());
    for endpoint in UPDATER_ENDPOINTS {
        let parsed = match tauri::Url::parse(endpoint) {
            Ok(value) => value,
            Err(error) => {
                return result(
                    "invalid-config",
                    current_version,
                    None,
                    format!("Configured updater endpoint is invalid: {error}"),
                )
            }
        };
        if parsed.scheme() != "https" {
            return result(
                "invalid-config",
                current_version,
                None,
                "Updater endpoints must use HTTPS.",
            );
        }
        endpoints.push(parsed);
    }

    let updater = match app
        .updater_builder()
        .pubkey(UPDATER_PUBLIC_KEY)
        .endpoints(endpoints)
        .and_then(|builder| builder.build())
    {
        Ok(value) => value,
        Err(error) => {
            return result(
                "error",
                current_version,
                None,
                format!("Updater could not be initialized: {error}"),
            )
        }
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
            "This Livariant installation is current for the configured update channel.",
        ),
        Err(error) => result(
            "error",
            current_version,
            None,
            format!("Update check failed without changing the installation: {error}"),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn updater_is_fail_closed_until_signing_identity_and_endpoint_exist() {
        assert!(!configured());
    }
}
