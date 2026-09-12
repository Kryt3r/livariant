use crate::operator_broadcast_verify::VerifiedOperatorBroadcast;
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, path::Path};

const ACCEPTANCE_STATE_SCHEMA_VERSION: u32 = 1;
const MAX_TRACKED_KEYS: usize = 16;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperatorBroadcastAcceptanceState {
    schema_version: u32,
    highest_sequence_by_key: BTreeMap<String, u64>,
}

impl Default for OperatorBroadcastAcceptanceState {
    fn default() -> Self {
        Self {
            schema_version: ACCEPTANCE_STATE_SCHEMA_VERSION,
            highest_sequence_by_key: BTreeMap::new(),
        }
    }
}

impl OperatorBroadcastAcceptanceState {
    fn validate(&self) -> Result<(), String> {
        if self.schema_version != ACCEPTANCE_STATE_SCHEMA_VERSION {
            return Err(format!(
                "Unsupported operator broadcast acceptance-state schema {}.",
                self.schema_version
            ));
        }
        if self.highest_sequence_by_key.len() > MAX_TRACKED_KEYS {
            return Err("Operator broadcast acceptance state tracks too many keys.".to_owned());
        }
        for (key_id, sequence) in &self.highest_sequence_by_key {
            validate_key_id(key_id)?;
            if *sequence == 0 {
                return Err("Operator broadcast acceptance state contains an invalid sequence.".to_owned());
            }
        }
        Ok(())
    }
}

/// Advances replay/freshness state only for a value that already crossed the
/// dedicated cryptographic verifier boundary. Raw/unverified documents cannot
/// be passed to this function.
pub fn accept_verified_broadcast(
    state: &mut OperatorBroadcastAcceptanceState,
    verified: &VerifiedOperatorBroadcast,
    now_ms: u64,
) -> Result<(), String> {
    state.validate()?;
    validate_key_id(verified.key_id())?;
    let document = verified.document();
    document.validate()?;

    if now_ms < document.issued_at_ms {
        return Err("Operator broadcast document is not yet valid.".to_owned());
    }
    if now_ms >= document.expires_at_ms {
        return Err("Operator broadcast document has expired.".to_owned());
    }

    if let Some(previous) = state.highest_sequence_by_key.get(verified.key_id()) {
        if document.sequence <= *previous {
            return Err("Operator broadcast replay or sequence rollback was rejected.".to_owned());
        }
    } else if state.highest_sequence_by_key.len() >= MAX_TRACKED_KEYS {
        return Err("Operator broadcast acceptance state cannot track another key.".to_owned());
    }

    state
        .highest_sequence_by_key
        .insert(verified.key_id().to_owned(), document.sequence);
    Ok(())
}

pub fn read_acceptance_state(path: &Path) -> Result<OperatorBroadcastAcceptanceState, String> {
    if !path.is_file() {
        return Ok(OperatorBroadcastAcceptanceState::default());
    }
    let bytes = fs::read(path)
        .map_err(|error| format!("Operator broadcast acceptance state could not be read: {error}"))?;
    let state: OperatorBroadcastAcceptanceState = serde_json::from_slice(&bytes)
        .map_err(|error| format!("Operator broadcast acceptance state is invalid JSON: {error}"))?;
    state.validate()?;
    Ok(state)
}

pub fn write_acceptance_state(
    path: &Path,
    state: &OperatorBroadcastAcceptanceState,
) -> Result<(), String> {
    state.validate()?;
    let parent = path
        .parent()
        .ok_or_else(|| "Operator broadcast acceptance-state path has no parent.".to_owned())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Operator broadcast acceptance-state directory could not be prepared: {error}"))?;
    let temp = parent.join("acceptance-state.json.tmp");
    let mut encoded = serde_json::to_vec_pretty(state)
        .map_err(|error| format!("Operator broadcast acceptance state could not be serialized: {error}"))?;
    encoded.push(b'\n');
    fs::write(&temp, encoded)
        .map_err(|error| format!("Operator broadcast temporary acceptance state could not be written: {error}"))?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("Operator broadcast previous acceptance state could not be replaced: {error}"))?;
    }
    fs::rename(&temp, path)
        .map_err(|error| format!("Operator broadcast acceptance state could not be committed: {error}"))?;
    Ok(())
}

