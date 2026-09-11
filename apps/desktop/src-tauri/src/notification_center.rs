use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

const STORE_SCHEMA_VERSION: u32 = 1;
const STORE_RELATIVE_PATH: [&str; 2] = ["notifications", "center.json"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DurableNotification {
    pub id: String,
    pub category: String,
    pub severity: String,
    pub title: String,
    pub body: String,
    pub created_at_ms: u64,
    pub read_at_ms: Option<u64>,
    pub source_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct NotificationStore {
    schema_version: u32,
    notifications: Vec<DurableNotification>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NotificationCenterSnapshot {
    pub schema_version: u32,
    pub unread_count: usize,
    pub notifications: Vec<DurableNotification>,
}

fn now_ms() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("System clock is before Unix epoch: {error}"))?;
    u64::try_from(duration.as_millis()).map_err(|_| "System timestamp is too large.".to_owned())
}

fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?;
    Ok(root.join(STORE_RELATIVE_PATH[0]).join(STORE_RELATIVE_PATH[1]))
}

fn empty_store() -> NotificationStore {
    NotificationStore { schema_version: STORE_SCHEMA_VERSION, notifications: Vec::new() }
}

fn validate_notification(notification: &DurableNotification) -> Result<(), String> {
    for (label, value) in [
        ("id", notification.id.as_str()),
        ("category", notification.category.as_str()),
        ("severity", notification.severity.as_str()),
        ("title", notification.title.as_str()),
    ] {
        if value.trim().is_empty() {
            return Err(format!("Notification {label} must not be blank."));
        }
    }
    if notification.id.len() > 200 || notification.category.len() > 80 || notification.severity.len() > 40 {
        return Err("Notification identity metadata exceeds the bounded store contract.".to_owned());
    }
    if notification.title.len() > 240 || notification.body.len() > 4000 {
        return Err("Notification presentation text exceeds the bounded store contract.".to_owned());
    }
    if notification.source_ref.as_ref().is_some_and(|value| value.len() > 500) {
        return Err("Notification source reference exceeds the bounded store contract.".to_owned());
    }
    Ok(())
}

fn read_store(path: &Path) -> Result<NotificationStore, String> {
    if !path.is_file() {
        return Ok(empty_store());
    }
    let bytes = fs::read(path).map_err(|error| format!("Notification Center store could not be read: {error}"))?;
    let store: NotificationStore = serde_json::from_slice(&bytes)
        .map_err(|error| format!("Notification Center store is invalid JSON: {error}"))?;
    if store.schema_version != STORE_SCHEMA_VERSION {
        return Err(format!("Unsupported Notification Center store schema {}.", store.schema_version));
    }
    let mut seen = std::collections::HashSet::new();
    for notification in &store.notifications {
        validate_notification(notification)?;
        if !seen.insert(notification.id.as_str()) {
            return Err("Notification Center store contains duplicate notification ids.".to_owned());
        }
    }
    Ok(store)
}

fn write_store(path: &Path, store: &NotificationStore) -> Result<(), String> {
    if store.schema_version != STORE_SCHEMA_VERSION {
        return Err("Notification Center store schema cannot be written.".to_owned());
    }
    for notification in &store.notifications {
        validate_notification(notification)?;
    }
    let parent = path.parent().ok_or_else(|| "Notification Center store path has no parent.".to_owned())?;
    fs::create_dir_all(parent).map_err(|error| format!("Notification Center directory could not be prepared: {error}"))?;
    let temp = parent.join("center.json.tmp");
    let mut encoded = serde_json::to_vec_pretty(store)
        .map_err(|error| format!("Notification Center store could not be serialized: {error}"))?;
    encoded.push(b'\n');
    fs::write(&temp, encoded).map_err(|error| format!("Notification Center temporary store could not be written: {error}"))?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| format!("Notification Center previous store could not be replaced: {error}"))?;
    }
    fs::rename(&temp, path).map_err(|error| format!("Notification Center store could not be committed: {error}"))?;
    Ok(())
}

