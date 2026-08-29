mod updater;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{env, fs, path::Path, process::Command};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BundledRuntimeManifest {
    schema_version: u32,
    core_version: String,
    core_source_sha: String,
    node_version: String,
    authority_issued: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeHealth {
    state: &'static str,
    core_version: Option<String>,
    core_source_sha: Option<String>,
    node_version: Option<String>,
    authority_issued: bool,
    detail: String,
}

fn runtime_health_result(
    state: &'static str,
    manifest: Option<&BundledRuntimeManifest>,
    detail: impl Into<String>,
) -> RuntimeHealth {
    RuntimeHealth {
        state,
        core_version: manifest.map(|value| value.core_version.clone()),
        core_source_sha: manifest.map(|value| value.core_source_sha.clone()),
        node_version: manifest.map(|value| value.node_version.clone()),
        authority_issued: manifest.map(|value| value.authority_issued).unwrap_or(false),
        detail: detail.into(),
    }
}

fn hidden_command(program: &Path) -> Command {
    let mut command = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
}

fn inspect_runtime_root(install_root: &Path) -> RuntimeHealth {
    let node = install_root.join("livariant-node.exe");
    let manifest_path = install_root.join("runtime").join("manifest.json");
    let core_cli = install_root
        .join("runtime")
        .join("core")
        .join("dist")
        .join("src")
        .join("cli")
        .join("index.js");

    if !node.is_file() || !manifest_path.is_file() || !core_cli.is_file() {
        return runtime_health_result(
            "not-packaged",
            None,
            "Bundled runtime material is not present in this Desktop build.",
        );
    }

    let manifest_bytes = match fs::read(&manifest_path) {
        Ok(value) => value,
        Err(error) => {
            return runtime_health_result(
                "invalid",
                None,
                format!("Bundled runtime manifest could not be read: {error}"),
            )
        }
    };
    let manifest: BundledRuntimeManifest = match serde_json::from_slice(&manifest_bytes) {
        Ok(value) => value,
        Err(error) => {
            return runtime_health_result(
                "invalid",
                None,
                format!("Bundled runtime manifest is invalid: {error}"),
            )
        }
    };

    if manifest.schema_version != 1 {
        return runtime_health_result(
            "invalid",
            Some(&manifest),
            format!(
                "Unsupported bundled runtime manifest schema {}.",
                manifest.schema_version
            ),
        );
    }
    if manifest.authority_issued {
        return runtime_health_result(
            "invalid",
            Some(&manifest),
            "Ordinary bundled runtime material must never claim Authority.",
        );
    }

    let node_output = match hidden_command(&node).arg("--version").output() {
        Ok(value) => value,
        Err(error) => {
            return runtime_health_result(
                "invalid",
                Some(&manifest),
                format!("Bundled Node runtime could not be executed: {error}"),
            )
        }
    };
    if !node_output.status.success() {
        return runtime_health_result(
            "invalid",
            Some(&manifest),
            "Bundled Node runtime version probe failed.",
        );
    }
    let observed_node = String::from_utf8_lossy(&node_output.stdout).trim().to_owned();
    let expected_node = format!("v{}", manifest.node_version);
    if observed_node != expected_node {
        return runtime_health_result(
            "invalid",
            Some(&manifest),
            format!(
                "Bundled Node runtime identity mismatch: expected {expected_node}, observed {observed_node}."
            ),
        );
    }

    let core_output = match hidden_command(&node)
        .arg(&core_cli)
        .arg("version")
        .arg("--json")
        .current_dir(install_root)
        .env("PBF_RUNTIME_DELEGATION_BYPASS", "1")
        .output()
    {
        Ok(value) => value,
        Err(error) => {
            return runtime_health_result(
                "invalid",
                Some(&manifest),
                format!("Bundled Livariant Core could not be executed: {error}"),
            )
        }
    };
    if !core_output.status.success() {
        return runtime_health_result(
            "invalid",
            Some(&manifest),
            "Bundled Livariant Core identity probe failed.",
        );
    }

    let version_info: Value = match serde_json::from_slice(&core_output.stdout) {
        Ok(value) => value,
        Err(error) => {
            return runtime_health_result(
                "invalid",
                Some(&manifest),
                format!("Bundled Livariant Core returned invalid identity JSON: {error}"),
            )
        }
    };
    let observed_core = version_info
        .get("frameworkVersion")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if observed_core != manifest.core_version {
        return runtime_health_result(
            "invalid",
            Some(&manifest),
            format!(
                "Bundled Livariant Core identity mismatch: expected {}, observed {}.",
                manifest.core_version, observed_core
            ),
        );
    }

    runtime_health_result(
        "ready",
        Some(&manifest),
        "Bundled Livariant Core and Node runtime identities are coherent. This is application capability, not Guardian Authority.",
    )
}

#[tauri::command]
fn runtime_health() -> RuntimeHealth {
    let executable = match env::current_exe() {
        Ok(value) => value,
        Err(error) => {
            return runtime_health_result(
                "invalid",
                None,
                format!("Desktop executable location could not be resolved: {error}"),
            )
        }
    };
    let Some(install_root) = executable.parent() else {
        return runtime_health_result(
            "invalid",
            None,
            "Desktop executable has no resolvable installation directory.",
        );
    };
    inspect_runtime_root(install_root)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // The updater plugin owns only its internal state/configuration. All check and
    // apply operations remain behind bounded Rust commands; the renderer does not
    // receive direct updater, arbitrary-download or arbitrary-execute permissions.
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|_app| {
            #[cfg(feature = "ci-updater-acceptance")]
            updater::start_ci_acceptance_if_requested(_app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            runtime_health,
            updater::check_for_update,
            updater::apply_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running Livariant Desktop");
}
