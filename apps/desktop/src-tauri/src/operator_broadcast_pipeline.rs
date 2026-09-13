use crate::{
    notification_center::{record_product_notifications, ProductNotificationInput},
    operator_broadcast::{
        OperatorBroadcastEnvelope, OperatorDirective, OperatorNoticeSeverity, OperatorNoticeTarget,
    },
    operator_broadcast_state::{
        accept_verified_broadcast, read_acceptance_state, write_acceptance_state,
        OperatorBroadcastAcceptanceState,
    },
    operator_broadcast_transport::{fetch_bounded, MAX_RESPONSE_BYTES},
    operator_broadcast_verify::{verify_operator_broadcast, VerifiedOperatorBroadcast},
    operator_update_block::{record_operator_update_blocks, OperatorUpdateBlockInput},
};
use std::path::Path;
use tauri::AppHandle;

/// Parses, verifies and checks replay/freshness in memory without committing the
/// durable replay state yet. This lets downstream durable consumers finish
/// before the sequence is irreversibly advanced on disk.
fn prepare_bounded_response_bytes(
    response_bytes: &[u8],
    acceptance_state_path: &Path,
    now_ms: u64,
) -> Result<(VerifiedOperatorBroadcast, OperatorBroadcastAcceptanceState), String> {
    if response_bytes.is_empty() || response_bytes.len() > MAX_RESPONSE_BYTES {
        return Err("Operator broadcast response is outside the bounded transport contract.".to_owned());
    }

    let envelope: OperatorBroadcastEnvelope = serde_json::from_slice(response_bytes)
        .map_err(|error| format!("Operator broadcast envelope is invalid JSON: {error}"))?;
    let verified = verify_operator_broadcast(&envelope)?;

    let mut state = read_acceptance_state(acceptance_state_path)?;
    accept_verified_broadcast(&mut state, &verified, now_ms)?;
    Ok((verified, state))
}

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
    let (verified, state) =
        prepare_bounded_response_bytes(response_bytes, acceptance_state_path, now_ms)?;
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

fn notice_target_matches(target: &OperatorNoticeTarget, platform: &str, desktop_version: &str) -> bool {
    if target.platform.as_deref().is_some_and(|expected| expected != platform) {
        return false;
    }
    if target
        .desktop_version_prefix
        .as_deref()
        .is_some_and(|prefix| !desktop_version.starts_with(prefix))
    {
        return false;
    }
    true
}

fn notice_severity(severity: &OperatorNoticeSeverity) -> &'static str {
    match severity {
        OperatorNoticeSeverity::Info => "info",
        OperatorNoticeSeverity::Warning => "warning",
        OperatorNoticeSeverity::Critical => "critical",
    }
}

fn collect_notice_inputs(
    verified: &VerifiedOperatorBroadcast,
    now_ms: u64,
    platform: &str,
    desktop_version: &str,
) -> Result<Vec<ProductNotificationInput>, String> {
    let document = verified.document();
    let source_ref = format!(
        "operator-broadcast:{}:sequence:{}",
        verified.key_id(),
        document.sequence
    );
    let mut inputs = Vec::new();

    for directive in &document.directives {
        match directive {
            OperatorDirective::Notice {
                id,
                severity,
                title,
                body,
                valid_from_ms,
                valid_until_ms,
                target,
            } => {
                if now_ms < *valid_from_ms {
                    return Err("Operator broadcast contains a notice that is not yet active; replay state was not advanced.".to_owned());
                }
                if valid_until_ms.is_some_and(|until| now_ms >= until) {
                    continue;
                }
                if !notice_target_matches(target, platform, desktop_version) {
                    return Err("Operator broadcast notice targets a different client identity; replay state was not advanced.".to_owned());
                }

                inputs.push(ProductNotificationInput {
                    id: format!("operator:{id}"),
                    category: "operator".to_owned(),
                    severity: notice_severity(severity).to_owned(),
                    title: title.clone(),
                    body: body.clone(),
                    source_ref: Some(source_ref.clone()),
                });
            }
            OperatorDirective::UpdateBlock { .. } => {}
        }
    }

    Ok(inputs)
}

fn collect_update_block_inputs(
    verified: &VerifiedOperatorBroadcast,
    now_ms: u64,
) -> Result<Vec<OperatorUpdateBlockInput>, String> {
    let document = verified.document();
    let source_ref = format!(
        "operator-broadcast:{}:sequence:{}",
        verified.key_id(),
        document.sequence
    );
    let mut inputs = Vec::new();

    for directive in &document.directives {
        let OperatorDirective::UpdateBlock {
            id,
            version,
            reason,
            valid_from_ms,
            valid_until_ms,
        } = directive
        else {
            continue;
        };

        if now_ms < *valid_from_ms {
            return Err("Operator broadcast contains an update block that is not yet active; replay state was not advanced.".to_owned());
        }
        if valid_until_ms.is_some_and(|until| now_ms >= until) {
            continue;
        }

        let effective_until_ms = valid_until_ms
            .unwrap_or(document.expires_at_ms)
            .min(document.expires_at_ms);
        if effective_until_ms <= now_ms {
            continue;
        }

        inputs.push(OperatorUpdateBlockInput {
            id: id.clone(),
            version: version.clone(),
            reason: reason.clone(),
            valid_from_ms: *valid_from_ms,
            valid_until_ms: effective_until_ms,
            source_ref: source_ref.clone(),
        });
    }

    Ok(inputs)
}

