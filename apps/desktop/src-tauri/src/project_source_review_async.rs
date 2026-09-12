use crate::project_source_review_bridge::{refresh_project_source_review_presentation, ProjectSourceReviewBridgeResult};

#[tauri::command]
pub async fn refresh_project_source_review_presentation_nonblocking(
    app: tauri::AppHandle,
) -> Result<ProjectSourceReviewBridgeResult, String> {
    tauri::async_runtime::spawn_blocking(move || refresh_project_source_review_presentation(app))
        .await
        .map_err(|error| format!("Project Source & Review refresh worker failed: {error}"))
}
