use serde::{Deserialize, Serialize};

pub const STATUS_SCHEMA_VERSION: u32 = 1;
pub const STATUS_RELATIVE_PATH: [&str; 2] = ["operator-broadcast", "runtime-status.json"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperatorBroadcastRuntimeStatus {
    pub schema_version: u32,
    pub last_attempt_ms: Option<u64>,
    pub last_success_ms: Option<u64>,
    pub last_accepted_sequence: Option<u64>,
    pub last_error_class: Option<String>,
}

impl Default for OperatorBroadcastRuntimeStatus {
    fn default() -> Self {
        Self {
            schema_version: STATUS_SCHEMA_VERSION,
            last_attempt_ms: None,
            last_success_ms: None,
            last_accepted_sequence: None,
            last_error_class: None,
        }
    }
}

pub fn classify_error(error: &str) -> &'static str {
    if error.contains("production endpoint is not configured") {
        "endpoint"
    } else if error.contains("transport") || error.contains("HTTPS") {
        "transport"
    } else if error.contains("envelope") || error.contains("invalid JSON") {
        "envelope"
    } else if error.contains("signature") || error.contains("key id") || error.contains("public key") {
        "signature"
    } else if error.contains("replay") || error.contains("rollback") || error.contains("expired") || error.contains("not yet valid") {
        "freshness-replay"
    } else if error.contains("notice") || error.contains("targets a different client") {
        "directive-eligibility"
    } else if error.contains("Notification Center") {
        "notification-persistence"
    } else if error.contains("update block") || error.contains("safety") {
        "safety-persistence"
    } else if error.contains("acceptance state") {
        "acceptance-persistence"
    } else if error.contains("clock") || error.contains("timestamp") {
        "clock"
    } else {
        "other"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn errors_are_reduced_to_fixed_classes() {
        assert_eq!(classify_error("Operator broadcast transport request failed."), "transport");
        assert_eq!(classify_error("Operator broadcast replay or sequence rollback was rejected."), "freshness-replay");
        assert_eq!(classify_error("Operator broadcast signature verification failed."), "signature");
        assert_eq!(classify_error("Notification Center store could not be written"), "notification-persistence");
    }
}
