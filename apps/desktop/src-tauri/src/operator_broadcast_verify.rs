use crate::operator_broadcast::{OperatorBroadcastDocument, OperatorBroadcastEnvelope};
use minisign_verify::{PublicKey, Signature};

struct PinnedOperatorBroadcastKey {
    key_id: &'static str,
    public_key_base64: &'static str,
}

const PINNED_OPERATOR_BROADCAST_KEYS: &[PinnedOperatorBroadcastKey] = &[
    PinnedOperatorBroadcastKey {
        key_id: "operator-broadcast-prod-2026-01",
        public_key_base64: "RWRckVBrYLN6NDmO55Kv6KsH0GMji3g9e4ISlSPOo7nUVd5c7c5UK5g1",
    },
];

#[derive(Debug, Clone)]
pub struct VerifiedOperatorBroadcast {
    key_id: String,
    document: OperatorBroadcastDocument,
}

impl VerifiedOperatorBroadcast {
    pub fn key_id(&self) -> &str {
        &self.key_id
    }

    pub fn document(&self) -> &OperatorBroadcastDocument {
        &self.document
    }
}

pub fn verify_operator_broadcast(
    envelope: &OperatorBroadcastEnvelope,
) -> Result<VerifiedOperatorBroadcast, String> {
    envelope.validate_shape()?;

    let pinned = PINNED_OPERATOR_BROADCAST_KEYS
        .iter()
        .find(|candidate| candidate.key_id == envelope.key_id)
        .ok_or_else(|| "Operator broadcast signing key is not pinned by this Desktop build.".to_owned())?;

    verify_exact_document_signature(
        pinned.public_key_base64,
        envelope.document.as_bytes(),
        &envelope.signature,
    )?;

    let document = envelope.parse_untrusted_document()?;
    Ok(VerifiedOperatorBroadcast {
        key_id: envelope.key_id.clone(),
        document,
    })
}

fn verify_exact_document_signature(
    public_key_base64: &str,
    document_bytes: &[u8],
    signature_text: &str,
) -> Result<(), String> {
    let public_key = PublicKey::from_base64(public_key_base64)
        .map_err(|_| "Operator broadcast public key is invalid.".to_owned())?;
    let signature = Signature::decode(signature_text)
        .map_err(|_| "Operator broadcast detached signature is invalid.".to_owned())?;

    public_key
        .verify(document_bytes, &signature, false)
        .map_err(|_| "Operator broadcast signature verification failed.".to_owned())
}

#[cfg(test)]
pub(crate) fn verified_for_test(
    key_id: &str,
    document: OperatorBroadcastDocument,
) -> VerifiedOperatorBroadcast {
    VerifiedOperatorBroadcast {
        key_id: key_id.to_owned(),
        document,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const PRODUCTION_KEY_ID: &str = "operator-broadcast-prod-2026-01";
    const PRODUCTION_PUBLIC_KEY: &str =
        "RWRckVBrYLN6NDmO55Kv6KsH0GMji3g9e4ISlSPOo7nUVd5c7c5UK5g1";
    const UPSTREAM_TEST_PUBLIC_KEY: &str =
        "RWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3";
    const UPSTREAM_TEST_SIGNATURE: &str = "untrusted comment: signature from minisign secret key\nRWQf6LRCGA9i59SLOFxz6NxvASXDJeRtuZykwQepbDEGt87ig1BNpWaVWuNrm73YiIiJbq71Wi+dP9eKL8OC351vwIasSSbXxwA=\ntrusted comment: timestamp:1555779966\t file:test\nQtKMXWyYcwdpZAlPF7tE2ENJkRd1ujvKjlj1m9RtHTBnZPa5WKU5uWRs5GoP5M/VqE81QFuMKI5k/SfNQUaOAA==";

    #[test]
    fn production_key_is_pinned_exactly_and_parses() {
        let pinned = PINNED_OPERATOR_BROADCAST_KEYS
            .iter()
            .find(|candidate| candidate.key_id == PRODUCTION_KEY_ID)
            .expect("production operator broadcast key must be pinned");
        assert_eq!(pinned.public_key_base64, PRODUCTION_PUBLIC_KEY);
        PublicKey::from_base64(pinned.public_key_base64)
            .expect("pinned production operator broadcast public key must parse");
    }

    #[test]
    fn upstream_minisign_vector_verifies_exact_bytes() {
        verify_exact_document_signature(
            UPSTREAM_TEST_PUBLIC_KEY,
            b"test",
            UPSTREAM_TEST_SIGNATURE,
        )
        .expect("known minisign verification vector");
    }

    #[test]
    fn tampered_bytes_fail_verification() {
        assert!(verify_exact_document_signature(
            UPSTREAM_TEST_PUBLIC_KEY,
            b"test!",
            UPSTREAM_TEST_SIGNATURE,
        )
        .is_err());
    }

    #[test]
    fn malformed_signature_fails_closed() {
        assert!(verify_exact_document_signature(
            UPSTREAM_TEST_PUBLIC_KEY,
            b"test",
            "not-a-minisign-signature",
        )
        .is_err());
    }

    #[test]
    fn production_verifier_rejects_unpinned_key() {
        let envelope = OperatorBroadcastEnvelope {
            schema_version: 1,
            key_id: "operator-broadcast-unpinned".to_owned(),
            document: "{\"schemaVersion\":1,\"sequence\":1,\"issuedAtMs\":1000,\"expiresAtMs\":2000,\"directives\":[]}".to_owned(),
            signature: UPSTREAM_TEST_SIGNATURE.to_owned(),
        };
        assert!(verify_operator_broadcast(&envelope).is_err());
    }
}
