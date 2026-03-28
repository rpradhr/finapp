# Import Pipeline

## Overview

The import pipeline ingests financial data from an XLSX spreadsheet into the application's SQLite database. The pipeline follows four sequential stages:

```
XLSX File -> Parse (calamine) -> Normalize -> Upsert (SQLite)
```

1. **Parse**: The `parser::parse_xlsx` function opens the workbook using the `calamine` crate and extracts raw data from each supported sheet into typed Rust structs.
2. **Normalize**: The `normalizer::normalize_transaction` function validates and standardizes each raw transaction, filling in defaults and flagging data quality issues.
3. **Upsert**: The `import_spreadsheet` function in `src-tauri/src/import/mod.rs` writes normalized data to the database, inserting new rows or updating existing ones based on `Txn_ID`.

Each import run is tracked by a unique `batch_id` (UUID v4) stored in the `import_batches` table, which records total rows, imported rows, updated rows, error rows, and warning rows.

---

## Supported Sheets

The parser reads six sheets from the XLSX workbook. Only `Master_Transactions` is required; the other five fall back to empty collections if missing.

| Sheet Name | Rust Struct | Required |
|---|---|---|
| Master_Transactions | `RawTransaction` | Yes |
| Merchant_Map | `RawMerchantMapping` | No |
| Category_Map | `RawCategory` | No |
| Data_Quality_Log | `RawQualityIssue` | No |
| Budget_vs_Actual | `RawBudget` | No |
| Scenario_Model | `(String, f64, String)` tuple | No |

---

## Column Mappings

### Master_Transactions

| Column Index | Field | Type |
|---|---|---|
| 0 | Txn_ID | String (required) |
| 1 | Transaction_Date | String (date) |
| 2 | Year | f64 |
| 3 | Quarter | String |
| 4 | Month | f64 |
| 5 | Month_Name | String |
| 6 | Year_Month | String |
| 7 | Day_of_Week | String |
| 8 | Category | String |
| 9 | Subcategory | String |
| 10 | Raw_Description | String |
| 11 | Std_Merchant | String |
| 12 | Amount | f64 |
| 13 | Inflow_Outflow | String |
| 14 | Signed_Amount | f64 |
| 15 | Debit_R | f64 |
| 16 | Debit_S | f64 |
| 17 | Location | String |
| 18 | Travel_Flag | String |
| 19 | Source_Sheet | String |

Rows with a missing or empty `Txn_ID` (column 0) are skipped.

### Merchant_Map

| Column Index | Field | Type |
|---|---|---|
| 0 | Raw_Description | String (required) |
| 1 | Standardized_Merchant | String |
| 2 | Category | String |
| 3 | Subcategory | String |
| 4 | Txn_Count | f64 -> i64 |

### Category_Map

| Column Index | Field | Type |
|---|---|---|
| 0 | Category | String (required) |
| 1 | Subcategory | String |
| 2 | Transaction_Count | f64 -> i64 |
| 3 | Total_Amount | f64 |
| 4 | Avg_Amount | f64 |

### Data_Quality_Log

| Column Index | Field | Type |
|---|---|---|
| 0 | Txn_ID | String (required) |
| 1 | Issue_Type | String (defaults to "Unknown") |
| 2 | Description | String |
| 3 | Amount | f64 |
| 4 | Date | String |
| 5 | Status | String (defaults to "Open") |

### Budget_vs_Actual

| Column Index | Field | Type |
|---|---|---|
| 0 | Category | String (required) |
| 1 | Annual_Actual | f64 |
| 2 | Monthly_Avg_Actual | f64 |
| 3 | Monthly_Budget | f64 |
| 6 | Variance | f64 |
| 7 | Variance_Pct | f64 |

Rows where the category is "TOTAL" or starts with "Note:" are skipped. The year is hardcoded to 2024.

### Scenario_Model

Assumptions are read from specific rows (0-indexed rows 4 through 8), each with a key name, numeric value from column 1, and a human-readable description:

| Row Index | Key | Description |
|---|---|---|
| 4 | annual_growth_rate | Annual Spending Growth Rate |
| 5 | discretionary_reduction | Discretionary Spend Reduction |
| 6 | monthly_savings_target | Monthly Savings Target |
| 7 | monthly_investment | Monthly Investment Contribution |
| 8 | base_year_expenses | Base Year (2024) Total Expenses |

---

## Normalization Rules

