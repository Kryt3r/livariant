use crate::{
    operator_broadcast_pipeline::accept_bounded_response_and_record_notices,
    operator_broadcast_status::{
        classify_error, OperatorBroadcastRuntimeStatus, STATUS_RELATIVE_PATH,
    },
    operator_broadcast_status_store,
    operator_broadcast_transport::{fetch_bounded, PRODUCTION_ENDPOINT},
};
use std::{
    path::PathBuf,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const ACCEPTANCE_STATE_RELATIVE_PATH: [&str; 2] =
    ["operator-broadcast", "acceptance-state.json"];

pub const INITIAL_REFRESH_DELAY: Duration = Duration::from_secs(3);
pub const REFRESH_INTERVAL: Duration = Duration::from_secs(5 * 60);

fn now_ms() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("System clock is before Unix epoch: {error}"))?;
    u64::try_from(duration.as_millis())
        .map_err(|_| "System timestamp is too large.".to_owned())
}

fn app_data_path(app: &AppHandle, relative: &[&str]) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|error| {
            format!("Livariant app-data location could not be resolved: {error}")
        })?;

    for component in relative {
        path = path.join(component);
    }

    Ok(path)
}

fn acceptance_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    app_data_path(app, &ACCEPTANCE_STATE_RELATIVE_PATH)
}

fn status_path(app: &AppHandle) -> Result<PathBuf, String> {
    app_data_path(app, &STATUS_RELATIVE_PATH)
}

fn update_status_best_effort<F>(app: &AppHandle, update: F)
where
    F: FnOnce(&mut OperatorBroadcastRuntimeStatus),
{
    let Ok(path) = status_path(app) else {
        return;
    };

    let mut status = operator_broadcast_status_store::read(&path).unwrap_or_default();
    update(&mut status);

    let _ = operator_broadcast_status_store::write(&path, &status);
}

fn refresh_once_with_sequence(app: &AppHandle) -> Result<u64, String> {
    let endpoint = PRODUCTION_ENDPOINT
        .ok_or_else(|| {
            "Operator broadcast production endpoint is not configured.".to_owned()
        })?;

    let response_bytes = fetch_bounded(endpoint)?;
    let state_path = acceptance_state_path(app)?;

    let verified = accept_bounded_response_and_record_notices(
        app,
        &response_bytes,
        &state_path,
        now_ms()?,
    )?;

    Ok(verified.document().sequence)
}

pub fn refresh_once(app: &AppHandle) -> Result<(), String> {
    refresh_once_with_sequence(app).map(|_| ())
}

fn refresh_once_with_status(app: &AppHandle) -> Result<(), String> {
    let attempt_ms = now_ms()?;

    update_status_best_effort(app, |status| {
        status.last_attempt_ms = Some(attempt_ms);
    });

    match refresh_once_with_sequence(app) {
        Ok(sequence) => {
            let success_ms = now_ms().unwrap_or(attempt_ms);

            update_status_best_effort(app, |status| {
                status.last_attempt_ms = Some(attempt_ms);
                status.last_success_ms = Some(success_ms);
                status.last_accepted_sequence = Some(sequence);
                status.last_error_class = None;
            });

            Ok(())
        }
        Err(error) => {
            let error_class = classify_error(&error).to_owned();

            update_status_best_effort(app, |status| {
                status.last_attempt_ms = Some(attempt_ms);
                status.last_error_class = Some(error_class);
            });

            Err(error)
        }
    }
}

pub fn start(app: AppHandle) {
    thread::spawn(move || {
        thread::sleep(INITIAL_REFRESH_DELAY);

        loop {
            let _ = refresh_once_with_status(&app);
            thread::sleep(REFRESH_INTERVAL);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refresh_schedule_is_bounded() {
        assert!(INITIAL_REFRESH_DELAY >= Duration::from_secs(1));
        assert!(REFRESH_INTERVAL >= Duration::from_secs(5 * 60));
        assert!(REFRESH_INTERVAL <= Duration::from_secs(60 * 60));
    }

    #[test]
    fn acceptance_state_stays_in_app_managed_storage() {
        assert_eq!(
            ACCEPTANCE_STATE_RELATIVE_PATH,
            ["operator-broadcast", "acceptance-state.json"]
        );
    }

    #[test]
    fn runtime_status_stays_in_app_managed_storage() {
        assert_eq!(
            STATUS_RELATIVE_PATH,
            ["operator-broadcast", "runtime-status.json"]
        );
    }
}
