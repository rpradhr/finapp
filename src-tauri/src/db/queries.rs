use super::Database;
use super::models::*;
use rusqlite::{params, Result as SqlResult};

impl Database {
    pub fn get_transactions(&self, filters: &TransactionFilters) -> SqlResult<PaginatedResult<Transaction>> {
        let page = filters.page.unwrap_or(1).max(1);
        let page_size = filters.page_size.unwrap_or(50).min(500);
        let offset = (page - 1) * page_size;

        let mut conditions = vec!["is_deleted = 0".to_string()];
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref df) = filters.date_from {
            conditions.push(format!("transaction_date >= ?{}", param_values.len() + 1));
            param_values.push(Box::new(df.clone()));
        }
        if let Some(ref dt) = filters.date_to {
            conditions.push(format!("transaction_date <= ?{}", param_values.len() + 1));
            param_values.push(Box::new(dt.clone()));
        }
        if let Some(ref cat) = filters.category {
            conditions.push(format!("category = ?{}", param_values.len() + 1));
            param_values.push(Box::new(cat.clone()));
        }
        if let Some(ref sub) = filters.subcategory {
            conditions.push(format!("subcategory = ?{}", param_values.len() + 1));
            param_values.push(Box::new(sub.clone()));
        }
        if let Some(ref m) = filters.merchant {
            conditions.push(format!("std_merchant LIKE ?{}", param_values.len() + 1));
            param_values.push(Box::new(format!("%{}%", m)));
        }
        if let Some(ref s) = filters.search {
            conditions.push(format!(
                "(raw_description LIKE ?{0} OR std_merchant LIKE ?{0} OR notes LIKE ?{0})",
                param_values.len() + 1
            ));
            param_values.push(Box::new(format!("%{}%", s)));
        }
        if let Some(min) = filters.min_amount {
            conditions.push(format!("amount >= ?{}", param_values.len() + 1));
            param_values.push(Box::new(min));
        }
        if let Some(max) = filters.max_amount {
            conditions.push(format!("amount <= ?{}", param_values.len() + 1));
            param_values.push(Box::new(max));
        }
        if let Some(ref src) = filters.source {
            conditions.push(format!("source = ?{}", param_values.len() + 1));
            param_values.push(Box::new(src.clone()));
        }

        let where_clause = conditions.join(" AND ");
        let sort_col = match filters.sort_by.as_deref() {
            Some("amount") => "amount",
            Some("category") => "category",
            Some("merchant") => "std_merchant",
            _ => "transaction_date",
        };
        let sort_dir = match filters.sort_dir.as_deref() {
            Some("asc") | Some("ASC") => "ASC",
            _ => "DESC",
        };

        let count_sql = format!("SELECT COUNT(*) FROM transactions WHERE {}", where_clause);
        let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let total: i64 = self.conn.query_row(&count_sql, params_ref.as_slice(), |row| row.get(0))?;

        let query_sql = format!(
            "SELECT id, transaction_date, year, quarter, month, month_name, year_month, day_of_week,
             category, subcategory, raw_description, std_merchant, amount, inflow_outflow, signed_amount,
             debit_r, debit_s, location, travel_flag, payment_method, tags, notes, source, source_sheet,
             import_batch_id, data_quality_status, data_quality_issue, is_deleted, created_at, updated_at
             FROM transactions WHERE {} ORDER BY {} {} LIMIT {} OFFSET {}",
            where_clause, sort_col, sort_dir, page_size, offset
        );

