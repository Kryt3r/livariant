use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

const UPDATER_PUBLIC_KEY: &str = "";
const UPDATER_ENDPOINTS: &[&str] = &[];

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

fn configured() -> bool {
    !UPDATER_PUBLIC_KEY.trim().is_empty() && !UPDATER_ENDPOINTS.is_empty()
}

fn build_updater(app: &AppHandle) -> Result<tauri_plugin_updater::Updater, String> {
    let mut endpoints = Vec::with_capacity(UPDATER_ENDPOINTS.len());
    for endpoint in UPDATER_ENDPOINTS {
        let parsed = tauri::Url::parse(endpoint)
            .map_err(|error| format!("Configured updater endpoint is invalid: {error}"))?;
        if parsed.scheme() != "https" {
            return Err("Updater endpoints must use HTTPS.".to_owned());
        }
        endpoints.push(parsed);
    }

    app.updater_builder()
        .pubkey(UPDATER_PUBLIC_KEY)
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
            "Updater signing identity and endpoint are intentionally not configured yet. No network request was made.",
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

#[tauri::command]
pub async fn apply_update(app: AppHandle, expected_version: String) -> UpdateResult {
    let current_version = app.package_info().version.to_string();

    if !configured() {
        return result(
            "not-configured",
            current_version,
            None,
            "Updater signing identity and endpoint are intentionally not configured yet. No installation was changed.",
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn updater_is_fail_closed_until_signing_identity_and_endpoint_exist() {
        assert!(!configured());
    }
}
