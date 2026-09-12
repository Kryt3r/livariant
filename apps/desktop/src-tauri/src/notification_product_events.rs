use tauri::AppHandle;

#[cfg(target_os = "windows")]
const WINDOWS_APP_USER_MODEL_ID: &str = "dev.livariant.desktop";

#[cfg(target_os = "windows")]
const WINDOWS_TOAST_SCRIPT: &str = r#"
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02
$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($template)
$textNodes = $xml.GetElementsByTagName('text')
$textNodes.Item(0).AppendChild($xml.CreateTextNode($env:LIVARIANT_TOAST_TITLE)) | Out-Null
$textNodes.Item(1).AppendChild($xml.CreateTextNode($env:LIVARIANT_TOAST_BODY)) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($env:LIVARIANT_TOAST_APP_ID)
$notifier.Show($toast)
"#;

#[cfg(target_os = "windows")]
fn deliver_windows_notification(title: &str, body: &str) -> Result<(), String> {
    use std::{env, path::PathBuf, process::Command};
    use std::os::windows::process::CommandExt;

    if title.trim().is_empty() || body.trim().is_empty() {
        return Err("Native notification title and body must not be blank.".to_owned());
    }

    let system_root = env::var_os("SystemRoot")
        .ok_or_else(|| "Windows system root is unavailable.".to_owned())?;
    let powershell = PathBuf::from(system_root)
        .join("System32")
        .join("WindowsPowerShell")
        .join("v1.0")
        .join("powershell.exe");
    if !powershell.is_file() {
        return Err("Windows PowerShell notification host is unavailable.".to_owned());
    }

    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let status = Command::new(powershell)
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-NonInteractive", "-STA", "-Command", WINDOWS_TOAST_SCRIPT])
        .env("LIVARIANT_TOAST_APP_ID", WINDOWS_APP_USER_MODEL_ID)
        .env("LIVARIANT_TOAST_TITLE", title)
        .env("LIVARIANT_TOAST_BODY", body)
        .status()
        .map_err(|error| format!("Windows notification delivery could not start: {error}"))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Windows notification delivery exited with status {status}."))
    }
}

#[cfg(not(target_os = "windows"))]
fn deliver_windows_notification(_title: &str, _body: &str) -> Result<(), String> {
    Err("Native Windows notification delivery is unavailable on this platform.".to_owned())
}

#[tauri::command(rename = "check_for_update")]
pub async fn check_for_update_with_notifications(app: AppHandle) -> crate::updater::UpdateResult {
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
            let id = format!("updater:available:{version}");
            let title = "Livariant Update".to_owned();
            let body = format!("A signed Livariant update to version {version} is available.");

            // If the durable store cannot be read reliably, suppress native delivery fail-closed.
            // The durable record remains the source of truth; the Windows toast is only a channel.
            let existed_before = crate::notification_center::notification_center_list(app.clone())
                .map(|snapshot| snapshot.notifications.iter().any(|item| item.id == id))
                .unwrap_or(true);

            let stored = crate::notification_center::record_product_notification(
                &app,
                id,
                "update".to_owned(),
                "info".to_owned(),
                title.clone(),
                body.clone(),
                Some(format!("updater:version:{version}")),
            )
            .is_ok();

            if stored && !existed_before {
                // Delivery is deliberately best-effort. A toast failure must never change the
                // signed updater result, durable record, Authority or installation state.
                let _ = deliver_windows_notification(&title, &body);
            }
        }
    }

    outcome
}