/// Native-only durable operator-state path. The verified/replay-eligible
/// document is fully mapped first. Exact-version update blocks and notices are
/// then written idempotently; only after all durable consumers succeed is the
/// replay sequence committed. Retrying after a final state-write failure is
/// therefore safe and cannot create duplicate Notification Center records.
pub fn accept_bounded_response_and_record_notices(
    app: &AppHandle,
    response_bytes: &[u8],
    acceptance_state_path: &Path,
    now_ms: u64,
) -> Result<VerifiedOperatorBroadcast, String> {
    let (verified, state) =
        prepare_bounded_response_bytes(response_bytes, acceptance_state_path, now_ms)?;

    let platform = if cfg!(target_os = "windows") {
        "windows"
    } else {
        std::env::consts::OS
    };
    let notice_inputs =
        collect_notice_inputs(&verified, now_ms, platform, env!("CARGO_PKG_VERSION"))?;
    let update_block_inputs = collect_update_block_inputs(&verified, now_ms)?;

    if !update_block_inputs.is_empty() {
        record_operator_update_blocks(app, update_block_inputs, now_ms)?;
    }
    if !notice_inputs.is_empty() {
        record_product_notifications(app, notice_inputs)?;
    }

    write_acceptance_state(acceptance_state_path, &state)?;
    Ok(verified)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::operator_broadcast::{OperatorBroadcastDocument, OperatorNoticeTarget};
    use crate::operator_broadcast_verify::verified_for_test;
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

    fn verified_notice(
        valid_from_ms: u64,
        valid_until_ms: Option<u64>,
        target: OperatorNoticeTarget,
    ) -> VerifiedOperatorBroadcast {
        verified_for_test(
            "operator-broadcast-test",
            OperatorBroadcastDocument {
                schema_version: 1,
                sequence: 7,
                issued_at_ms: 1_000,
                expires_at_ms: 4_000,
                directives: vec![OperatorDirective::Notice {
                    id: "notice:service-status".to_owned(),
                    severity: OperatorNoticeSeverity::Warning,
                    title: "Service status".to_owned(),
                    body: "A bounded operator notice.".to_owned(),
                    valid_from_ms,
                    valid_until_ms,
                    target,
                }],
            },
        )
    }

    fn verified_update_block(
        version: &str,
        valid_from_ms: u64,
        valid_until_ms: Option<u64>,
        document_expires_at_ms: u64,
    ) -> VerifiedOperatorBroadcast {
        verified_for_test(
            "operator-broadcast-test",
            OperatorBroadcastDocument {
                schema_version: 1,
                sequence: 8,
                issued_at_ms: 1_000,
                expires_at_ms: document_expires_at_ms,
                directives: vec![OperatorDirective::UpdateBlock {
                    id: format!("update-block:{version}"),
                    version: version.to_owned(),
                    reason: "Known bad patch.".to_owned(),
                    valid_from_ms,
                    valid_until_ms,
                }],
            },
        )
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

    #[test]
    fn eligible_notice_maps_into_operator_namespace() {
        let verified = verified_notice(1_000, None, OperatorNoticeTarget::default());
        let inputs = collect_notice_inputs(&verified, 1_500, "windows", "0.1.0-rc.28")
            .expect("eligible notice");
        assert_eq!(inputs.len(), 1);
        assert_eq!(inputs[0].id, "operator:notice:service-status");
        assert_eq!(inputs[0].category, "operator");
        assert_eq!(inputs[0].severity, "warning");
        assert_eq!(
            inputs[0].source_ref.as_deref(),
            Some("operator-broadcast:operator-broadcast-test:sequence:7")
        );
    }

    #[test]
    fn windows_version_target_is_enforced_before_state_commit() {
        let verified = verified_notice(
            1_000,
            None,
            OperatorNoticeTarget {
                platform: Some("windows".to_owned()),
                desktop_version_prefix: Some("0.1.0-rc.29".to_owned()),
            },
        );
        assert!(collect_notice_inputs(&verified, 1_500, "windows", "0.1.0-rc.28").is_err());
        assert!(collect_notice_inputs(&verified, 1_500, "windows", "0.1.0-rc.29").is_ok());
    }

    #[test]
    fn future_notice_does_not_consume_document_but_expired_notice_is_ignored() {
        let future = verified_notice(2_000, None, OperatorNoticeTarget::default());
        assert!(collect_notice_inputs(&future, 1_500, "windows", "0.1.0-rc.28").is_err());

        let expired = verified_notice(1_000, Some(1_400), OperatorNoticeTarget::default());
        let inputs = collect_notice_inputs(&expired, 1_500, "windows", "0.1.0-rc.28")
            .expect("expired notice can be consumed without presentation");
        assert!(inputs.is_empty());
    }

    #[test]
    fn exact_update_block_maps_without_affecting_notice_mapping() {
        let verified = verified_update_block("0.1.0-rc.29", 1_000, None, 4_000);
        let notices = collect_notice_inputs(&verified, 1_500, "windows", "0.1.0-rc.28")
            .expect("update block is not a notice error");
        assert!(notices.is_empty());
        let blocks = collect_update_block_inputs(&verified, 1_500).expect("active update block");
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].version, "0.1.0-rc.29");
        assert_eq!(blocks[0].valid_until_ms, 4_000);
    }

    #[test]
    fn update_block_never_outlives_signed_document() {
        let verified = verified_update_block("0.1.0-rc.29", 1_000, Some(9_000), 4_000);
        let blocks = collect_update_block_inputs(&verified, 1_500).expect("bounded update block");
        assert_eq!(blocks[0].valid_until_ms, 4_000);
    }

    #[test]
    fn future_update_block_fails_closed_and_expired_block_is_ignored() {
        let future = verified_update_block("0.1.0-rc.29", 2_000, None, 4_000);
        assert!(collect_update_block_inputs(&future, 1_500).is_err());

        let expired = verified_update_block("0.1.0-rc.29", 1_000, Some(1_400), 4_000);
        assert!(collect_update_block_inputs(&expired, 1_500)
            .expect("expired block")
            .is_empty());
    }
}
