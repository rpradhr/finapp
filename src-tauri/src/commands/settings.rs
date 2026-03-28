use crate::AppState;
use crate::db::models::*;
use tauri::State;
use std::collections::HashMap;

#[tauri::command]
pub fn get_settings(
    state: State<AppState>,
) -> Result<HashMap<String, String>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut settings = HashMap::new();

    let keys = ["ai_provider", "theme", "ai_api_key"];
    for key in keys {
        if let Ok(Some(val)) = db.get_setting(key) {
            settings.insert(key.to_string(), val);
        }
    }

    Ok(settings)
}

#[tauri::command]
pub fn update_setting(
    state: State<AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.update_setting(&key, &value).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn get_categories(
    state: State<AppState>,
) -> Result<Vec<Category>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_categories().map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn get_data_quality_issues(
    state: State<AppState>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<PaginatedResult<DataQualityIssue>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_data_quality_issues(
        page.unwrap_or(1),
        page_size.unwrap_or(50),
    ).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn resolve_data_quality_issue(
    state: State<AppState>,
    id: String,
    category: String,
    subcategory: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.resolve_data_quality_issue(&id, &category, subcategory.as_deref())
        .map_err(|e| format!("DB error: {}", e))
}