fn snapshot(mut store: NotificationStore) -> NotificationCenterSnapshot {
    store.notifications.sort_by(|left, right| {
        right.created_at_ms.cmp(&left.created_at_ms).then_with(|| left.id.cmp(&right.id))
    });
    let unread_count = store.notifications.iter().filter(|item| item.read_at_ms.is_none()).count();
    NotificationCenterSnapshot {
        schema_version: store.schema_version,
        unread_count,
        notifications: store.notifications,
    }
}

#[tauri::command]
pub fn notification_center_list(app: tauri::AppHandle) -> Result<NotificationCenterSnapshot, String> {
    let path = store_path(&app)?;
    read_store(&path).map(snapshot)
}

#[tauri::command]
pub fn notification_center_set_read(
    app: tauri::AppHandle,
    id: String,
    read: bool,
) -> Result<NotificationCenterSnapshot, String> {
    if id.trim().is_empty() {
        return Err("Notification id must not be blank.".to_owned());
    }
    let path = store_path(&app)?;
    let mut store = read_store(&path)?;
    let Some(notification) = store.notifications.iter_mut().find(|item| item.id == id) else {
        return Err("Notification Center record was not found.".to_owned());
    };
    notification.read_at_ms = if read { Some(now_ms()?) } else { None };
    write_store(&path, &store)?;
    Ok(snapshot(store))
}

#[tauri::command]
pub fn notification_center_mark_all_read(app: tauri::AppHandle) -> Result<NotificationCenterSnapshot, String> {
    let path = store_path(&app)?;
    let mut store = read_store(&path)?;
    let timestamp = now_ms()?;
    for notification in &mut store.notifications {
        if notification.read_at_ms.is_none() {
            notification.read_at_ms = Some(timestamp);
        }
    }
    write_store(&path, &store)?;
    Ok(snapshot(store))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_root(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("livariant-notification-center-{name}-{}", std::process::id()))
    }

    fn fixture(id: &str, created_at_ms: u64, read_at_ms: Option<u64>) -> DurableNotification {
        DurableNotification {
            id: id.to_owned(),
            category: "connection".to_owned(),
            severity: "info".to_owned(),
            title: format!("Notification {id}"),
            body: "Bounded durable product event.".to_owned(),
            created_at_ms,
            read_at_ms,
            source_ref: Some("connection:codex".to_owned()),
        }
    }

    #[test]
    fn missing_store_reads_as_empty_snapshot() {
        let root = test_root("empty");
        let path = root.join("center.json");
        let result = snapshot(read_store(&path).expect("read empty store"));
        assert_eq!(result.schema_version, 1);
        assert_eq!(result.unread_count, 0);
        assert!(result.notifications.is_empty());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn store_roundtrip_preserves_unread_state_and_orders_newest_first() {
        let root = test_root("roundtrip");
        let path = root.join("center.json");
        let store = NotificationStore {
            schema_version: 1,
            notifications: vec![fixture("older", 10, None), fixture("newer", 20, Some(30))],
        };
        write_store(&path, &store).expect("write store");
        let result = snapshot(read_store(&path).expect("read store"));
        assert_eq!(result.unread_count, 1);
        assert_eq!(result.notifications[0].id, "newer");
        assert_eq!(result.notifications[1].id, "older");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn malformed_or_duplicate_records_fail_closed() {
        let root = test_root("invalid");
        let path = root.join("center.json");
        fs::create_dir_all(&root).expect("create root");
        fs::write(&path, br#"{"schemaVersion":2,"notifications":[]}"#).expect("write schema mismatch");
        assert!(read_store(&path).is_err());

        let duplicate = NotificationStore {
            schema_version: 1,
            notifications: vec![fixture("same", 10, None), fixture("same", 20, None)],
        };
        let bytes = serde_json::to_vec(&duplicate).expect("encode duplicate fixture");
        fs::write(&path, bytes).expect("write duplicate fixture");
        assert!(read_store(&path).is_err());
        let _ = fs::remove_dir_all(root);
    }
}
