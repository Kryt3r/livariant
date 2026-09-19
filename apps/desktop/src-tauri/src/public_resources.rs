use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopPublicIdentity {
    version: &'static str,
    release_channel: &'static str,
    repository: &'static str,
}

#[tauri::command]
pub fn desktop_public_identity() -> DesktopPublicIdentity {
    DesktopPublicIdentity {
        version: env!("CARGO_PKG_VERSION"),
        release_channel: "preview",
        repository: "https://github.com/Kryt3r/livariant",
    }
}

fn public_resource_url(resource: &str) -> Option<&'static str> {
    match resource {
        "repository" => Some("https://github.com/Kryt3r/livariant"),
        "issues" => Some("https://github.com/Kryt3r/livariant/issues"),
        "security" => Some("https://github.com/Kryt3r/livariant/security/policy"),
        "imprint" => Some("https://www.einfachrobin.de/impressum"),
        "privacy" => Some("https://github.com/Kryt3r/livariant/blob/main/docs/privacy-and-network.md"),
        "license" => Some("https://github.com/Kryt3r/livariant/blob/main/LICENSE"),
        "third-party" => Some("https://github.com/Kryt3r/livariant/blob/main/THIRD_PARTY_NOTICES.md"),
        _ => None,
    }
}

#[tauri::command]
pub fn open_public_resource(resource: String) -> Result<(), String> {
    let url = public_resource_url(resource.trim())
        .ok_or_else(|| "Unknown public Livariant resource.".to_owned())?;

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg(url)
            .spawn()
            .map_err(|error| format!("Public Livariant resource could not be opened: {error}"))?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = url;
        Err("Opening public Livariant resources is not implemented for this platform yet.".to_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::public_resource_url;

    #[test]
    fn only_known_public_resources_are_openable() {
        assert_eq!(public_resource_url("repository"), Some("https://github.com/Kryt3r/livariant"));
        assert_eq!(public_resource_url("issues"), Some("https://github.com/Kryt3r/livariant/issues"));
        assert_eq!(public_resource_url("imprint"), Some("https://www.einfachrobin.de/impressum"));
        assert_eq!(public_resource_url("https://example.com"), None);
        assert_eq!(public_resource_url(""), None);
    }
}
