use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};
use tauri::{Emitter, Manager};

const STORE_SCHEMA_VERSION: u32 = 1;
const STORE_RELATIVE_PATH: [&str; 2] = ["operator-broadcast", "live-notices.json"];
const MAX_NOTICES: usize = 64;
const MAX_ID_CHARS: usize = 220;
const MAX_TITLE_CHARS: usize = 240;
const MAX_BODY_CHARS: usize = 4_000;
const MAX_SOURCE_REF_CHARS: usize = 500;
pub const OPERATOR_LIVE_NOTICES_CHANGED_EVENT: &str = "livariant://operator-live-notices-changed";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperatorLiveNotice {
    pub id: String,
    pub severity: String,
    pub title: String,
    pub body: String,
    pub created_at_ms: u64,
    pub active_until_ms: u64,
    pub source_ref: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OperatorLiveNoticeInput {
    pub id: String,
    pub severity: String,
    pub title: String,
    pub body: String,
    pub active_until_ms: u64,
    pub source_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct OperatorLiveNoticeStore {
    schema_version: u32,
    notices: Vec<OperatorLiveNotice>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OperatorLiveNoticeSnapshot {
    pub schema_version: u32,
    pub notices: Vec<OperatorLiveNotice>,
}

fn empty_store() -> OperatorLiveNoticeStore {
    OperatorLiveNoticeStore { schema_version: STORE_SCHEMA_VERSION, notices: Vec::new() }
}

fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Livariant app-data location could not be resolved: {error}"))?;
    Ok(root.join(STORE_RELATIVE_PATH[0]).join(STORE_RELATIVE_PATH[1]))
}

fn validate_notice(notice: &OperatorLiveNotice) -> Result<(), String> {
    if notice.id.trim().is_empty() || notice.id.chars().count() > MAX_ID_CHARS {
        return Err("Operator live notice id is outside the bounded contract.".to_owned());
    }
    if !matches!(notice.severity.as_str(), "info" | "warning" | "critical") {
        return Err("Operator live notice severity is unsupported.".to_owned());
    }
    if notice.title.trim().is_empty() || notice.title.chars().count() > MAX_TITLE_CHARS {
        return Err("Operator live notice title is outside the bounded contract.".to_owned());
    }
    if notice.body.trim().is_empty() || notice.body.chars().count() > MAX_BODY_CHARS {
        return Err("Operator live notice body is outside the bounded contract.".to_owned());
    }
    if notice.created_at_ms == 0 || notice.active_until_ms <= notice.created_at_ms {
        return Err("Operator live notice lifecycle is invalid.".to_owned());
    }
    if notice.source_ref.as_ref().is_some_and(|value| value.trim().is_empty() || value.chars().count() > MAX_SOURCE_REF_CHARS) {
        return Err("Operator live notice source reference is outside the bounded contract.".to_owned());
    }
    Ok(())
}

fn read_store(path: &Path) -> Result<OperatorLiveNoticeStore, String> {
    if !path.is_file() {
        return Ok(empty_store());
    }
    let bytes = fs::read(path)
        .map_err(|error| format!("Operator live notice store could not be read: {error}"))?;
    let store: OperatorLiveNoticeStore = serde_json::from_slice(&bytes)
        .map_err(|error| format!("Operator live notice store is invalid JSON: {error}"))?;
    if store.schema_version != STORE_SCHEMA_VERSION {
        return Err(format!("Unsupported operator live notice store schema {}.", store.schema_version));
    }
    if store.notices.len() > MAX_NOTICES {
        return Err("Operator live notice store contains too many records.".to_owned());
    }
    let mut ids = HashSet::new();
    for notice in &store.notices {
        validate_notice(notice)?;
        if !ids.insert(notice.id.as_str()) {
            return Err("Operator live notice store contains duplicate ids.".to_owned());
        }
    }
    Ok(store)
}

fn write_store(path: &Path, store: &OperatorLiveNoticeStore) -> Result<(), String> {
    if store.schema_version != STORE_SCHEMA_VERSION || store.notices.len() > MAX_NOTICES {
        return Err("Operator live notice store cannot be written outside the bounded contract.".to_owned());
    }
    for notice in &store.notices {
        validate_notice(notice)?;
    }
    let parent = path
        .parent()
        .ok_or_else(|| "Operator live notice store path has no parent.".to_owned())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Operator live notice directory could not be prepared: {error}"))?;
    let temp = parent.join("live-notices.json.tmp");
    let mut encoded = serde_json::to_vec_pretty(store)
        .map_err(|error| format!("Operator live notice store could not be serialized: {error}"))?;
    encoded.push(b'\n');
    fs::write(&temp, encoded)
        .map_err(|error| format!("Operator live notice temporary store could not be written: {error}"))?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("Operator live notice previous store could not be replaced: {error}"))?;
    }
    fs::rename(&temp, path)
        .map_err(|error| format!("Operator live notice store could not be committed: {error}"))?;
    Ok(())
}

fn snapshot(mut store: OperatorLiveNoticeStore, timestamp_ms: u64) -> OperatorLiveNoticeSnapshot {
    store.notices.retain(|notice| notice.active_until_ms > timestamp_ms);
    store.notices.sort_by(|left, right| left.created_at_ms.cmp(&right.created_at_ms).then_with(|| left.id.cmp(&right.id)));
    OperatorLiveNoticeSnapshot { schema_version: store.schema_version, notices: store.notices }
}