        let params_ref2: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&query_sql)?;
        let rows = stmt.query_map(params_ref2.as_slice(), |row| {
            Ok(Transaction {
                id: row.get(0)?,
                transaction_date: row.get(1)?,
                year: row.get(2)?,
                quarter: row.get(3)?,
                month: row.get(4)?,
                month_name: row.get(5)?,
                year_month: row.get(6)?,
                day_of_week: row.get(7)?,
                category: row.get(8)?,
                subcategory: row.get(9)?,
                raw_description: row.get(10)?,
                std_merchant: row.get(11)?,
                amount: row.get(12)?,
                inflow_outflow: row.get(13)?,
                signed_amount: row.get(14)?,
                debit_r: row.get(15)?,
                debit_s: row.get(16)?,
                location: row.get(17)?,
                travel_flag: row.get(18)?,
                payment_method: row.get(19)?,
                tags: row.get(20)?,
                notes: row.get(21)?,
                source: row.get(22)?,
                source_sheet: row.get(23)?,
                import_batch_id: row.get(24)?,
                data_quality_status: row.get(25)?,
                data_quality_issue: row.get(26)?,
                is_deleted: row.get(27)?,
                created_at: row.get(28)?,
                updated_at: row.get(29)?,
            })
        })?;

        let data: Vec<Transaction> = rows.filter_map(|r| r.ok()).collect();
        let total_pages = (total as f64 / page_size as f64).ceil() as i64;

        Ok(PaginatedResult {
            data,
            total,
            page,
            page_size,
            total_pages,
        })
    }

    pub fn add_transaction(&self, txn: &NewTransaction) -> SqlResult<Transaction> {
        let id = uuid::Uuid::new_v4().to_string();
        let date = &txn.transaction_date;
        let parts: Vec<&str> = date.split('-').collect();
        let year: i32 = parts.first().and_then(|y| y.parse().ok()).unwrap_or(2026);
        let month: i32 = parts.get(1).and_then(|m| m.parse().ok()).unwrap_or(1);
        let quarter = match month {
            1..=3 => "Q1",
            4..=6 => "Q2",
            7..=9 => "Q3",
            _ => "Q4",
        };
        let year_month = format!("{}-{:02}", year, month);
        let month_names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        let month_name = month_names.get((month - 1) as usize).unwrap_or(&"Unknown");
        let inflow_outflow = txn.inflow_outflow.as_deref().unwrap_or("Outflow");
        let signed = if inflow_outflow == "Inflow" { txn.amount } else { -txn.amount };
        let travel = if txn.travel_flag.unwrap_or(false) { 1 } else { 0 };

        self.conn.execute(
            "INSERT INTO transactions (id, transaction_date, year, quarter, month, month_name, year_month,
             category, subcategory, raw_description, std_merchant, amount, inflow_outflow, signed_amount,
             debit_r, debit_s, location, travel_flag, payment_method, tags, notes, source)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,'manual')",
            params![
                id, date, year, quarter, month, month_name, year_month,
                txn.category, txn.subcategory, txn.raw_description, txn.std_merchant,
                txn.amount, inflow_outflow, signed,
                txn.debit_r, txn.debit_s, txn.location, travel, txn.payment_method,
                txn.tags, txn.notes,
            ],
        )?;

        self.get_transaction_by_id(&id)
    }

    pub fn get_transaction_by_id(&self, id: &str) -> SqlResult<Transaction> {
        self.conn.query_row(
            "SELECT id, transaction_date, year, quarter, month, month_name, year_month, day_of_week,
             category, subcategory, raw_description, std_merchant, amount, inflow_outflow, signed_amount,
             debit_r, debit_s, location, travel_flag, payment_method, tags, notes, source, source_sheet,
             import_batch_id, data_quality_status, data_quality_issue, is_deleted, created_at, updated_at
             FROM transactions WHERE id = ?1",
            params![id],
            |row| {
                Ok(Transaction {
                    id: row.get(0)?,
                    transaction_date: row.get(1)?,
                    year: row.get(2)?,
                    quarter: row.get(3)?,
                    month: row.get(4)?,
                    month_name: row.get(5)?,
                    year_month: row.get(6)?,
                    day_of_week: row.get(7)?,
                    category: row.get(8)?,
                    subcategory: row.get(9)?,
                    raw_description: row.get(10)?,
                    std_merchant: row.get(11)?,
                    amount: row.get(12)?,
                    inflow_outflow: row.get(13)?,
                    signed_amount: row.get(14)?,
                    debit_r: row.get(15)?,
                    debit_s: row.get(16)?,
                    location: row.get(17)?,
                    travel_flag: row.get(18)?,
                    payment_method: row.get(19)?,
                    tags: row.get(20)?,
                    notes: row.get(21)?,
                    source: row.get(22)?,
                    source_sheet: row.get(23)?,
                    import_batch_id: row.get(24)?,
                    data_quality_status: row.get(25)?,
                    data_quality_issue: row.get(26)?,
                    is_deleted: row.get(27)?,
                    created_at: row.get(28)?,
                    updated_at: row.get(29)?,
                })
            },
        )
    }

    pub fn update_transaction(&self, id: &str, update: &UpdateTransaction) -> SqlResult<Transaction> {
        let mut sets = Vec::new();
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        macro_rules! add_field {
            ($field:ident, $col:expr) => {
                if let Some(ref val) = update.$field {
                    param_values.push(Box::new(val.clone()));
                    sets.push(format!("{} = ?{}", $col, param_values.len()));
                }
            };
        }

        add_field!(transaction_date, "transaction_date");
        add_field!(category, "category");
        add_field!(subcategory, "subcategory");
        add_field!(raw_description, "raw_description");
        add_field!(std_merchant, "std_merchant");
        add_field!(inflow_outflow, "inflow_outflow");
        add_field!(payment_method, "payment_method");
        add_field!(tags, "tags");
        add_field!(notes, "notes");

        if let Some(amt) = update.amount {
            param_values.push(Box::new(amt));
            sets.push(format!("amount = ?{}", param_values.len()));
            let dir = update.inflow_outflow.as_deref().unwrap_or("Outflow");
            let signed = if dir == "Inflow" { amt } else { -amt };
            param_values.push(Box::new(signed));
            sets.push(format!("signed_amount = ?{}", param_values.len()));
        }

        if let Some(dr) = update.debit_r {
            param_values.push(Box::new(dr));
            sets.push(format!("debit_r = ?{}", param_values.len()));
        }
        if let Some(ds) = update.debit_s {
            param_values.push(Box::new(ds));
            sets.push(format!("debit_s = ?{}", param_values.len()));
        }

        sets.push("updated_at = datetime('now')".to_string());

        if !sets.is_empty() {
            param_values.push(Box::new(id.to_string()));
            let sql = format!(
                "UPDATE transactions SET {} WHERE id = ?{}",
                sets.join(", "),
                param_values.len()
            );
            let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
            self.conn.execute(&sql, params_ref.as_slice())?;
        }

        // Update derived fields if date changed
        if let Some(ref date) = update.transaction_date {
            let parts: Vec<&str> = date.split('-').collect();
            let year: i32 = parts.first().and_then(|y| y.parse().ok()).unwrap_or(2026);
            let month: i32 = parts.get(1).and_then(|m| m.parse().ok()).unwrap_or(1);
            let quarter = match month {
                1..=3 => "Q1", 4..=6 => "Q2", 7..=9 => "Q3", _ => "Q4",
            };
            let year_month = format!("{}-{:02}", year, month);
            self.conn.execute(
                "UPDATE transactions SET year=?1, month=?2, quarter=?3, year_month=?4 WHERE id=?5",
                params![year, month, quarter, year_month, id],
            )?;
        }

        self.get_transaction_by_id(id)
    }

    pub fn delete_transaction(&self, id: &str) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE transactions SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn get_monthly_spending(&self, date_from: Option<&str>, date_to: Option<&str>, category: Option<&str>) -> SqlResult<Vec<MonthlySpending>> {
        let mut conditions = vec!["is_deleted = 0".to_string(), "inflow_outflow = 'Outflow'".to_string()];
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(df) = date_from {
            param_values.push(Box::new(df.to_string()));
            conditions.push(format!("transaction_date >= ?{}", param_values.len()));
        }
        if let Some(dt) = date_to {
            param_values.push(Box::new(dt.to_string()));
            conditions.push(format!("transaction_date <= ?{}", param_values.len()));
        }
        if let Some(cat) = category {
            param_values.push(Box::new(cat.to_string()));
            conditions.push(format!("category = ?{}", param_values.len()));
        }

        let sql = format!(
            "SELECT year_month, SUM(amount) as total FROM transactions WHERE {} GROUP BY year_month ORDER BY year_month",
            conditions.join(" AND ")
        );

        let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok(MonthlySpending {
                year_month: row.get(0)?,
                total: row.get(1)?,
                category_totals: None,
            })
        })?;

        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_yearly_spending(&self, date_from: Option<&str>, date_to: Option<&str>, category: Option<&str>) -> SqlResult<Vec<YearlySpending>> {
        let mut conditions = vec!["is_deleted = 0".to_string(), "inflow_outflow = 'Outflow'".to_string()];
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(df) = date_from {
            param_values.push(Box::new(df.to_string()));
            conditions.push(format!("year >= ?{}", param_values.len()));
        }
        if let Some(dt) = date_to {
            param_values.push(Box::new(dt.to_string()));
            conditions.push(format!("year <= ?{}", param_values.len()));
        }
        if let Some(cat) = category {
            param_values.push(Box::new(cat.to_string()));
            conditions.push(format!("category = ?{}", param_values.len()));
        }

        let sql = format!(
            "SELECT year, SUM(amount) as total FROM transactions WHERE {} GROUP BY year ORDER BY year",
            conditions.join(" AND ")
        );

        let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok(YearlySpending {
                year: row.get(0)?,
                total: row.get(1)?,
                category_totals: None,
            })
        })?;

        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_category_breakdown(&self, date_from: Option<&str>, date_to: Option<&str>) -> SqlResult<Vec<CategoryBreakdown>> {
        let mut conditions = vec!["is_deleted = 0".to_string(), "inflow_outflow = 'Outflow'".to_string()];
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(df) = date_from {
            param_values.push(Box::new(df.to_string()));
            conditions.push(format!("transaction_date >= ?{}", param_values.len()));
        }
        if let Some(dt) = date_to {
            param_values.push(Box::new(dt.to_string()));
            conditions.push(format!("transaction_date <= ?{}", param_values.len()));
        }

        let sql = format!(
            "SELECT category, SUM(amount) as total, COUNT(*) as cnt FROM transactions WHERE {} GROUP BY category ORDER BY total DESC",
            conditions.join(" AND ")
        );

        let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&sql)?;

        let grand_total_sql = format!(
            "SELECT SUM(amount) FROM transactions WHERE {}",
            conditions.join(" AND ")
        );
        let params_ref2: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let grand_total: f64 = self.conn.query_row(&grand_total_sql, params_ref2.as_slice(), |row| row.get(0)).unwrap_or(0.0);

        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            let total: f64 = row.get(1)?;
            Ok(CategoryBreakdown {
                category: row.get(0)?,
                total,
                count: row.get(2)?,
                percentage: if grand_total > 0.0 { (total / grand_total) * 100.0 } else { 0.0 },
            })
        })?;

        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_subcategory_breakdown(&self, category: &str, date_from: Option<&str>, date_to: Option<&str>) -> SqlResult<Vec<SubcategoryBreakdown>> {
        let mut conditions = vec![
            "is_deleted = 0".to_string(),
            "inflow_outflow = 'Outflow'".to_string(),
        ];
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        param_values.push(Box::new(category.to_string()));
        conditions.push(format!("category = ?{}", param_values.len()));

        if let Some(df) = date_from {
            param_values.push(Box::new(df.to_string()));
            conditions.push(format!("transaction_date >= ?{}", param_values.len()));
        }
        if let Some(dt) = date_to {
            param_values.push(Box::new(dt.to_string()));
            conditions.push(format!("transaction_date <= ?{}", param_values.len()));
        }

        let sql = format!(
            "SELECT COALESCE(subcategory, 'General') as sub, SUM(amount) as total, COUNT(*) as cnt
             FROM transactions WHERE {} GROUP BY sub ORDER BY total DESC",
            conditions.join(" AND ")
        );

        let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok(SubcategoryBreakdown {
                subcategory: row.get(0)?,
                total: row.get(1)?,
                count: row.get(2)?,
            })
        })?;

        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_top_merchants(&self, date_from: Option<&str>, date_to: Option<&str>, limit: i64) -> SqlResult<Vec<MerchantSpending>> {
        let mut conditions = vec![
            "is_deleted = 0".to_string(),
            "inflow_outflow = 'Outflow'".to_string(),
            "std_merchant IS NOT NULL".to_string(),
            "std_merchant != ''".to_string(),
        ];
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(df) = date_from {
            param_values.push(Box::new(df.to_string()));
            conditions.push(format!("transaction_date >= ?{}", param_values.len()));
        }
        if let Some(dt) = date_to {
            param_values.push(Box::new(dt.to_string()));
            conditions.push(format!("transaction_date <= ?{}", param_values.len()));
        }

        let sql = format!(
            "SELECT std_merchant, SUM(amount) as total, COUNT(*) as cnt
             FROM transactions WHERE {} GROUP BY std_merchant ORDER BY total DESC LIMIT {}",
            conditions.join(" AND "), limit
        );

        let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok(MerchantSpending {
                merchant: row.get(0)?,
                total: row.get(1)?,
                count: row.get(2)?,
            })
        })?;

        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_spending_by_member(&self, date_from: Option<&str>, date_to: Option<&str>) -> SqlResult<Vec<MemberSpending>> {
        let mut conditions = vec!["is_deleted = 0".to_string(), "inflow_outflow = 'Outflow'".to_string()];
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(df) = date_from {
            param_values.push(Box::new(df.to_string()));
            conditions.push(format!("transaction_date >= ?{}", param_values.len()));
        }
        if let Some(dt) = date_to {
            param_values.push(Box::new(dt.to_string()));
            conditions.push(format!("transaction_date <= ?{}", param_values.len()));
        }

        let sql = format!(
            "SELECT year_month, COALESCE(SUM(debit_r), 0) as r_total, COALESCE(SUM(debit_s), 0) as s_total
             FROM transactions WHERE {} GROUP BY year_month ORDER BY year_month",
            conditions.join(" AND ")
        );

        let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok(MemberSpending {
                year_month: row.get(0)?,
                debit_r_total: row.get(1)?,
                debit_s_total: row.get(2)?,
            })
        })?;

        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_key_metrics(&self) -> SqlResult<KeyMetrics> {
        let total_transactions: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM transactions WHERE is_deleted = 0", [], |row| row.get(0)
        )?;

        let total_spending: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE is_deleted = 0 AND inflow_outflow = 'Outflow'",
            [], |row| row.get(0)
        )?;

        let month_count: f64 = self.conn.query_row(
            "SELECT COUNT(DISTINCT year_month) FROM transactions WHERE is_deleted = 0",
            [], |row| row.get(0)
        )?;

        let avg_monthly = if month_count > 0.0 { total_spending / month_count } else { 0.0 };

        let current_year = chrono::Utc::now().format("%Y").to_string();
        let ytd_spending: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE is_deleted = 0 AND inflow_outflow = 'Outflow' AND year = ?1",
            params![current_year], |row| row.get(0)
        )?;

        let current_ym = chrono::Utc::now().format("%Y-%m").to_string();
        let current_month_spending: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE is_deleted = 0 AND inflow_outflow = 'Outflow' AND year_month = ?1",
            params![current_ym], |row| row.get(0)
        )?;

        let min_year: i32 = self.conn.query_row(
            "SELECT COALESCE(MIN(year), 2026) FROM transactions WHERE is_deleted = 0", [], |row| row.get(0)
        )?;
        let max_year: i32 = self.conn.query_row(
            "SELECT COALESCE(MAX(year), 2026) FROM transactions WHERE is_deleted = 0", [], |row| row.get(0)
        )?;
        let years_of_data = (max_year - min_year + 1).max(0);

        let (top_cat, top_amt): (String, f64) = self.conn.query_row(
            "SELECT category, SUM(amount) as total FROM transactions WHERE is_deleted = 0 AND inflow_outflow = 'Outflow'
             GROUP BY category ORDER BY total DESC LIMIT 1",
            [], |row| Ok((row.get(0)?, row.get(1)?))
        ).unwrap_or(("None".to_string(), 0.0));

        let dq_issues: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM transactions WHERE is_deleted = 0 AND data_quality_status = 'flagged'",
            [], |row| row.get(0)
        )?;

        Ok(KeyMetrics {
            total_transactions,
            total_spending,
            avg_monthly_spending: avg_monthly,
            ytd_spending,
            current_month_spending,
            years_of_data,
            top_category: top_cat,
            top_category_amount: top_amt,
            data_quality_issues: dq_issues,
        })
    }

    pub fn get_import_history(&self) -> SqlResult<Vec<ImportBatch>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, filename, imported_at, total_rows, imported_rows, error_rows, warning_rows, status
             FROM import_batches ORDER BY imported_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(ImportBatch {
                id: row.get(0)?,
                filename: row.get(1)?,
                imported_at: row.get(2)?,
                total_rows: row.get(3)?,
                imported_rows: row.get(4)?,
                error_rows: row.get(5)?,
                warning_rows: row.get(6)?,
                status: row.get(7)?,
            })
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_categories(&self) -> SqlResult<Vec<Category>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, category, subcategory, transaction_count, total_amount, is_active FROM categories ORDER BY category, subcategory"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                category: row.get(1)?,
                subcategory: row.get(2)?,
                transaction_count: row.get(3)?,
                total_amount: row.get(4)?,
                is_active: row.get::<_, i32>(5)? == 1,
            })
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get_data_quality_issues(&self, page: i64, page_size: i64) -> SqlResult<PaginatedResult<DataQualityIssue>> {
        let offset = (page - 1) * page_size;
        let total: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM transactions WHERE is_deleted = 0 AND data_quality_status = 'flagged'",
            [], |row| row.get(0)
        )?;

        let mut stmt = self.conn.prepare(
            "SELECT id, raw_description, amount, transaction_date, data_quality_issue, data_quality_status, category
             FROM transactions WHERE is_deleted = 0 AND data_quality_status = 'flagged'
             ORDER BY transaction_date DESC LIMIT ?1 OFFSET ?2"
        )?;
        let rows = stmt.query_map(params![page_size, offset], |row| {
            Ok(DataQualityIssue {
                id: row.get(0)?,
                raw_description: row.get(1)?,
                amount: row.get(2)?,
                transaction_date: row.get(3)?,
                data_quality_issue: row.get(4)?,
                data_quality_status: row.get(5)?,
                category: row.get(6)?,
            })
        })?;

        let data: Vec<DataQualityIssue> = rows.filter_map(|r| r.ok()).collect();
        let total_pages = (total as f64 / page_size as f64).ceil() as i64;

        Ok(PaginatedResult { data, total, page, page_size, total_pages })
    }

    pub fn resolve_data_quality_issue(&self, id: &str, category: &str, subcategory: Option<&str>) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE transactions SET category = ?1, subcategory = ?2, data_quality_status = 'resolved',
             updated_at = datetime('now') WHERE id = ?3",
            params![category, subcategory, id],
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> SqlResult<Option<String>> {
        match self.conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        ) {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn update_setting(&self, key: &str, value: &str) -> SqlResult<()> {
        self.conn.execute(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_merchant_suggestion(&self, description: &str) -> SqlResult<Option<(String, String)>> {
        match self.conn.query_row(
            "SELECT category, subcategory FROM merchant_map WHERE raw_description = ?1 OR standardized_merchant = ?1 LIMIT 1",
            params![description],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
        ) {
            Ok((cat, sub)) => Ok(Some((cat, sub.unwrap_or_default()))),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        db.conn.execute(
            "INSERT INTO transactions (id, transaction_date, year, month, year_month, category, amount, inflow_outflow, signed_amount, source)
             VALUES ('test-1', '2024-01-15', 2024, 1, '2024-01', 'Food', 50.0, 'Outflow', -50.0, 'manual')",
            [],
        ).unwrap();
        db.conn.execute(
            "INSERT INTO transactions (id, transaction_date, year, month, year_month, category, subcategory, std_merchant, amount, inflow_outflow, signed_amount, source)
             VALUES ('test-2', '2024-02-20', 2024, 2, '2024-02', 'Transportation', 'Gas', 'Shell', 40.0, 'Outflow', -40.0, 'manual')",
            [],
        ).unwrap();
        db.conn.execute(
            "INSERT INTO transactions (id, transaction_date, year, month, year_month, category, amount, inflow_outflow, signed_amount, source)
             VALUES ('test-3', '2023-06-10', 2023, 6, '2023-06', 'Food', 75.0, 'Outflow', -75.0, 'imported')",
            [],
        ).unwrap();
        db
    }

    #[test]
    fn test_get_transactions_no_filter() {
        let db = setup_test_db();
        let filters = TransactionFilters {
            date_from: None, date_to: None, category: None, subcategory: None,
            merchant: None, search: None, min_amount: None, max_amount: None,
            source: None, sort_by: None, sort_dir: None, page: None, page_size: None,
        };
        let result = db.get_transactions(&filters).unwrap();
        assert_eq!(result.total, 3);
        assert_eq!(result.data.len(), 3);
    }

    #[test]
    fn test_get_transactions_with_category_filter() {
        let db = setup_test_db();
        let filters = TransactionFilters {
            date_from: None, date_to: None, category: Some("Food".to_string()),
            subcategory: None, merchant: None, search: None, min_amount: None,
            max_amount: None, source: None, sort_by: None, sort_dir: None,
            page: None, page_size: None,
        };
        let result = db.get_transactions(&filters).unwrap();
        assert_eq!(result.total, 2);
    }

    #[test]
    fn test_get_transactions_with_date_filter() {
        let db = setup_test_db();
        let filters = TransactionFilters {
            date_from: Some("2024-01-01".to_string()), date_to: Some("2024-12-31".to_string()),
            category: None, subcategory: None, merchant: None, search: None,
            min_amount: None, max_amount: None, source: None, sort_by: None,
            sort_dir: None, page: None, page_size: None,
        };
        let result = db.get_transactions(&filters).unwrap();
        assert_eq!(result.total, 2);
    }

    #[test]
    fn test_add_transaction() {
        let db = setup_test_db();
        let new_txn = NewTransaction {
            transaction_date: "2024-03-15".to_string(),
            category: "Utilities".to_string(),
            subcategory: Some("Electric".to_string()),
            raw_description: Some("Power bill".to_string()),
            std_merchant: Some("ConEd".to_string()),
            amount: 120.0,
            inflow_outflow: None,
            debit_r: None, debit_s: None, location: None,
            travel_flag: None, payment_method: None, tags: None, notes: None,
        };
        let txn = db.add_transaction(&new_txn).unwrap();
        assert_eq!(txn.amount, 120.0);
        assert_eq!(txn.category, "Utilities");
        assert_eq!(txn.signed_amount, -120.0);
        assert_eq!(txn.source, "manual");
    }

    #[test]
    fn test_update_transaction() {
        let db = setup_test_db();
        let update = UpdateTransaction {
            transaction_date: None, category: Some("Dining".to_string()),
            subcategory: None, raw_description: None, std_merchant: None,
            amount: Some(55.0), inflow_outflow: None, debit_r: None, debit_s: None,
            payment_method: None, tags: None, notes: None,
        };
        let txn = db.update_transaction("test-1", &update).unwrap();
        assert_eq!(txn.category, "Dining");
        assert_eq!(txn.amount, 55.0);
    }

    #[test]
    fn test_delete_transaction() {
        let db = setup_test_db();
        db.delete_transaction("test-1").unwrap();
        let filters = TransactionFilters {
            date_from: None, date_to: None, category: None, subcategory: None,
            merchant: None, search: None, min_amount: None, max_amount: None,
            source: None, sort_by: None, sort_dir: None, page: None, page_size: None,
        };
        let result = db.get_transactions(&filters).unwrap();
        assert_eq!(result.total, 2);
    }

    #[test]
    fn test_get_monthly_spending() {
        let db = setup_test_db();
        let result = db.get_monthly_spending(None, None, None).unwrap();
        assert!(!result.is_empty());
    }

    #[test]
    fn test_get_category_breakdown() {
        let db = setup_test_db();
        let result = db.get_category_breakdown(None, None).unwrap();
        assert!(!result.is_empty());
        let food = result.iter().find(|c| c.category == "Food").unwrap();
        assert_eq!(food.total, 125.0);
    }

    #[test]
    fn test_get_key_metrics() {
        let db = setup_test_db();
        let metrics = db.get_key_metrics().unwrap();
        assert_eq!(metrics.total_transactions, 3);
        assert_eq!(metrics.total_spending, 165.0);
    }

    #[test]
    fn test_settings() {
        let db = setup_test_db();
        db.update_setting("test_key", "test_value").unwrap();
        let val = db.get_setting("test_key").unwrap();
        assert_eq!(val, Some("test_value".to_string()));
    }
}
