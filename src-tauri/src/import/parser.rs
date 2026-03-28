use calamine::{open_workbook, Reader, Xlsx, Data};

#[derive(Debug, Clone)]
pub struct RawTransaction {
    pub txn_id: Option<String>,
    pub transaction_date: Option<String>,
    pub year: Option<f64>,
    pub quarter: Option<String>,
    pub month: Option<f64>,
    pub month_name: Option<String>,
    pub year_month: Option<String>,
    pub day_of_week: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub raw_description: Option<String>,
    pub std_merchant: Option<String>,
    pub amount: Option<f64>,
    pub inflow_outflow: Option<String>,
    pub signed_amount: Option<f64>,
    pub debit_r: Option<f64>,
    pub debit_s: Option<f64>,
    pub location: Option<String>,
    pub travel_flag: Option<String>,
    pub source_sheet: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RawMerchantMapping {
    pub raw_description: String,
    pub standardized_merchant: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub txn_count: i64,
}

#[derive(Debug, Clone)]
pub struct RawCategory {
    pub category: String,
    pub subcategory: Option<String>,
    pub transaction_count: i64,
    pub total_amount: f64,
    pub avg_amount: f64,
}

#[derive(Debug, Clone)]
pub struct RawQualityIssue {
    pub txn_id: String,
    pub issue_type: String,
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub date: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct RawBudget {
    pub category: String,
    pub year: i32,
    pub monthly_budget: Option<f64>,
    pub annual_actual: Option<f64>,
    pub monthly_avg_actual: Option<f64>,
    pub variance: Option<f64>,
    pub variance_pct: Option<f64>,
}

#[derive(Debug)]
pub struct ParsedSpreadsheet {
    pub transactions: Vec<RawTransaction>,
    pub merchant_map: Vec<RawMerchantMapping>,
    pub categories: Vec<RawCategory>,
    pub quality_issues: Vec<RawQualityIssue>,
    pub budgets: Vec<RawBudget>,
    pub scenario_assumptions: Vec<(String, f64, String)>,
}

fn cell_to_string(cell: &Data) -> Option<String> {
    match cell {
        Data::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
        }
        Data::Float(f) => Some(f.to_string()),
        Data::Int(i) => Some(i.to_string()),
        Data::Bool(b) => Some(b.to_string()),
        Data::DateTime(dt) => {
            // Use calamine's ExcelDateTime API to extract the date
            if let Some(naive_dt) = dt.as_datetime() {
                Some(naive_dt.format("%Y-%m-%d").to_string())
            } else {
                None
            }
        }
        Data::DateTimeIso(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
        }
        Data::Empty => None,
        _ => None,
    }
}

fn cell_to_f64(cell: &Data) -> Option<f64> {
    match cell {
        Data::Float(f) => Some(*f),
        Data::Int(i) => Some(*i as f64),
        Data::String(s) => s.trim().parse().ok(),
        _ => None,
    }
}

fn get_cell(row: &[Data], idx: usize) -> &Data {
    row.get(idx).unwrap_or(&Data::Empty)
}

pub fn parse_xlsx(path: &str) -> Result<ParsedSpreadsheet, String> {
    let mut workbook: Xlsx<_> = open_workbook(path).map_err(|e| format!("Cannot open workbook: {}", e))?;

    let transactions = parse_master_transactions(&mut workbook)?;
    let merchant_map = parse_merchant_map(&mut workbook).unwrap_or_default();
    let categories = parse_category_map(&mut workbook).unwrap_or_default();
    let quality_issues = parse_quality_log(&mut workbook).unwrap_or_default();
    let budgets = parse_budgets(&mut workbook).unwrap_or_default();
    let scenario_assumptions = parse_scenario(&mut workbook).unwrap_or_default();

    tracing::info!(
        "Parsed: {} transactions, {} merchants, {} categories, {} quality issues",
        transactions.len(), merchant_map.len(), categories.len(), quality_issues.len()
    );

    Ok(ParsedSpreadsheet {
        transactions,
        merchant_map,
        categories,
        quality_issues,
        budgets,
        scenario_assumptions,
    })
}

fn parse_master_transactions(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<RawTransaction>, String> {
    let range = workbook.worksheet_range("Master_Transactions")
        .map_err(|e| format!("Cannot read Master_Transactions: {}", e))?;

    let mut transactions = Vec::new();
    let rows: Vec<Vec<Data>> = range.rows().map(|r| r.to_vec()).collect();

    // Skip header row
    for row in rows.iter().skip(1) {
        let txn_id = cell_to_string(get_cell(row, 0));
        if txn_id.is_none() {
            continue; // Skip empty rows
        }

        let transaction_date = cell_to_string(get_cell(row, 1));
        let year = cell_to_f64(get_cell(row, 2));
        let quarter = cell_to_string(get_cell(row, 3));
        let month = cell_to_f64(get_cell(row, 4));
        let month_name = cell_to_string(get_cell(row, 5));
        let year_month = cell_to_string(get_cell(row, 6));
        let day_of_week = cell_to_string(get_cell(row, 7));
        let category = cell_to_string(get_cell(row, 8));
        let subcategory = cell_to_string(get_cell(row, 9));
        let raw_description = cell_to_string(get_cell(row, 10));
        let std_merchant = cell_to_string(get_cell(row, 11));
        let amount = cell_to_f64(get_cell(row, 12));
        let inflow_outflow = cell_to_string(get_cell(row, 13));
        let signed_amount = cell_to_f64(get_cell(row, 14));
        let debit_r = cell_to_f64(get_cell(row, 15));
        let debit_s = cell_to_f64(get_cell(row, 16));
        let location = cell_to_string(get_cell(row, 17));
        let travel_flag = cell_to_string(get_cell(row, 18));
        let source_sheet = cell_to_string(get_cell(row, 19));

        transactions.push(RawTransaction {
            txn_id, transaction_date, year, quarter, month, month_name,
            year_month, day_of_week, category, subcategory, raw_description,
            std_merchant, amount, inflow_outflow, signed_amount, debit_r,
            debit_s, location, travel_flag, source_sheet,
        });
    }

    Ok(transactions)
}

fn parse_merchant_map(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<RawMerchantMapping>, String> {
    let range = workbook.worksheet_range("Merchant_Map")
        .map_err(|e| format!("Cannot read Merchant_Map: {}", e))?;

    let mut mappings = Vec::new();
    let rows: Vec<Vec<Data>> = range.rows().map(|r| r.to_vec()).collect();

    for row in rows.iter().skip(1) {
        let raw = cell_to_string(get_cell(row, 0));
        if let Some(raw_desc) = raw {
            mappings.push(RawMerchantMapping {
                raw_description: raw_desc,
                standardized_merchant: cell_to_string(get_cell(row, 1)),
                category: cell_to_string(get_cell(row, 2)),
                subcategory: cell_to_string(get_cell(row, 3)),
                txn_count: cell_to_f64(get_cell(row, 4)).unwrap_or(0.0) as i64,
            });
        }
    }

    Ok(mappings)
}

fn parse_category_map(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<RawCategory>, String> {
    let range = workbook.worksheet_range("Category_Map")
        .map_err(|e| format!("Cannot read Category_Map: {}", e))?;

    let mut categories = Vec::new();
    let rows: Vec<Vec<Data>> = range.rows().map(|r| r.to_vec()).collect();

    for row in rows.iter().skip(1) {
        let cat = cell_to_string(get_cell(row, 0));
        if let Some(category) = cat {
            categories.push(RawCategory {
                category,
                subcategory: cell_to_string(get_cell(row, 1)),
                transaction_count: cell_to_f64(get_cell(row, 2)).unwrap_or(0.0) as i64,
                total_amount: cell_to_f64(get_cell(row, 3)).unwrap_or(0.0),
                avg_amount: cell_to_f64(get_cell(row, 4)).unwrap_or(0.0),
            });
        }
    }

    Ok(categories)
}

fn parse_quality_log(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<RawQualityIssue>, String> {
    let range = workbook.worksheet_range("Data_Quality_Log")
        .map_err(|e| format!("Cannot read Data_Quality_Log: {}", e))?;

    let mut issues = Vec::new();
    let rows: Vec<Vec<Data>> = range.rows().map(|r| r.to_vec()).collect();

    for row in rows.iter().skip(1) {
        let txn_id = cell_to_string(get_cell(row, 0));
        if let Some(tid) = txn_id {
            issues.push(RawQualityIssue {
                txn_id: tid,
                issue_type: cell_to_string(get_cell(row, 1)).unwrap_or_else(|| "Unknown".to_string()),
                description: cell_to_string(get_cell(row, 2)),
                amount: cell_to_f64(get_cell(row, 3)),
                date: cell_to_string(get_cell(row, 4)),
                status: cell_to_string(get_cell(row, 5)).unwrap_or_else(|| "Open".to_string()),
            });
        }
    }

    Ok(issues)
}

fn parse_budgets(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<RawBudget>, String> {
    let range = workbook.worksheet_range("Budget_vs_Actual")
        .map_err(|e| format!("Cannot read Budget_vs_Actual: {}", e))?;

    let mut budgets = Vec::new();
    let rows: Vec<Vec<Data>> = range.rows().map(|r| r.to_vec()).collect();

    for row in rows.iter().skip(1) {
        let category = cell_to_string(get_cell(row, 0));
        if let Some(cat) = category {
            if cat == "TOTAL" || cat.starts_with("Note:") { continue; }
            // Import 2024 budget data
            budgets.push(RawBudget {
                category: cat,
                year: 2024,
                monthly_budget: cell_to_f64(get_cell(row, 3)),
                annual_actual: cell_to_f64(get_cell(row, 1)),
                monthly_avg_actual: cell_to_f64(get_cell(row, 2)),
                variance: cell_to_f64(get_cell(row, 6)),
                variance_pct: cell_to_f64(get_cell(row, 7)),
            });
        }
    }

    Ok(budgets)
}

fn parse_scenario(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<(String, f64, String)>, String> {
    let range = workbook.worksheet_range("Scenario_Model")
        .map_err(|e| format!("Cannot read Scenario_Model: {}", e))?;

    let mut assumptions = Vec::new();
    let rows: Vec<Vec<Data>> = range.rows().map(|r| r.to_vec()).collect();

    // Rows 5-9 contain assumptions (0-indexed: 4-8)
    let assumption_rows = [
        (4, "annual_growth_rate", "Annual Spending Growth Rate"),
        (5, "discretionary_reduction", "Discretionary Spend Reduction"),
        (6, "monthly_savings_target", "Monthly Savings Target"),
        (7, "monthly_investment", "Monthly Investment Contribution"),
        (8, "base_year_expenses", "Base Year (2024) Total Expenses"),
    ];

    for (idx, key, desc) in assumption_rows {
        if let Some(row) = rows.get(idx) {
            if let Some(val) = cell_to_f64(get_cell(row, 1)) {
                assumptions.push((key.to_string(), val, desc.to_string()));
            }
        }
    }

    Ok(assumptions)
}
