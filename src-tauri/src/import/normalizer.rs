use super::parser::RawTransaction;

#[derive(Debug, Clone)]
pub struct NormalizedTransaction {
    pub id: String,
    pub transaction_date: String,
    pub year: i32,
    pub quarter: String,
    pub month: i32,
    pub month_name: String,
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
    pub source_sheet: Option<String>,
    pub data_quality_status: String,
    pub data_quality_issue: Option<String>,
}

const MONTH_NAMES: [&str; 12] = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

pub fn normalize_transaction(raw: &RawTransaction) -> Result<NormalizedTransaction, String> {
    let id = raw.txn_id.clone().ok_or("Missing Txn_ID")?;

    let amount = raw.amount.ok_or("Missing Amount")?.abs();

    // Normalize date
    let transaction_date = normalize_date(raw)?;

    // Derive date components
    let parts: Vec<&str> = transaction_date.split('-').collect();
    let year: i32 = parts.first().and_then(|y| y.parse().ok()).unwrap_or(2026);
    let month: i32 = parts.get(1).and_then(|m| m.parse().ok()).unwrap_or(1);

    let quarter = match month {
        1..=3 => "Q1",
        4..=6 => "Q2",
        7..=9 => "Q3",
        _ => "Q4",
    }.to_string();

    let year_month = raw.year_month.clone()
        .unwrap_or_else(|| format!("{}-{:02}", year, month));

    let month_name = raw.month_name.clone()
        .unwrap_or_else(|| MONTH_NAMES.get((month - 1) as usize).unwrap_or(&"Unknown").to_string());

    let day_of_week = raw.day_of_week.clone();

    // Category
    let category = raw.category.clone().unwrap_or_else(|| "Uncategorized".to_string());
    let subcategory = raw.subcategory.clone();

    // Inflow/Outflow
    let inflow_outflow = raw.inflow_outflow.clone().unwrap_or_else(|| "Outflow".to_string());
    let signed_amount = raw.signed_amount.unwrap_or_else(|| {
        if inflow_outflow == "Inflow" { amount } else { -amount }
    });

    // Travel flag
    let travel_flag = match raw.travel_flag.as_deref() {
        Some("1") | Some("true") | Some("True") | Some("TRUE") | Some("Yes") | Some("yes") => 1,
        _ => 0,
    };

    // Data quality
    let mut dq_status = "clean".to_string();
    let mut dq_issue = None;

    if category == "Uncategorized" {
        dq_status = "flagged".to_string();
        dq_issue = Some("Uncategorized transaction".to_string());
    }
    if raw.raw_description.is_none() && raw.std_merchant.is_none() {
        dq_status = "flagged".to_string();
        dq_issue = Some(dq_issue.map_or("Missing description".to_string(),
            |existing| format!("{}; Missing description", existing)));
    }

    Ok(NormalizedTransaction {
        id,
        transaction_date,
        year,
        quarter,
        month,
        month_name,
        year_month,
        day_of_week,
        category,
        subcategory,
        raw_description: raw.raw_description.clone(),
        std_merchant: raw.std_merchant.clone(),
        amount,
        inflow_outflow,
        signed_amount,
        debit_r: raw.debit_r,
        debit_s: raw.debit_s,
        location: raw.location.clone(),
        travel_flag,
        source_sheet: raw.source_sheet.clone(),
        data_quality_status: dq_status,
        data_quality_issue: dq_issue,
    })
}

fn normalize_date(raw: &RawTransaction) -> Result<String, String> {
    // Try transaction_date first
    if let Some(ref date_str) = raw.transaction_date {
        let trimmed = date_str.trim();
        // Already ISO format?
        if trimmed.len() == 10 && trimmed.chars().nth(4) == Some('-') {
            return Ok(trimmed.to_string());
        }
        // Try parsing other formats
        if let Ok(d) = chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
            return Ok(d.format("%Y-%m-%d").to_string());
        }
        if let Ok(d) = chrono::NaiveDate::parse_from_str(trimmed, "%m/%d/%Y") {
            return Ok(d.format("%Y-%m-%d").to_string());
        }
    }

    // Fall back to year_month
    if let Some(ref ym) = raw.year_month {
        return Ok(format!("{}-01", ym));
    }

    // Fall back to year + month
    if let (Some(y), Some(m)) = (raw.year, raw.month) {
        return Ok(format!("{}-{:02}-01", y as i32, m as i32));
    }

    Err("Cannot determine transaction date".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::import::parser::RawTransaction;

    fn make_raw(overrides: impl FnOnce(&mut RawTransaction)) -> RawTransaction {
        let mut raw = RawTransaction {
            txn_id: Some("TXN-TEST123".to_string()),
            transaction_date: Some("2024-03-15".to_string()),
            year: Some(2024.0),
            quarter: Some("Q1".to_string()),
            month: Some(3.0),
            month_name: Some("March".to_string()),
            year_month: Some("2024-03".to_string()),
            day_of_week: Some("Friday".to_string()),
            category: Some("Food".to_string()),
            subcategory: Some("Grocery".to_string()),
            raw_description: Some("Grocery Store".to_string()),
            std_merchant: Some("Walmart".to_string()),
            amount: Some(50.0),
            inflow_outflow: Some("Outflow".to_string()),
            signed_amount: Some(-50.0),
            debit_r: Some(25.0),
            debit_s: Some(25.0),
            location: None,
            travel_flag: None,
            source_sheet: Some("Mar".to_string()),
        };
        overrides(&mut raw);
        raw
    }

    #[test]
    fn test_normalize_basic() {
        let raw = make_raw(|_| {});
        let result = normalize_transaction(&raw).unwrap();
        assert_eq!(result.id, "TXN-TEST123");
        assert_eq!(result.amount, 50.0);
        assert_eq!(result.category, "Food");
        assert_eq!(result.signed_amount, -50.0);
        assert_eq!(result.data_quality_status, "clean");
    }

    #[test]
    fn test_normalize_uncategorized_flagged() {
        let raw = make_raw(|r| { r.category = Some("Uncategorized".to_string()); });
        let result = normalize_transaction(&raw).unwrap();
        assert_eq!(result.data_quality_status, "flagged");
    }

    #[test]
    fn test_normalize_missing_category_defaults() {
        let raw = make_raw(|r| { r.category = None; });
        let result = normalize_transaction(&raw).unwrap();
        assert_eq!(result.category, "Uncategorized");
        assert_eq!(result.data_quality_status, "flagged");
    }

    #[test]
    fn test_normalize_date_fallback_year_month() {
        let raw = make_raw(|r| { r.transaction_date = None; });
        let result = normalize_transaction(&raw).unwrap();
        assert_eq!(result.transaction_date, "2024-03-01");
    }

    #[test]
    fn test_normalize_amount_absolute() {
        let raw = make_raw(|r| { r.amount = Some(-75.0); });
        let result = normalize_transaction(&raw).unwrap();
        assert_eq!(result.amount, 75.0);
    }

    #[test]
    fn test_normalize_missing_txn_id_errors() {
        let raw = make_raw(|r| { r.txn_id = None; });
        assert!(normalize_transaction(&raw).is_err());
    }

    #[test]
    fn test_normalize_inflow() {
        let raw = make_raw(|r| {
            r.inflow_outflow = Some("Inflow".to_string());
            r.signed_amount = None;
        });
        let result = normalize_transaction(&raw).unwrap();
        assert_eq!(result.inflow_outflow, "Inflow");
        assert_eq!(result.signed_amount, 50.0);
    }
}