fn reconcile_at_path(
    path: &Path,
    inputs: Vec<OperatorLiveNoticeInput>,
    withdrawn_ids: Vec<String>,
    timestamp_ms: u64,
) -> Result<(OperatorLiveNoticeSnapshot, bool), String> {
    let mut store = read_store(path)?;
    let before = store.notices.clone();
    store.notices.retain(|notice| notice.active_until_ms > timestamp_ms);
    let mut batch_ids = HashSet::new();

    for input in inputs {
        if !batch_ids.insert(input.id.clone()) {
            return Err("Operator live notice batch contains duplicate ids.".to_owned());
        }
        let mut notice = OperatorLiveNotice {
            id: input.id,
            severity: input.severity,
            title: input.title,
            body: input.body,
            created_at_ms: timestamp_ms,
            active_until_ms: input.active_until_ms,
            source_ref: input.source_ref,
        };
        validate_notice(&notice)?;
        if let Some(existing) = store.notices.iter_mut().find(|value| value.id == notice.id) {
            notice.created_at_ms = existing.created_at_ms;
            *existing = notice;
        } else {
            if store.notices.len() >= MAX_NOTICES {
                return Err("Operator live notice store cannot accept another record.".to_owned());
            }
            store.notices.push(notice);
        }
    }

    let withdrawn: HashSet<_> = withdrawn_ids.into_iter().collect();
    if withdrawn.len() > MAX_NOTICES {
        return Err("Operator live notice withdrawal batch is outside the bounded contract.".to_owned());
    }
    store.notices.retain(|notice| !withdrawn.contains(&notice.id));

    let changed = store.notices != before;
    if changed {
        write_store(path, &store)?;
    }
    Ok((snapshot(store, timestamp_ms), changed))
}

pub fn record_operator_live_notices(
    app: &tauri::AppHandle,
    inputs: Vec<OperatorLiveNoticeInput>,
    withdrawn_ids: Vec<String>,
    timestamp_ms: u64,
) -> Result<OperatorLiveNoticeSnapshot, String> {
    let (snapshot, changed) = reconcile_at_path(&store_path(app)?, inputs, withdrawn_ids, timestamp_ms)?;
    if changed {
        let _ = app.emit(OPERATOR_LIVE_NOTICES_CHANGED_EVENT, ());
    }
    Ok(snapshot)
}

#[tauri::command]
pub fn operator_live_notice_list(app: tauri::AppHandle) -> Result<OperatorLiveNoticeSnapshot, String> {
    let timestamp_ms = crate::operator_update_block::now_ms()?;
    Ok(snapshot(read_store(&store_path(&app)?)?, timestamp_ms))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_path(name: &str) -> PathBuf {
        std::env::temp_dir()
            .join(format!("livariant-operator-live-notice-{name}-{}", std::process::id()))
            .join("live-notices.json")
    }

    fn input(id: &str, until: u64) -> OperatorLiveNoticeInput {
        OperatorLiveNoticeInput {
            id: id.to_owned(), severity: "warning".to_owned(), title: "Service status".to_owned(),
            body: "A bounded operator notice.".to_owned(), active_until_ms: until,
            source_ref: Some("operator-broadcast:test:sequence:1".to_owned()),
        }
    }

    #[test]
    fn missing_store_has_empty_snapshot_and_roundtrips() {
        let path = test_path("roundtrip");
        assert!(snapshot(read_store(&path).expect("empty store"), 1_500).notices.is_empty());
        reconcile_at_path(&path, vec![input("operator:notice:one", 3_000)], Vec::new(), 1_500).expect("store notice");
        let stored = snapshot(read_store(&path).expect("read store"), 1_600);
        assert_eq!(stored.notices.len(), 1);
        assert_eq!(stored.notices[0].id, "operator:notice:one");
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn duplicate_ids_fail_closed_and_upsert_is_idempotent() {
        let path = test_path("duplicates");
        assert!(reconcile_at_path(&path, vec![input("operator:notice:one", 3_000), input("operator:notice:one", 3_000)], Vec::new(), 1_500).is_err());
        reconcile_at_path(&path, vec![input("operator:notice:one", 3_000)], Vec::new(), 1_500).expect("first upsert");
        reconcile_at_path(&path, vec![input("operator:notice:one", 4_000)], Vec::new(), 1_600).expect("second upsert");
        let stored = snapshot(read_store(&path).expect("read store"), 1_700);
        assert_eq!(stored.notices.len(), 1);
        assert_eq!(stored.notices[0].created_at_ms, 1_500);
        assert_eq!(stored.notices[0].active_until_ms, 4_000);
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn expiry_and_withdrawal_remove_only_live_state() {
        let path = test_path("lifecycle");
        reconcile_at_path(&path, vec![input("operator:notice:expired", 2_000)], Vec::new(), 1_500).expect("store expiring notice");
        assert!(reconcile_at_path(&path, Vec::new(), Vec::new(), 2_000).expect("expire notice").0.notices.is_empty());
        reconcile_at_path(&path, vec![input("operator:notice:withdrawn", 4_000)], Vec::new(), 2_100).expect("store withdrawn notice");
        assert!(reconcile_at_path(&path, Vec::new(), vec!["operator:notice:withdrawn".to_owned()], 2_200).expect("withdraw notice").0.notices.is_empty());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn invalid_store_fails_closed() {
        let path = test_path("invalid");
        fs::create_dir_all(path.parent().expect("parent")).expect("create parent");
        fs::write(&path, br#"{\"schemaVersion\":1,\"notices\":[{\"id\":\"same\"},{\"id\":\"same\"}]}"#).expect("write malformed store");
        assert!(reconcile_at_path(&path, Vec::new(), Vec::new(), 1_500).is_err());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }
}
