use crate::operator_broadcast_status::{OperatorBroadcastRuntimeStatus, STATUS_SCHEMA_VERSION};
use std::{fs, path::Path};

pub fn read(path: &Path) -> Result<OperatorBroadcastRuntimeStatus, String> {
    if !path.is_file() {
        return Ok(OperatorBroadcastRuntimeStatus::default());
    }
    let bytes = fs::read(path).map_err(|_| "Broadcast status could not be read.".to_owned())?;
    let status: OperatorBroadcastRuntimeStatus = serde_json::from_slice(&bytes)
        .map_err(|_| "Broadcast status is invalid.".to_owned())?;
    if status.schema_version != STATUS_SCHEMA_VERSION {
        return Err("Broadcast status schema is unsupported.".to_owned());
    }
    Ok(status)
}

pub fn write(path: &Path, status: &OperatorBroadcastRuntimeStatus) -> Result<(), String> {
    if status.schema_version != STATUS_SCHEMA_VERSION {
        return Err("Broadcast status schema is unsupported.".to_owned());
    }
    let parent = path.parent().ok_or_else(|| "Broadcast status path is invalid.".to_owned())?;
    fs::create_dir_all(parent).map_err(|_| "Broadcast status directory could not be prepared.".to_owned())?;
    let bytes = serde_json::to_vec_pretty(status).map_err(|_| "Broadcast status could not be serialized.".to_owned())?;
    fs::write(path, bytes).map_err(|_| "Broadcast status could not be written.".to_owned())
}
