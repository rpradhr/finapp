use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub transaction_date: String,
    pub year: i32,
    pub quarter: Option<String>,
    pub month: i32,
    pub month_name: Option<String>,
    pub year_month: String,
    pub day_of_week: Option<String>,
    pub category: String,
    pub subcategory: Option<String>,
    pub raw_description: Option<String>,
    pub std_merchant: Option<String>,
    pub amount: f64,
    pub inflow_outflow: String,
    pub signed_amount: f64,
    pub debit_r: Option<f64>,
    pub debit_s: Option<f64>,
    pub location: Option<String>,
    pub travel_flag: i32,
    pub payment_method: Option<String>,
    pub tags: Option<String>,
    pub notes: Option<String>,
    pub source: String,
    pub source_sheet: Option<String>,
    pub import_batch_id: Option<String>,
    pub data_quality_status: String,
    pub data_quality_issue: Option<String>,
    pub is_deleted: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewTransaction {
    pub transaction_date: String,
    pub category: String,
    pub subcategory: Option<String>,
    pub raw_description: Option<String>,
    pub std_merchant: Option<String>,
    pub amount: f64,
    pub inflow_outflow: Option<String>,
    pub debit_r: Option<f64>,
    pub debit_s: Option<f64>,
    pub location: Option<String>,
    pub travel_flag: Option<bool>,
    pub payment_method: Option<String>,
    pub tags: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTransaction {
    pub transaction_date: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub raw_description: Option<String>,
    pub std_merchant: Option<String>,
    pub amount: Option<f64>,
    pub inflow_outflow: Option<String>,
    pub debit_r: Option<f64>,
    pub debit_s: Option<f64>,
    pub payment_method: Option<String>,
    pub tags: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionFilters {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub merchant: Option<String>,
    pub search: Option<String>,
    pub min_amount: Option<f64>,
    pub max_amount: Option<f64>,
    pub source: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResult<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlySpending {
    pub year_month: String,
    pub total: f64,
    pub category_totals: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YearlySpending {
    pub year: i32,
    pub total: f64,
    pub category_totals: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryBreakdown {
    pub category: String,
    pub total: f64,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubcategoryBreakdown {
    pub subcategory: String,
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MerchantSpending {
    pub merchant: String,
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberSpending {
    pub year_month: String,
    pub debit_r_total: f64,
    pub debit_s_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyMetrics {
    pub total_transactions: i64,
    pub total_spending: f64,
    pub avg_monthly_spending: f64,
    pub ytd_spending: f64,
    pub current_month_spending: f64,
    pub years_of_data: i32,
    pub top_category: String,
    pub top_category_amount: f64,
    pub data_quality_issues: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportBatch {
    pub id: String,
    pub filename: String,
    pub imported_at: String,
    pub total_rows: Option<i64>,
    pub imported_rows: Option<i64>,
    pub error_rows: Option<i64>,
    pub warning_rows: Option<i64>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MerchantMapping {
    pub id: i64,
    pub raw_description: String,
    pub standardized_merchant: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub txn_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: i64,
    pub category: String,
    pub subcategory: Option<String>,
    pub transaction_count: i64,
    pub total_amount: f64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataQualityIssue {
    pub id: String,
    pub raw_description: Option<String>,
    pub amount: f64,
    pub transaction_date: String,
    pub data_quality_issue: Option<String>,
    pub data_quality_status: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportSummary {
    pub batch_id: String,
    pub total_rows: i64,
    pub imported_rows: i64,
    pub updated_rows: i64,
    pub error_rows: i64,
    pub warning_rows: i64,
    pub merchants_imported: i64,
    pub categories_imported: i64,
    pub quality_issues_imported: i64,
}