The normalizer (`normalizer::normalize_transaction`) applies the following rules to each raw transaction:

### Required Fields

- **Txn_ID**: Must be present. If missing, the transaction is rejected with an error.
- **Amount**: Must be present. The absolute value is always used (negative amounts are converted to positive).

### Date Fallbacks

The normalizer attempts to resolve a transaction date using a three-level fallback chain:

1. **transaction_date field**: Parsed as ISO format (`YYYY-MM-DD`) or US format (`MM/DD/YYYY`). If already in ISO format, used as-is.
2. **year_month field**: If the date field is missing, the normalizer constructs a date as `{year_month}-01`.
3. **year + month fields**: If both year_month and transaction_date are missing, the normalizer constructs `{year}-{month:02}-01`.

If none of the three levels produce a valid date, the transaction is rejected.

### Derived Date Components

After determining the transaction date, the normalizer derives:

- **year**: Parsed from the date string; defaults to 2026 if unparseable.
- **month**: Parsed from the date string; defaults to 1 if unparseable.
- **quarter**: Computed from the month (Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec).
- **year_month**: Uses the raw value if present, otherwise formatted as `{year}-{month:02}`.
- **month_name**: Uses the raw value if present, otherwise looked up from a constant array.

### Category Defaults

- If `category` is `None`, it defaults to `"Uncategorized"`.
- If `inflow_outflow` is `None`, it defaults to `"Outflow"`.
- If `signed_amount` is `None`, it is computed from `amount` and `inflow_outflow` (positive for Inflow, negative for Outflow).

### Travel Flag

The `travel_flag` string is converted to an integer:
- Values `"1"`, `"true"`, `"True"`, `"TRUE"`, `"Yes"`, `"yes"` map to `1`.
- Everything else maps to `0`.

### Data Quality Flagging

Each normalized transaction receives a `data_quality_status` field (either `"clean"` or `"flagged"`) and an optional `data_quality_issue` description. A transaction is flagged if:

- The category is `"Uncategorized"` (issue: "Uncategorized transaction").
- Both `raw_description` and `std_merchant` are `None` (issue: "Missing description").

If both conditions apply, the issues are joined with a semicolon.

---

## Upsert Logic

Transactions are upserted by their `Txn_ID` (the `id` column in the `transactions` table):

1. The pipeline checks whether a transaction with the same `id` already exists in the database.
2. **If it exists**: An `UPDATE` is performed on all fields, but only if the existing row has `source='imported'`. The `updated_at` timestamp is set to the current time, and `import_batch_id` is updated to the current batch.
3. **If it does not exist**: An `INSERT` is performed with `source='imported'` and the current `import_batch_id`.

### Other Tables

- **merchant_map**: All rows with `source='imported'` are deleted before re-inserting from the spreadsheet. Each row is inserted with `source='imported'`.
- **categories**: The entire table is cleared and re-populated from the Category_Map sheet.
- **data quality issues**: For each issue in the Data_Quality_Log sheet, the matching transaction (by `Txn_ID`) is updated to `data_quality_status='flagged'` with the issue type as the `data_quality_issue`.
- **budgets**: Upserted via `INSERT OR REPLACE` keyed on `(category, year)`.
- **scenario_assumptions**: Upserted via `INSERT OR REPLACE` keyed on `key`.

---

## Error Handling and Quality Tracking

### Per-Row Error Handling

- If `normalize_transaction` returns an `Err`, the row is counted as an error and logged via `tracing::warn`.
- If a database `INSERT` or `UPDATE` fails, the row is counted as an error and logged.
- Newly inserted rows where `data_quality_status == "flagged"` are counted as warnings.

### Batch Summary

At the end of an import, the pipeline returns an `ImportSummary` containing:

| Field | Description |
|---|---|
| batch_id | UUID for this import run |
| total_rows | Total transaction rows in the spreadsheet |
| imported_rows | New rows inserted |
| updated_rows | Existing rows updated |
| error_rows | Rows that failed normalization or DB write |
| warning_rows | Rows flagged with data quality issues |
| merchants_imported | Number of merchant mappings imported |
| categories_imported | Number of categories imported |
| quality_issues_imported | Number of quality issues applied |

The `import_batches` table is updated with the final counts and its status is set to `"completed"`.

### Logging

The pipeline uses the `tracing` crate to log:

- An info-level summary after parsing (counts of transactions, merchants, categories, quality issues).
- Warn-level messages for each row-level normalization or database error.
