use crate::{
    operator_broadcast::OperatorBroadcastEnvelope,
    operator_broadcast_state::{
        accept_verified_broadcast, read_acceptance_state, write_acceptance_state,
    },
    operator_broadcast_transport::{fetch_bounded, MAX_RESPONSE_BYTES},
    operator_broadcast_verify::{verify_operator_broadcast, VerifiedOperatorBroadcast},
};
use std::path::Path;

/// Accepts only already-bounded transport material and preserves the trust
/// ordering: bytes -> strict envelope parse -> signature verification ->
/// replay/freshness acceptance -> durable state commit.
///
/// The caller-owned state path must be an application-controlled path. This
/// function is native-only and is not exposed as renderer IPC.
pub fn accept_bounded_response_bytes(
    response_bytes: &[u8],
    acceptance_state_path: &Path,
    now_ms: u64,
) -> Result<VerifiedOperatorBroadcast, String> {
    if response_bytes.is_empty() || response_bytes.len() > MAX_RESPONSE_BYTES {
        return Err("Operator broadcast response is outside the bounded transport contract.".to_owned());
    }

    let envelope: OperatorBroadcastEnvelope = serde_json::from_slice(response_bytes)
        .map_err(|error| format!("Operator broadcast envelope is invalid JSON: {error}"))?;

    let verified = verify_operator_broadcast(&envelope)?;

    let mut state = read_acceptance_state(acceptance_state_path)?;
    accept_verified_broadcast(&mut state, &verified, now_ms)?;
    write_acceptance_state(acceptance_state_path, &state)?;

    Ok(verified)
}

/// Fetches one bounded HTTPS response and feeds it into the same native trust
/// pipeline. Network success alone never makes remote material trusted.
pub fn fetch_verify_and_accept(
    endpoint: &str,
    acceptance_state_path: &Path,
    now_ms: u64,
) -> Result<VerifiedOperatorBroadcast, String> {
    let response_bytes = fetch_bounded(endpoint)?;
    accept_bounded_response_bytes(&response_bytes, acceptance_state_path, now_ms)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, path::PathBuf};

    fn test_path(name: &str) -> PathBuf {
        std::env::temp_dir()
            .join(format!("livariant-operator-pipeline-{name}-{}", std::process::id()))
            .join("acceptance-state.json")
    }

    fn unpinned_envelope_bytes() -> Vec<u8> {
        serde_json::to_vec(&OperatorBroadcastEnvelope {
            schema_version: 1,
            key_id: "operator-broadcast-unpinned".to_owned(),
            document: "{\"schemaVersion\":1,\"sequence\":1,\"issuedAtMs\":1000,\"expiresAtMs\":2000,\"directives\":[]}".to_owned(),
            signature: "not-a-production-signature".to_owned(),
        })
        .expect("serialize bounded envelope fixture")
    }

    #[test]
    fn malformed_envelope_cannot_create_acceptance_state() {
        let path = test_path("malformed");
        let result = accept_bounded_response_bytes(b"not-json", &path, 1_500);
        assert!(result.is_err());
        assert!(!path.exists());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn unverified_envelope_cannot_advance_or_create_acceptance_state() {
        let path = test_path("unverified");
        let result = accept_bounded_response_bytes(&unpinned_envelope_bytes(), &path, 1_500);
        assert!(result.is_err());
        assert!(!path.exists());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn oversized_material_is_rejected_before_parsing_or_state_access() {
        let path = test_path("oversized");
        let oversized = vec![b' '; MAX_RESPONSE_BYTES + 1];
        let result = accept_bounded_response_bytes(&oversized, &path, 1_500);
        assert!(result.is_err());
        assert!(!path.exists());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }

    #[test]
    fn insecure_endpoint_fails_before_state_access() {
        let path = test_path("http");
        let result = fetch_verify_and_accept(
            "http://example.invalid/operator.json",
            &path,
            1_500,
        );
        assert!(result.is_err());
        assert!(!path.exists());
        let _ = fs::remove_dir_all(path.parent().expect("parent"));
    }
}
