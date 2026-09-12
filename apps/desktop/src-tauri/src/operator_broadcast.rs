use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const OPERATOR_BROADCAST_ENVELOPE_SCHEMA_VERSION: u32 = 1;
pub const OPERATOR_BROADCAST_DOCUMENT_SCHEMA_VERSION: u32 = 1;
const MAX_DOCUMENT_BYTES: usize = 64 * 1024;
const MAX_SIGNATURE_CHARS: usize = 2048;
const MAX_KEY_ID_CHARS: usize = 80;
const MAX_DIRECTIVES: usize = 64;
const MAX_ID_CHARS: usize = 200;
const MAX_TITLE_CHARS: usize = 240;
const MAX_BODY_CHARS: usize = 4000;
const MAX_REASON_CHARS: usize = 2000;
const MAX_VERSION_CHARS: usize = 80;
const MAX_PLATFORM_CHARS: usize = 40;
const MAX_VERSION_PREFIX_CHARS: usize = 80;
const MAX_DOCUMENT_LIFETIME_MS: u64 = 7 * 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperatorBroadcastEnvelope {
    pub schema_version: u32,
    pub key_id: String,
    /// Exact UTF-8 JSON bytes covered by the detached operator signature.
    /// Keeping the signed document as a string avoids ambiguous cross-language
    /// JSON canonicalization rules.
    pub document: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperatorBroadcastDocument {
    pub schema_version: u32,
    /// Monotonic operator-controlled sequence used by the later transport layer
    /// for replay/rollback protection after signature verification.
    pub sequence: u64,
    pub issued_at_ms: u64,
    pub expires_at_ms: u64,
    pub directives: Vec<OperatorDirective>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
pub enum OperatorDirective {
    Notice {
        id: String,
        severity: OperatorNoticeSeverity,
        title: String,
        body: String,
        valid_from_ms: u64,
        valid_until_ms: Option<u64>,
        target: OperatorNoticeTarget,
    },
    /// The first remote-safety primitive is deliberately narrow: a signed
    /// operator document may block one exact Desktop update version. It cannot
    /// execute code, mutate projects, install software, or disable arbitrary
    /// local capabilities.
    UpdateBlock {
        id: String,
        version: String,
        reason: String,
        valid_from_ms: u64,
        valid_until_ms: Option<u64>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum OperatorNoticeSeverity {
    Info,
    Warning,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperatorNoticeTarget {
    pub platform: Option<String>,
    pub desktop_version_prefix: Option<String>,
}

impl OperatorBroadcastEnvelope {
    pub fn validate_shape(&self) -> Result<(), String> {
        if self.schema_version != OPERATOR_BROADCAST_ENVELOPE_SCHEMA_VERSION {
            return Err(format!(
                "Unsupported operator broadcast envelope schema {}.",
                self.schema_version
            ));
        }
        validate_identifier("operator broadcast key id", &self.key_id, MAX_KEY_ID_CHARS)?;
        if !self
            .key_id
            .chars()
            .all(|value| value.is_ascii_alphanumeric() || matches!(value, '-' | '_' | '.'))
        {
            return Err("Operator broadcast key id contains unsupported characters.".to_owned());
        }
        if self.document.is_empty() || self.document.len() > MAX_DOCUMENT_BYTES {
            return Err("Operator broadcast signed document exceeds the bounded contract.".to_owned());
        }
        if self.signature.trim().is_empty() || self.signature.len() > MAX_SIGNATURE_CHARS {
            return Err("Operator broadcast signature exceeds the bounded contract.".to_owned());
        }
        Ok(())
    }

    /// Parsing is intentionally separate from cryptographic verification.
    /// Production transport MUST verify the detached signature over
    /// `document.as_bytes()` before treating the parsed document as trusted.
    pub fn parse_untrusted_document(&self) -> Result<OperatorBroadcastDocument, String> {
        self.validate_shape()?;
        let document: OperatorBroadcastDocument = serde_json::from_str(&self.document)
            .map_err(|error| format!("Operator broadcast document is invalid JSON: {error}"))?;
        document.validate()?;
        Ok(document)
    }
}

impl OperatorBroadcastDocument {
    pub fn validate(&self) -> Result<(), String> {
        if self.schema_version != OPERATOR_BROADCAST_DOCUMENT_SCHEMA_VERSION {
            return Err(format!(
                "Unsupported operator broadcast document schema {}.",
                self.schema_version
            ));
        }
        if self.sequence == 0 {
            return Err("Operator broadcast sequence must be greater than zero.".to_owned());
        }
        if self.issued_at_ms == 0 || self.expires_at_ms <= self.issued_at_ms {
            return Err("Operator broadcast freshness window is invalid.".to_owned());
        }
        if self.expires_at_ms - self.issued_at_ms > MAX_DOCUMENT_LIFETIME_MS {
            return Err("Operator broadcast document lifetime exceeds seven days.".to_owned());
        }
        if self.directives.len() > MAX_DIRECTIVES {
            return Err("Operator broadcast document contains too many directives.".to_owned());
        }

        let mut ids = HashSet::new();
        for directive in &self.directives {
            let id = directive.validate()?;
            if !ids.insert(id) {
                return Err("Operator broadcast document contains duplicate directive ids.".to_owned());
            }
        }
        Ok(())
    }
}

impl OperatorDirective {
    fn validate(&self) -> Result<&str, String> {
        match self {
            Self::Notice {
                id,
                title,
                body,
                valid_from_ms,
                valid_until_ms,
                target,
                ..
            } => {
                validate_identifier("operator notice id", id, MAX_ID_CHARS)?;
                validate_text("operator notice title", title, MAX_TITLE_CHARS)?;
                validate_text("operator notice body", body, MAX_BODY_CHARS)?;
                validate_validity_window(*valid_from_ms, *valid_until_ms)?;
                target.validate()?;
                Ok(id)
            }
            Self::UpdateBlock {
                id,
                version,
                reason,
                valid_from_ms,
                valid_until_ms,
            } => {
                validate_identifier("operator update-block id", id, MAX_ID_CHARS)?;
                validate_text("operator update-block version", version, MAX_VERSION_CHARS)?;
                if !version
                    .chars()
                    .all(|value| value.is_ascii_alphanumeric() || matches!(value, '.' | '-' | '+' | '_'))
                {
                    return Err("Operator update-block version contains unsupported characters.".to_owned());
                }
                validate_text("operator update-block reason", reason, MAX_REASON_CHARS)?;
                validate_validity_window(*valid_from_ms, *valid_until_ms)?;
                Ok(id)
            }
        }
    }
}

impl OperatorNoticeTarget {
    fn validate(&self) -> Result<(), String> {
        if let Some(platform) = &self.platform {
            validate_text("operator notice target platform", platform, MAX_PLATFORM_CHARS)?;
            if !matches!(platform.as_str(), "windows") {
                return Err("Operator notice target platform is unsupported.".to_owned());
            }
        }
        if let Some(prefix) = &self.desktop_version_prefix {
            validate_text(
                "operator notice desktop-version prefix",
                prefix,
                MAX_VERSION_PREFIX_CHARS,
            )?;
            if !prefix
                .chars()
                .all(|value| value.is_ascii_alphanumeric() || matches!(value, '.' | '-' | '+' | '_'))
            {
                return Err("Operator notice desktop-version prefix contains unsupported characters.".to_owned());
            }
        }
        Ok(())
    }
}

fn validate_identifier(label: &str, value: &str, max_chars: usize) -> Result<(), String> {
    validate_text(label, value, max_chars)?;
    if value.chars().any(char::is_whitespace) {
        return Err(format!("{label} must not contain whitespace."));
    }
    Ok(())
}

fn validate_text(label: &str, value: &str, max_chars: usize) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{label} must not be blank."));
    }
    if value.chars().count() > max_chars {
        return Err(format!("{label} exceeds the bounded contract."));
    }
    if value.chars().any(|character| character == '\0') {
        return Err(format!("{label} contains a NUL character."));
    }
    Ok(())
}

fn validate_validity_window(valid_from_ms: u64, valid_until_ms: Option<u64>) -> Result<(), String> {
    if valid_from_ms == 0 {
        return Err("Operator directive valid-from timestamp must be greater than zero.".to_owned());
    }
    if valid_until_ms.is_some_and(|value| value <= valid_from_ms) {
        return Err("Operator directive validity window is invalid.".to_owned());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_document() -> OperatorBroadcastDocument {
        OperatorBroadcastDocument {
            schema_version: 1,
            sequence: 7,
            issued_at_ms: 1_000,
            expires_at_ms: 2_000,
            directives: vec![OperatorDirective::Notice {
                id: "notice:github-outage".to_owned(),
                severity: OperatorNoticeSeverity::Warning,
                title: "GitHub connection disruption".to_owned(),
                body: "GitHub-backed status may be temporarily unavailable.".to_owned(),
                valid_from_ms: 1_000,
                valid_until_ms: None,
                target: OperatorNoticeTarget {
                    platform: Some("windows".to_owned()),
                    desktop_version_prefix: Some("0.1.0-rc.".to_owned()),
                },
            }],
        }
    }

    #[test]
    fn bounded_notice_document_is_accepted() {
        valid_document().validate().expect("valid operator document");
    }

    #[test]
    fn narrow_update_block_is_accepted_without_generic_command_surface() {
        let mut document = valid_document();
        document.directives = vec![OperatorDirective::UpdateBlock {
            id: "update-block:0.1.0-rc.29".to_owned(),
            version: "0.1.0-rc.29".to_owned(),
            reason: "Known destructive migration defect.".to_owned(),
            valid_from_ms: 1_000,
            valid_until_ms: Some(3_000),
        }];
        document.validate().expect("bounded update block");
    }

    #[test]
    fn duplicate_directive_ids_fail_closed() {
        let mut document = valid_document();
        let duplicate = document.directives[0].clone();
        document.directives.push(duplicate);
        assert!(document.validate().is_err());
    }

    #[test]
    fn excessive_document_lifetime_fails_closed() {
        let mut document = valid_document();
        document.expires_at_ms = document.issued_at_ms + MAX_DOCUMENT_LIFETIME_MS + 1;
        assert!(document.validate().is_err());
    }

    #[test]
    fn unsupported_remote_command_shape_is_rejected() {
        let raw = r#"{
            "schemaVersion":1,
            "sequence":1,
            "issuedAtMs":1000,
            "expiresAtMs":2000,
            "directives":[{
                "type":"notice",
                "id":"notice:test",
                "severity":"info",
                "title":"Test",
                "body":"Test body",
                "validFromMs":1000,
                "validUntilMs":null,
                "target":{},
                "command":"powershell.exe"
            }]
        }"#;
        assert!(serde_json::from_str::<OperatorBroadcastDocument>(raw).is_err());
    }

    #[test]
    fn unknown_directive_type_is_rejected() {
        let raw = r#"{
            "schemaVersion":1,
            "sequence":1,
            "issuedAtMs":1000,
            "expiresAtMs":2000,
            "directives":[{"type":"executeCommand","command":"whoami"}]
        }"#;
        assert!(serde_json::from_str::<OperatorBroadcastDocument>(raw).is_err());
    }

    #[test]
    fn envelope_keeps_exact_signed_document_bytes() {
        let document = serde_json::to_string(&valid_document()).expect("serialize fixture");
        let envelope = OperatorBroadcastEnvelope {
            schema_version: 1,
            key_id: "operator-broadcast-dev-1".to_owned(),
            document: document.clone(),
            signature: "detached-signature-placeholder".to_owned(),
        };
        envelope.validate_shape().expect("valid envelope shape");
        let parsed = envelope.parse_untrusted_document().expect("parse bounded document");
        assert_eq!(parsed, valid_document());
        assert_eq!(envelope.document.as_bytes(), document.as_bytes());
    }
}
