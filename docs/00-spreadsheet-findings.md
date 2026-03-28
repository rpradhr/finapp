# Spreadsheet Findings

**Source File:** Personal_Finance_Normalized.xlsx
**Prepared:** March 27, 2026
**Original Source:** FinExpRepV4.9.xlsx (2002-2026)

---

## 1. Workbook Structure

The workbook contains 14 sheets, already normalized and restructured:

| Sheet | Rows | Cols | Purpose |
|---|---|---|---|
| Read_Me | 43 | 1 | Usage guide |
| Master_Transactions | 17,882 | 20 | One row per transaction (source of truth) |
| Merchant_Map | 3,001 | 5 | Raw-to-standardized merchant mapping |
| Category_Map | 57 | 5 | Category taxonomy with counts and totals |
| Data_Quality_Log | 501 | 6 | Unresolved data quality issues |
| Monthly_Summary | 280 | 16 | Spending by category by month |
| Annual_Summary | 28 | 16 | Spending by category by year |
| Cash_Flow | 26 | 5 | Annual cash flow metrics |
| Top_Merchants | 201 | 7 | Top 200 merchants by total spend |
| Large_Transactions | 501 | 6 | Transactions over $1,000 |
| Travel_Log | 1,101 | 8 | Travel-flagged transactions |
| Budget_vs_Actual | 18 | 8 | 2024 budget vs 2025 actuals |
| Scenario_Model | 18 | 8 | Forward projection with adjustable assumptions |
| Dashboard | 53 | 3 | Executive summary metrics |

---

## 2. Master_Transactions Schema (Source of Truth)

| Column | Type | Description | Notes |
|---|---|---|---|
| Txn_ID | String | Unique ID (e.g., TXN-525D538E33) | Hash-based, stable |
| Transaction_Date | Date | ISO format (YYYY-MM-DD) | Some dates are 1st-of-month aggregates |
| Year | Integer | 2002-2026 | Derived from date |
| Quarter | String | Q1-Q4 | Derived |
| Month | Integer | 1-12 | Derived |
| Month_Name | String | Full month name | Derived |
| Year_Month | String | YYYY-MM | Derived |
| Day_of_Week | String | Full day name | Derived |
| Category | String | Top-level category | 14 categories |
| Subcategory | String | Second-level category | ~40+ subcategories |
| Raw_Description | String | Original description | May be null |
| Std_Merchant | String | Standardized merchant name | May be null |
| Amount | Float | Absolute amount (positive) | USD |
| Inflow_Outflow | String | "Inflow" or "Outflow" | Almost all are Outflow |
| Signed_Amount | Float | Negative for outflow | Derived from Amount + direction |
| Debit_R | Float | Debit column R (possibly Rahul) | Often null |
| Debit_S | Float | Debit column S (possibly Shivani) | Often null |
| Location | String | Location if available | Mostly null |
| Travel_Flag | Boolean/String | Whether travel-related | Mostly null |
| Source_Sheet | String | Original sheet name (e.g., "Jan") | Provenance |

---

## 3. Category Taxonomy

14 top-level categories with 40+ subcategories:

| Category | Top Subcategories | Txn Count | Total Amount |
|---|---|---|---|
| Uncategorized | No Description, (blank) | 1,270 | $3,148,023 (61.7%) |
| Travel | Trip Expense, Out-of-Town, Lodging | 743 | $462,490 (9.1%) |
| Miscellaneous | Shopping, Apparel, General, Home Furnishing | 3,925 | $311,261 (6.1%) |
| Food | Grocery, Dining Out, Quick Service | 7,311 | $273,342 (5.4%) |
| Gifts | (various) | 884 | $251,944 (4.9%) |
| Education | Classes/Activities, School/Classes, Childcare | 414 | $232,521 (4.6%) |
| Car | General | 402 | $170,740 (3.3%) |
| Transportation | Gas, Tolls, Transit/Rideshare | 1,428 | $76,205 (1.5%) |
| Utilities | Phone, Gas, Water, Electricity | 331 | $42,765 (0.8%) |
| Home | Rent, Maintenance | 42 | $41,089 (0.8%) |
| Health & Life | Medical, Insurance | 331 | $30,651 (0.6%) |
| India | Remittance | 54 | $36,145 (0.7%) |
| Entertainment | (various) | 237 | $12,052 (0.2%) |
| General Expenses | Loans | varies | varies |
| Income | Deposit/Payroll | 12 | $9,404 |

---

## 4. Data Quality Issues

