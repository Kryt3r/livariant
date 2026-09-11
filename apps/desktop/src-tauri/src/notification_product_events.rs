use tauri::AppHandle;

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> crate::updater::UpdateResult {
    let outcome = crate::updater::check_for_update(app.clone()).await;

    let serialized = serde_json::to_value(&outcome).ok();
    let state = serialized
        .as_ref()
        .and_then(|value| value.get("state"))
        .and_then(serde_json::Value::as_str);
    let available_version = serialized
        .as_ref()
        .and_then(|value| value.get("availableVersion"))
        .and_then(serde_json::Value::as_str);

    if state == Some("available") {
        if let Some(version) = available_version {
            let _ = crate::notification_center::record_product_notification(
                &app,
                format!("updater:available:{version}"),
                "update".to_owned(),
                "info".to_owned(),
                "Livariant Update".to_owned(),
                format!("A signed Livariant update to version {version} is available."),
                Some(format!("updater:version:{version}")),
            );
        }
    }

    outcome
}
