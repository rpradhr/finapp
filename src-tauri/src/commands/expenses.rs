use crate::AppState;
use crate::db::models::*;
use tauri::State;

#[tauri::command]
pub fn get_transactions(
    state: State<AppState>,
    filters: TransactionFilters,
) -> Result<PaginatedResult<Transaction>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_transactions(&filters).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn add_transaction(
    state: State<AppState>,
    transaction: NewTransaction,
) -> Result<Transaction, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.add_transaction(&transaction).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn update_transaction(
    state: State<AppState>,
    id: String,
    updates: UpdateTransaction,
) -> Result<Transaction, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.update_transaction(&id, &updates).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn delete_transaction(
    state: State<AppState>,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.delete_transaction(&id).map_err(|e| format!("DB error: {}", e))
}
