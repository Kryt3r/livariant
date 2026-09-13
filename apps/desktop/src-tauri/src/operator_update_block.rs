use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};
use tauri::Manager;

const STORE_SCHEMA_VERSION: u32 = 1;
const STORE_RELATIVE_PATH: [&str; 2] = ["operator-broadcast", "update-blocks.json"];
const MAX_BLOCKS: usize = 64;
const MAX_ID_CHARS: usize = 200;
const MAX_VERSION_CHARS: usize = 80;
const MAX_REASON_CHARS: usize = 2000;
const MAX_SOURCE_REF_CHARS: usize = 500;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperatorUpdateBlock {
    pub id: String,
    pub version: String,
    pub reason: String,
    pub valid_from_ms: u64,
    pub valid_until_ms: u64,
    pub source_ref: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OperatorUpdateBlockInput {
    pub id: String,
    pub version: String,
    pub reason: String,
    pub valid_from_ms: u64,
    pub valid_until_ms: u64,
    pub source_ref: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct OperatorUpdateBlockStore {
    schema_version: u32,
    blocks: Vec<OperatorUpdateBlock>,
}

fn empty_store() -> OperatorUpdateBlockStore {
    OperatorUpdateBlockStore { schema_version: STORE_SCHEMA_VERSION, blocks: Vec::new() }
}

pub fn now_ms() -> Result<u64, String> {
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

fn validate_block(block: &OperatorUpdateBlock) -> Result<(), String> {
    if block.id.trim().is_empty() || block.id.chars().count() > MAX_ID_CHARS {
        return Err("Operator update-block id is outside the bounded contract.".to_owned());
    }
    if block.version.trim().is_empty() || block.version.chars().count() > MAX_VERSION_CHARS {
        return Err("Operator update-block version is outside the bounded contract.".to_owned());
    }
    if !block
        .version
        .chars()
        .all(|value| value.is_ascii_alphanumeric() || matches!(value, '.' | '-' | '+' | '_'))
    {
        return Err("Operator update-block version contains unsupported characters.".to_owned());
    }
    if block.reason.trim().is_empty() || block.reason.chars().count() > MAX_REASON_CHARS {
        return Err("Operator update-block reason is outside the bounded contract.".to_owned());
    }
    if block.source_ref.trim().is_empty() || block.source_ref.chars().count() > MAX_SOURCE_REF_CHARS {
        return Err("Operator update-block source reference is outside the bounded contract.".to_owned());
    }
    if block.valid_from_ms == 0 || block.valid_until_ms <= block.valid_from_ms {
        return Err("Operator update-block validity window is invalid.".to_owned());
    }
    Ok(())
}

fn read_store(path: &Path) -> Result<OperatorUpdateBlockStore, String> {
    if !path.is_file() {
        return Ok(empty_store());
    }
    let bytes = fs::read(path)
        .map_err(|error| format!("Operator update-block store could not be read: {error}"))?;
    let store: OperatorUpdateBlockStore = serde_json::from_slice(&bytes)
        .map_err(|error| format!("Operator update-block store is invalid JSON: {error}"))?;
    if store.schema_version != STORE_SCHEMA_VERSION {
        return Err(format!("Unsupported operator update-block store schema {}.", store.schema_version));
    }
    if store.blocks.len() > MAX_BLOCKS {
        return Err("Operator update-block store contains too many records.".to_owned());
    }
    let mut ids = std::collections::HashSet::new();
    for block in &store.blocks {
        validate_block(block)?;
        if !ids.insert(block.id.as_str()) {
            return Err("Operator update-block store contains duplicate ids.".to_owned());
        }
    }
    Ok(store)
}

fn write_store(path: &Path, store: &OperatorUpdateBlockStore) -> Result<(), String> {
    if store.schema_version != STORE_SCHEMA_VERSION || store.blocks.len() > MAX_BLOCKS {
        return Err("Operator update-block store cannot be written outside the bounded contract.".to_owned());
    }
    for block in &store.blocks {
        validate_block(block)?;
    }
    let parent = path
        .parent()
        .ok_or_else(|| "Operator update-block store path has no parent.".to_owned())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Operator update-block directory could not be prepared: {error}"))?;
    let temp = parent.join("update-blocks.json.tmp");
    let mut encoded = serde_json::to_vec_pretty(store)
        .map_err(|error| format!("Operator update-block store could not be serialized: {error}"))?;
    encoded.push(b'\n');
    fs::write(&temp, encoded)
        .map_err(|error| format!("Operator update-block temporary store could not be written: {error}"))?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("Operator update-block previous store could not be replaced: {error}"))?;
    }
    fs::rename(&temp, path)
        .map_err(|error| format!("Operator update-block store could not be committed: {error}"))?;
    Ok(())
}

fn record_at_path(
    path: &Path,
    inputs: Vec<OperatorUpdateBlockInput>,
    timestamp_ms: u64,
) -> Result<(), String> {
    if inputs.is_empty() {
        return Ok(());
    }
    let mut store = read_store(path)?;
    store.blocks.retain(|block| block.valid_until_ms > timestamp_ms);

    for input in inputs {
        let block = OperatorUpdateBlock {
            id: input.id,
            version: input.version,
            reason: input.reason,
            valid_from_ms: input.valid_from_ms,
            valid_until_ms: input.valid_until_ms,
            source_ref: input.source_ref,
        };
        validate_block(&block)?;
        if let Some(existing) = store.blocks.iter_mut().find(|value| value.id == block.id) {
            *existing = block;
        } else {
            if store.blocks.len() >= MAX_BLOCKS {
                return Err("Operator update-block store cannot accept another record.".to_owned());
            }
            store.blocks.push(block);
        }
    }
    write_store(path, &store)
}

pub fn record_operator_update_blocks(
    app: &tauri::AppHandle,
    inputs: Vec<OperatorUpdateBlockInput>,
    timestamp_ms: u64,
) -> Result<(), String> {
    let path = store_path(app)?;
    record_at_path(&path, inputs, timestamp_ms)
}

fn blocked_at_path(path: &Path, version: &str, timestamp_ms: u64) -> Result<Option<OperatorUpdateBlock>, String> {
    let store = read_store(path)?;
    Ok(store
        .blocks
        .into_iter()
        .find(|block| {
            block.version == version
                && timestamp_ms >= block.valid_from_ms
                && timestamp_ms < block.valid_until_ms
        }))
}

/// Exact-version safety query only. Malformed/unreadable safety state returns an
/// error so callers can fail closed rather than silently treating it as absent.
pub fn blocked_version(
    app: &tauri::AppHandle,
    version: &str,
    timestamp_ms: u64,
) -> Result<Option<OperatorUpdateBlock>, String> {
    if version.trim().is_empty() {
        return Err("Updater target version must not be blank.".to_owned());
    }
    let path = store_path(app)?;
    blocked_at_path(&path, version, timestamp_ms)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_path(name: &str) -> PathBuf {
        std::env::temp_dir()
            .join(format!("livariant-update-block-{name}-{}", std::process::id()))
            .join("update-blocks.json")
    }

    fn input(id: &str, version: &str, from: u64, until: u64) -> OperatorUpdateBlockInput {
        OperatorUpdateBlockInput {
            id: id.to_owned(),
            version: version.to_owned(),
            reason: "Known bad patch.".to_owned(),
            valid_from_ms: from,
            valid_until_ms: until,
            source_ref: "operator-broadcast:test:sequence:1".to_owned(),
        }
    }

    #[test]
    fn exact_version_only_is_blocked_inside_validity_window() {
        let path = test_path("exact");
        record_at_path(&path, vec![input("block:29", "0.1.0-rc.29", 1_000, 3_000)], 1_500)
            .expect("record block");
        assert!(blocked_at_path(&path, "0.1.0-rc.29", 2_000).expect("query").is_some());
        assert!(blocked_at_path(&path, "0.1.0-rc.290", 2_000).expect("query").is_none());
        assert!(blocked_at_path(&path, "0.1.0-rc.29", 3_000).expect("query").is_none());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn idempotent_same_id_replaces_bounded_record() {
        let path = test_path("replace");
        record_at_path(&path, vec![input("block:29", "0.1.0-rc.29", 1_000, 3_000)], 1_500)
            .expect("first block");
        let mut replacement = input("block:29", "0.1.0-rc.29", 1_000, 4_000);
        replacement.reason = "Updated known-bad reason.".to_owned();
        record_at_path(&path, vec![replacement], 1_600).expect("replace block");
        let store = read_store(&path).expect("read store");
        assert_eq!(store.blocks.len(), 1);
        assert_eq!(store.blocks[0].valid_until_ms, 4_000);
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn expired_records_are_pruned_before_capacity_is_reused() {
        let path = test_path("prune");
        record_at_path(&path, vec![input("block:old", "0.1.0-rc.28", 1_000, 2_000)], 1_500)
            .expect("old block");
        record_at_path(&path, vec![input("block:new", "0.1.0-rc.29", 2_000, 4_000)], 2_500)
            .expect("new block");
        let store = read_store(&path).expect("read store");
        assert_eq!(store.blocks.len(), 1);
        assert_eq!(store.blocks[0].id, "block:new");
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn malformed_store_fails_closed() {
        let path = test_path("malformed");
        fs::create_dir_all(path.parent().expect("parent")).expect("create parent");
        fs::write(&path, br#"{\"schemaVersion\":99,\"blocks\":[]}"#).expect("write malformed");
        assert!(blocked_at_path(&path, "0.1.0-rc.29", 2_000).is_err());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }
}
