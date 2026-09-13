use std::time::Duration;

pub const MAX_RESPONSE_BYTES: usize = 96 * 1024;
pub const CONNECT_TIMEOUT: Duration = Duration::from_secs(3);
pub const READ_TIMEOUT: Duration = Duration::from_secs(5);
pub const WRITE_TIMEOUT: Duration = Duration::from_secs(3);
pub const MAX_REDIRECTS: u32 = 0;

/// Production transport remains disabled until an explicitly reviewed HTTPS
/// endpoint identity is pinned by a later bounded change.
pub const PRODUCTION_ENDPOINT: Option<&str> = None;

pub fn validate_endpoint(endpoint: &str) -> Result<(), String> {
    if endpoint.trim() != endpoint || endpoint.is_empty() {
        return Err("Operator broadcast endpoint is invalid.".to_owned());
    }
    if !endpoint.starts_with("https://") {
        return Err("Operator broadcast endpoint must use HTTPS.".to_owned());
    }
    if endpoint.contains('#') {
        return Err("Operator broadcast endpoint must not contain a fragment.".to_owned());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn production_transport_is_fail_closed_until_endpoint_is_pinned() {
        assert!(PRODUCTION_ENDPOINT.is_none());
    }

    #[test]
    fn endpoint_policy_requires_https() {
        assert!(validate_endpoint("https://example.invalid/operator.json").is_ok());
        assert!(validate_endpoint("http://example.invalid/operator.json").is_err());
        assert!(validate_endpoint(" https://example.invalid/operator.json").is_err());
        assert!(validate_endpoint("https://example.invalid/operator.json#fragment").is_err());
    }

    #[test]
    fn transport_bounds_are_nonzero_and_redirects_are_disabled() {
        assert!(MAX_RESPONSE_BYTES > 0);
        assert!(CONNECT_TIMEOUT > Duration::ZERO);
        assert!(READ_TIMEOUT > Duration::ZERO);
        assert!(WRITE_TIMEOUT > Duration::ZERO);
        assert_eq!(MAX_REDIRECTS, 0);
    }
}
