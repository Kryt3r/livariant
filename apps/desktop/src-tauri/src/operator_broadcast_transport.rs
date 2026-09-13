use std::{io::Read, time::Duration};

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

/// Fetches bounded remote bytes only. Returned bytes remain untrusted Evidence
/// until the operator-broadcast signature verifier and replay/freshness state
/// accept them. This function grants no project, updater, renderer, or command
/// Authority.
pub fn fetch_bounded(endpoint: &str) -> Result<Vec<u8>, String> {
    validate_endpoint(endpoint)?;

    let agent = ureq::AgentBuilder::new()
        .https_only(true)
        .redirects(MAX_REDIRECTS)
        .timeout_connect(CONNECT_TIMEOUT)
        .timeout_read(READ_TIMEOUT)
        .timeout_write(WRITE_TIMEOUT)
        .build();

    let response = agent
        .get(endpoint)
        .call()
        .map_err(|_| "Operator broadcast transport request failed.".to_owned())?;

    if response.status() != 200 {
        return Err("Operator broadcast transport returned an unexpected HTTP status.".to_owned());
    }

    if response
        .header("Content-Length")
        .and_then(|value| value.parse::<usize>().ok())
        .is_some_and(|length| length > MAX_RESPONSE_BYTES)
    {
        return Err("Operator broadcast transport response exceeds the bounded contract.".to_owned());
    }

    let mut bytes = Vec::with_capacity(MAX_RESPONSE_BYTES.min(8 * 1024));
    response
        .into_reader()
        .take((MAX_RESPONSE_BYTES + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|_| "Operator broadcast transport response could not be read.".to_owned())?;

    if bytes.len() > MAX_RESPONSE_BYTES {
        return Err("Operator broadcast transport response exceeds the bounded contract.".to_owned());
    }

    Ok(bytes)
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

    #[test]
    fn http_endpoint_fails_before_network_access() {
        assert!(fetch_bounded("http://example.invalid/operator.json").is_err());
    }
}
