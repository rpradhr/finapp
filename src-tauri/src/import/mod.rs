pub mod parser;
pub mod normalizer;

use crate::db::Database;
use crate::db::models::ImportSummary;
use normalizer::normalize_transaction;
use rusqlite::params;

pub fn import_spreadsheet(db: &Database, path: &str) -> Result<ImportSummary, String> {
    let parsed = parser::parse_xlsx(path).map_err(|e| format!("Parse error: {}", e))?;

    let batch_id = uuid::Uuid::new_v4().to_string();
    let filename = std::path::Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string());

    db.conn.execute(
        "INSERT INTO import_batches (id, filename, status) VALUES (?1, ?2, 'in_progress')",
        params![batch_id, filename],
    ).map_err(|e| format!("DB error: {}", e))?;

    let mut imported_rows = 0i64;
    let mut updated_rows = 0i64;
    let mut error_rows = 0i64;
    let mut warning_rows = 0i64;

    // Import master transactions
    for raw_txn in &parsed.transactions {
        match normalize_transaction(raw_txn) {
            Ok(txn) => {
                let exists: bool = db.conn.query_row(
                    "SELECT COUNT(*) > 0 FROM transactions WHERE id = ?1",
                    params![txn.id],
                    |row| row.get(0),
                ).unwrap_or(false);

                if exists {
                    // Update existing imported record
                    let result = db.conn.execute(
                        "UPDATE transactions SET transaction_date=?2, year=?3, quarter=?4, month=?5,
                         month_name=?6, year_month=?7, day_of_week=?8, category=?9, subcategory=?10,
                         raw_description=?11, std_merchant=?12, amount=?13, inflow_outflow=?14,
                         signed_amount=?15, debit_r=?16, debit_s=?17, location=?18, travel_flag=?19,
                         source_sheet=?20, import_batch_id=?21, updated_at=datetime('now')
                         WHERE id=?1 AND source='imported'",
                        params![
                            txn.id, txn.transaction_date, txn.year, txn.quarter, txn.month,
                            txn.month_name, txn.year_month, txn.day_of_week, txn.category,
                            txn.subcategory, txn.raw_description, txn.std_merchant, txn.amount,
                            txn.inflow_outflow, txn.signed_amount, txn.debit_r, txn.debit_s,
                            txn.location, txn.travel_flag, txn.source_sheet, batch_id,
                        ],
                    );
                    match result {
                        Ok(_) => updated_rows += 1,
                        Err(e) => {
                            tracing::warn!("Error updating row {}: {}", txn.id, e);
                            error_rows += 1;
                        }
                    }
                } else {
                    let result = db.conn.execute(
                        "INSERT INTO transactions (id, transaction_date, year, quarter, month, month_name,
                         year_month, day_of_week, category, subcategory, raw_description, std_merchant,
                         amount, inflow_outflow, signed_amount, debit_r, debit_s, location, travel_flag,
                         source, source_sheet, import_batch_id, data_quality_status, data_quality_issue)
                         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,
                         'imported',?20,?21,?22,?23)",
                        params![
                            txn.id, txn.transaction_date, txn.year, txn.quarter, txn.month,
                            txn.month_name, txn.year_month, txn.day_of_week, txn.category,
                            txn.subcategory, txn.raw_description, txn.std_merchant, txn.amount,
                            txn.inflow_outflow, txn.signed_amount, txn.debit_r, txn.debit_s,
                            txn.location, txn.travel_flag, txn.source_sheet, batch_id,
                            txn.data_quality_status, txn.data_quality_issue,
                        ],
                    );
                    match result {
                        Ok(_) => {
                            imported_rows += 1;
                            if txn.data_quality_status == "flagged" {
                                warning_rows += 1;
                            }
                        }
                        Err(e) => {
                            tracing::warn!("Error inserting row {}: {}", txn.id, e);
                            error_rows += 1;
                        }
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Normalization error: {}", e);
                error_rows += 1;
            }
        }
    }

    // Import merchant mappings
    let mut merchants_imported = 0i64;
    db.conn.execute("DELETE FROM merchant_map WHERE source = 'imported'", [])
        .map_err(|e| format!("DB error: {}", e))?;
    for m in &parsed.merchant_map {
        let _ = db.conn.execute(
            "INSERT INTO merchant_map (raw_description, standardized_merchant, category, subcategory, txn_count, source)
             VALUES (?1, ?2, ?3, ?4, ?5, 'imported')",
            params![m.raw_description, m.standardized_merchant, m.category, m.subcategory, m.txn_count],
        );
        merchants_imported += 1;
    }

    // Import categories
    let mut categories_imported = 0i64;
    db.conn.execute("DELETE FROM categories WHERE 1=1", [])
        .map_err(|e| format!("DB error: {}", e))?;
    for c in &parsed.categories {
        let _ = db.conn.execute(
            "INSERT INTO categories (category, subcategory, transaction_count, total_amount, avg_amount)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![c.category, c.subcategory, c.transaction_count, c.total_amount, c.avg_amount],
        );
        categories_imported += 1;
    }

    // Import data quality issues - update matching transactions
    let mut quality_issues_imported = 0i64;
    for issue in &parsed.quality_issues {
        let _ = db.conn.execute(
            "UPDATE transactions SET data_quality_status = 'flagged', data_quality_issue = ?1
             WHERE id = ?2",
            params![issue.issue_type, issue.txn_id],
        );
        quality_issues_imported += 1;
    }

    // Import budget data
    for b in &parsed.budgets {
        let _ = db.conn.execute(
            "INSERT OR REPLACE INTO budgets (category, year, monthly_budget, annual_actual, monthly_avg_actual, variance, variance_pct)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![b.category, b.year, b.monthly_budget, b.annual_actual, b.monthly_avg_actual, b.variance, b.variance_pct],
        );
    }

    // Import scenario assumptions
    for (key, value, desc) in &parsed.scenario_assumptions {
        let _ = db.conn.execute(
            "INSERT OR REPLACE INTO scenario_assumptions (key, value, description, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'))",
            params![key, value, desc],
        );
    }

    let total_rows = parsed.transactions.len() as i64;
    db.conn.execute(
        "UPDATE import_batches SET total_rows=?1, imported_rows=?2, error_rows=?3, warning_rows=?4, status='completed'
         WHERE id=?5",
        params![total_rows, imported_rows + updated_rows, error_rows, warning_rows, batch_id],
    ).map_err(|e| format!("DB error: {}", e))?;

    Ok(ImportSummary {
        batch_id,
        total_rows,
        imported_rows,
        updated_rows,
        error_rows,
        warning_rows,
        merchants_imported,
        categories_imported,
        quality_issues_imported,
    })
}
