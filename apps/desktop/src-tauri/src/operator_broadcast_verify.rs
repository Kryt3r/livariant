use crate::operator_broadcast::{OperatorBroadcastDocument, OperatorBroadcastEnvelope};
use minisign_verify::{PublicKey, Signature};

struct PinnedOperatorBroadcastKey {
    key_id: &'static str,
    public_key_base64: &'static str,
}

// Production operator-broadcast key material is intentionally not populated yet.
// A later bounded step must pin the dedicated public key here after the private-key
// custody/rotation procedure and transport identity are established.
const PINNED_OPERATOR_BROADCAST_KEYS: &[PinnedOperatorBroadcastKey] = &[];

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

    const UPSTREAM_TEST_PUBLIC_KEY: &str =
        "RWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3";
    const UPSTREAM_TEST_SIGNATURE: &str = "untrusted comment: signature from minisign secret key\nRWQf6LRCGA9i59SLOFxz6NxvASXDJeRtuZykwQepbDEGt87ig1BNpWaVWuNrm73YiIiJbq71Wi+dP9eKL8OC351vwIasSSbXxwA=\ntrusted comment: timestamp:1555779966\t file:test\nQtKMXWyYcwdpZAlPF7tE2ENJkRd1ujvKjlj1m9RtHTBnZPa5WKU5uWRs5GoP5M/VqE81QFuMKI5k/SfNQUaOAA==";

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
