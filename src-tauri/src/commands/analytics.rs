use crate::AppState;
use crate::db::models::*;
use tauri::State;

#[tauri::command]
pub fn get_monthly_spending(
    state: State<AppState>,
    date_from: Option<String>,
    date_to: Option<String>,
    category: Option<String>,
) -> Result<Vec<MonthlySpending>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_monthly_spending(
        date_from.as_deref(),
        date_to.as_deref(),
        category.as_deref(),
    ).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn get_yearly_spending(
    state: State<AppState>,
    date_from: Option<String>,
    date_to: Option<String>,
    category: Option<String>,
) -> Result<Vec<YearlySpending>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_yearly_spending(
        date_from.as_deref(),
        date_to.as_deref(),
        category.as_deref(),
    ).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn get_category_breakdown(
    state: State<AppState>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<CategoryBreakdown>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_category_breakdown(
        date_from.as_deref(),
        date_to.as_deref(),
    ).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn get_subcategory_breakdown(
    state: State<AppState>,
    category: String,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<SubcategoryBreakdown>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_subcategory_breakdown(
        &category,
        date_from.as_deref(),
        date_to.as_deref(),
    ).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn get_top_merchants(
    state: State<AppState>,
    date_from: Option<String>,
    date_to: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<MerchantSpending>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_top_merchants(
        date_from.as_deref(),
        date_to.as_deref(),
        limit.unwrap_or(20),
    ).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn get_key_metrics(
    state: State<AppState>,
) -> Result<KeyMetrics, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_key_metrics().map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn get_spending_by_member(
    state: State<AppState>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<MemberSpending>, String> {
    let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
    db.get_spending_by_member(
        date_from.as_deref(),
        date_to.as_deref(),
    ).map_err(|e| format!("DB error: {}", e))
}