### 4.1 Uncategorized Dominance
- **61.7% of total spending** ($3.15M) is "Uncategorized"
- 1,270 transactions with no category or "No Description"
- This is the single largest data quality challenge

### 4.2 Temporal Granularity Issues
- **2002-2003**: Many transactions dated to 1st of month (monthly aggregates)
- **2004-2006**: Mixed granularity, some daily, some monthly
- **2007+**: Increasingly daily granularity
- Some months have no data (gaps in early years)

### 4.3 Currency Conversion Artifacts
- India trip expenses show fractional amounts (e.g., $30.6818181818182)
- This suggests INR-to-USD conversion with original exchange rates
- Conversion artifacts are consistent within trip periods

### 4.4 Debit Split Columns (Debit_R, Debit_S)
- Appear to represent family member attribution (possibly Rahul and Shivani)
- Not always populated; many rows have one or both as null/0
- Sum of Debit_R + Debit_S generally equals Amount

### 4.5 Duplicate Patterns
- Some large uncategorized entries appear as exact duplicates in Large_Transactions
- Monthly aggregate entries in early years may represent totals, not individual transactions

### 4.6 Negative Values in 2025
- Several categories show negative totals for 2025 (Car: -$140.76, Utilities: -$488.41)
- Suggests refunds, corrections, or data entry artifacts
- 2025 total is -$14,962 which indicates partial/incomplete year with corrections

### 4.7 Data Quality Log
- 500 open issues logged
- All marked "Open" resolution status
- Primarily "Uncategorized transaction" issue type
- Many have descriptive text that could enable re-categorization (e.g., "Food (Khusboo, Lexington)", "Med: Staples removal")

---

## 5. Key Metrics (from Dashboard sheet)

- **Total Transactions:** 17,881
- **Years of Data:** 25 (2002-2026)
- **Total Lifetime Spending:** $5,099,241
- **Avg Annual Spending (2003-2024):** $227,151
- **Avg Monthly Spending:** $18,277
- **Highest Spending Year:** 2015 ($560,372)
- **Lowest Spending Year:** 2006 ($49,218)
- **Categories Tracked:** 14
- **Unique Merchants/Descriptions:** 9,877
- **Travel Transactions:** 1,100
- **Large Transactions (>$1K):** 764
- **Data Quality Issues:** 500

---

## 6. Supplementary Sheets Value

| Sheet | Import Value | Notes |
|---|---|---|
| Merchant_Map | HIGH | 3,000 merchant-to-category mappings, reusable for auto-categorization |
| Category_Map | HIGH | Taxonomy definition with counts |
| Data_Quality_Log | HIGH | 500 actionable items for data cleanup |
| Monthly_Summary | MEDIUM | Pre-computed; can be derived from Master_Transactions |
| Annual_Summary | MEDIUM | Pre-computed; derivable |
| Cash_Flow | MEDIUM | Pre-computed; derivable |
| Top_Merchants | MEDIUM | Pre-computed; derivable |
| Large_Transactions | MEDIUM | Subset of Master_Transactions |
| Travel_Log | MEDIUM | Subset with Location data |
| Budget_vs_Actual | HIGH | Contains budget targets (editable) |
| Scenario_Model | HIGH | Contains projection assumptions |

---

## 7. Import Strategy Implications

1. **Master_Transactions** is the primary import target (17,881 rows)
2. **Merchant_Map** should be imported as a lookup/reference table for auto-categorization
3. **Category_Map** defines the taxonomy and should seed the category system
4. **Data_Quality_Log** should be imported to surface issues in the UI
5. **Budget_vs_Actual** assumptions should be imported for budget features
6. **Scenario_Model** assumptions should be imported for projection features
7. Pre-computed summary sheets (Monthly, Annual, Cash_Flow, Top_Merchants) can be derived at runtime; import is optional for validation
8. **Travel_Log** and **Large_Transactions** are subsets and don't need separate import

---

## 8. Assumptions for Implementation

1. All amounts are in USD unless currency conversion artifacts are present
2. Debit_R and Debit_S likely represent family member splits (Rahul/Shivani)
3. Early years (2002-2006) have lower granularity; treat 1st-of-month dates as approximate
4. The "Uncategorized" problem is acknowledged but not solvable by import alone; AI-assisted re-categorization is a feature opportunity
5. 2025 data is partial (through early 2025) with corrections
6. 2026 has minimal data ($119 total)
7. Source_Sheet column preserves month-of-origin provenance from original workbook
