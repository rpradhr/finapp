use crate::AppState;
use crate::db::models::*;
use tauri::State;

#[tauri::command]
pub fn import_spreadsheet(
    state: State<AppState>,
    file_path: String,
) -> Result<ImportSummary, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    crate::import::import_spreadsheet(&db, &file_path)
}

#[tauri::command]
pub fn get_import_history(
    state: State<AppState>,
) -> Result<Vec<ImportBatch>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_import_history().map_err(|e| format!("DB error: {}", e))
}