fn validate_key_id(key_id: &str) -> Result<(), String> {
    if key_id.trim().is_empty() || key_id.len() > 80 {
        return Err("Operator broadcast key id is outside the bounded contract.".to_owned());
    }
    if !key_id
        .chars()
        .all(|value| value.is_ascii_alphanumeric() || matches!(value, '-' | '_' | '.'))
    {
        return Err("Operator broadcast key id contains unsupported characters.".to_owned());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::operator_broadcast::{OperatorBroadcastDocument, OperatorDirective, OperatorNoticeSeverity, OperatorNoticeTarget};
    use crate::operator_broadcast_verify::verified_for_test;
    use std::path::PathBuf;

    fn document(sequence: u64, issued_at_ms: u64, expires_at_ms: u64) -> OperatorBroadcastDocument {
        OperatorBroadcastDocument {
            schema_version: 1,
            sequence,
            issued_at_ms,
            expires_at_ms,
            directives: vec![OperatorDirective::Notice {
                id: format!("notice:{sequence}"),
                severity: OperatorNoticeSeverity::Info,
                title: "Service information".to_owned(),
                body: "Bounded operator notice.".to_owned(),
                valid_from_ms: issued_at_ms,
                valid_until_ms: Some(expires_at_ms),
                target: OperatorNoticeTarget::default(),
            }],
        }
    }

    fn verified(key_id: &str, sequence: u64, issued_at_ms: u64, expires_at_ms: u64) -> VerifiedOperatorBroadcast {
        verified_for_test(key_id, document(sequence, issued_at_ms, expires_at_ms))
    }

    fn test_path(name: &str) -> PathBuf {
        std::env::temp_dir()
            .join(format!("livariant-operator-broadcast-{name}-{}", std::process::id()))
            .join("acceptance-state.json")
    }

    #[test]
    fn first_verified_sequence_is_accepted_and_replay_is_rejected() {
        let mut state = OperatorBroadcastAcceptanceState::default();
        let first = verified("operator-broadcast-1", 7, 1_000, 3_000);
        accept_verified_broadcast(&mut state, &first, 2_000).expect("first verified sequence");
        assert!(accept_verified_broadcast(&mut state, &first, 2_100).is_err());
    }

    #[test]
    fn monotonic_sequence_advances_but_rollback_fails_closed() {
        let mut state = OperatorBroadcastAcceptanceState::default();
        accept_verified_broadcast(&mut state, &verified("operator-broadcast-1", 7, 1_000, 4_000), 2_000)
            .expect("first sequence");
        accept_verified_broadcast(&mut state, &verified("operator-broadcast-1", 8, 1_100, 4_100), 2_100)
            .expect("advanced sequence");
        assert!(accept_verified_broadcast(&mut state, &verified("operator-broadcast-1", 7, 1_200, 4_200), 2_200).is_err());
    }

    #[test]
    fn sequence_space_is_independent_per_signing_key() {
        let mut state = OperatorBroadcastAcceptanceState::default();
        accept_verified_broadcast(&mut state, &verified("operator-broadcast-1", 9, 1_000, 4_000), 2_000)
            .expect("key one");
        accept_verified_broadcast(&mut state, &verified("operator-broadcast-2", 1, 1_000, 4_000), 2_000)
            .expect("rotated key starts independent sequence");
    }

    #[test]
    fn future_and_expired_documents_fail_closed_without_advancing_state() {
        let mut state = OperatorBroadcastAcceptanceState::default();
        assert!(accept_verified_broadcast(&mut state, &verified("operator-broadcast-1", 3, 2_000, 4_000), 1_999).is_err());
        assert!(accept_verified_broadcast(&mut state, &verified("operator-broadcast-1", 3, 1_000, 2_000), 2_000).is_err());
        assert!(state.highest_sequence_by_key.is_empty());
    }

    #[test]
    fn persisted_state_survives_restart_and_keeps_replay_boundary() {
        let path = test_path("roundtrip");
        let mut state = read_acceptance_state(&path).expect("empty state");
        accept_verified_broadcast(&mut state, &verified("operator-broadcast-1", 12, 1_000, 4_000), 2_000)
            .expect("sequence twelve");
        write_acceptance_state(&path, &state).expect("persist state");
        let mut restored = read_acceptance_state(&path).expect("restore state");
        assert!(accept_verified_broadcast(&mut restored, &verified("operator-broadcast-1", 12, 1_000, 4_000), 2_100).is_err());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn malformed_persisted_state_fails_closed() {
        let path = test_path("malformed");
        fs::create_dir_all(path.parent().expect("parent")).expect("create test dir");
        fs::write(&path, br#"{\"schemaVersion\":99,\"highestSequenceByKey\":{}}"#)
            .expect("write malformed state");
        assert!(read_acceptance_state(&path).is_err());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }
}
