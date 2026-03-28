# Product Requirements Document: Family Expense App

**Version:** 1.0
**Author:** Claude (AI-assisted)
**Date:** March 27, 2026
**Status:** Draft for Review

---

## 1. Product Vision

A production-grade, local-first macOS desktop application that gives a family complete visibility into 24+ years of expense history, enables easy daily expense tracking, and provides AI-powered insights, predictions, and natural language interaction for financial understanding.

---

## 2. Problem Statement

The Pradhan family has meticulously tracked expenses since 2002 across spreadsheets, accumulating 17,881 transactions totaling ~$5.1M. The current spreadsheet-based system:

- Is fragile and hard to query beyond pre-built summaries
- Has 61.7% of spending classified as "Uncategorized"
- Lacks daily expense entry convenience
- Cannot answer ad-hoc questions without manual analysis
- Has no prediction or trend detection capability
- Risks data loss without proper persistence and backup

---

## 3. Goals and Non-Goals

### Goals
- Import and preserve the complete historical dataset with provenance
- Provide rich, interactive analytics and visualization
- Enable easy daily expense entry with smart categorization
- Support natural language queries and commands
- Generate AI-powered insights and spending predictions
- Run entirely locally on macOS (privacy-first)
- Be maintainable and extensible by another engineer

### Non-Goals
- Multi-device sync or cloud backend
- Mobile app (desktop-first)
- Bank/credit card auto-import (future phase)
- Multi-currency real-time conversion
- Budgeting enforcement or alerts (MVP shows budget vs actual only)
- Tax preparation features
- Investment tracking

---

## 4. Target Users and Usage Scenarios

### Primary User
- Rahul Pradhan: family financial manager, technically proficient, tracks expenses regularly

### Secondary Users
- Family members who may view dashboards or add expenses

### Usage Scenarios
1. **Weekly review**: Browse trends, check category spending, compare to prior periods
2. **Daily entry**: Quick-add an expense after a purchase
3. **Monthly summary**: Review the month's spending, see predictions for remainder
4. **Annual planning**: Look at year-over-year trends, project future spending
5. **Ad-hoc query**: "How much did we spend on groceries in 2023?" via natural language
6. **Data cleanup**: Review and re-categorize uncategorized transactions
7. **Import update**: Re-import an updated spreadsheet without losing manual entries

---

## 5. Key User Jobs to Be Done

| Job | Frequency | Priority |
|---|---|---|
| See total spending trends at a glance | Weekly | P0 |
| Add a new expense quickly | Daily | P0 |
| Compare spending across periods | Weekly | P0 |
| Drill into category/subcategory detail | Weekly | P0 |
| Ask natural language questions about spending | Weekly | P1 |
| View AI-generated insights and anomalies | Weekly | P1 |
| See spending predictions | Monthly | P1 |
| Edit or correct a past expense | As needed | P0 |
| Import historical spreadsheet data | Once/rarely | P0 |
| Review and resolve data quality issues | As needed | P1 |
| Search transactions by merchant, description, amount | As needed | P0 |

---

## 6. Detailed User Workflows

### WF-1: First-Time Import of Historical Spreadsheet

1. User opens app for the first time; sees empty state with import prompt
2. User clicks "Import Spreadsheet" and selects the .xlsx file
3. App shows import progress: parsing, validating, normalizing
4. App displays import summary:
   - Total rows parsed
   - Rows successfully imported
   - Rows with warnings (e.g., missing category)
   - Rows with errors (e.g., unparseable date)
   - Data quality issues detected
5. User reviews summary and confirms import
6. App persists all data including raw provenance
7. Dashboard populates with imported data

### WF-2: Resolving Import Validation Issues

1. User navigates to Import > Data Quality section
2. Sees list of flagged issues (uncategorized, missing dates, etc.)
3. Can filter by issue type, date range, amount
4. For each issue, can:
   - Assign a category/subcategory
   - Edit description
   - Mark as reviewed/resolved
5. Changes are saved immediately
6. Issue count decreases as items are resolved

### WF-3: Browsing Trends Over Time

1. User opens Overview or Trends section
2. Sees default view: monthly spending for last 12 months
3. Can switch to yearly view (full history)
4. Can adjust date range with date picker
5. Sees line chart with total spending over time
6. Can overlay category breakdown (stacked area or stacked bar)
7. Hovering shows tooltip with exact figures
8. Can click a data point to drill into that period

### WF-4: Drilling Into Category and Subcategory Spending

1. User navigates to Categories section
2. Sees donut/bar chart of spending by category
3. Clicks a category to see subcategory breakdown
4. Sees table of transactions within that category
5. Can filter by date range, amount range
6. Can sort by date, amount, merchant

### WF-5: Adding a New Daily Expense

1. User clicks "Add Expense" button (always accessible)
2. Form appears with fields: Date (default today), Amount, Category, Subcategory, Description, Merchant, Payment Method, Family Member, Tags, Notes
3. As user types description, app suggests category based on Merchant_Map
4. User fills required fields (Amount, Category) and submits
5. Expense appears in recent transactions list
6. Analytics update to reflect new entry
7. If duplicate detected (same date, amount, merchant), shows warning

### WF-6: Editing a Recent Expense

1. User finds expense in Transactions list or recent entries
2. Clicks edit icon
3. Inline or modal edit form appears with current values
4. User modifies fields and saves
5. Change is persisted with updated_at timestamp
6. Original values are preserved in audit trail

### WF-7: Asking a Natural Language Question

1. User opens AI Assistant section or uses global search bar
2. Types: "How much did we spend on groceries in 2023?"
3. App parses intent: query, entity=Food/Grocery, period=2023
4. Executes query against local database
5. Displays answer: "$19,255 on groceries in 2023" with supporting chart
6. User can ask follow-up: "How does that compare to 2022?"
7. App shows comparison with delta

### WF-8: Using Natural Language to Add an Expense

1. User types in AI Assistant: "Add $45 groceries at Wegmans today"
2. App parses: action=add, amount=$45, category=Food, subcategory=Grocery, merchant=Wegmans, date=today
3. App shows confirmation: "Add expense: $45.00 - Food/Grocery - Wegmans - March 27, 2026?"
4. User confirms
5. Expense is created

### WF-9: Reviewing Predictions and AI Summaries

1. User navigates to Overview or dedicated Insights section
2. Sees cards:
   - "Projected 2026 spending: $X based on historical trends"
   - "Grocery spending is up 12% vs last year"
   - "Unusual spike in Travel spending in March"
3. Each card links to detailed view with methodology explanation
4. Predictions are clearly labeled as estimates

### WF-10: Re-Importing a Newer Spreadsheet

1. User navigates to Import section
2. Clicks "Re-import Spreadsheet"
3. App warns: "This will update imported records. Manually added expenses will be preserved."
4. User selects new file
5. App compares by Txn_ID:
   - New Txn_IDs: inserted
   - Existing Txn_IDs with changes: updated (with provenance)
   - Txn_IDs no longer present: flagged but not deleted
6. Manual entries (no Txn_ID from import) are untouched
7. Summary shows adds/updates/unchanged/flagged

---

## 7. Functional Requirements

### FR-1: Data Import
- FR-1.1: Parse .xlsx files with openpyxl-compatible backend
- FR-1.2: Import Master_Transactions as primary dataset
- FR-1.3: Import Merchant_Map as categorization reference
- FR-1.4: Import Category_Map as taxonomy definition
- FR-1.5: Import Data_Quality_Log for issue tracking
- FR-1.6: Import Budget_vs_Actual for budget baselines
- FR-1.7: Import Scenario_Model assumptions
- FR-1.8: Generate import batch ID for each import operation
- FR-1.9: Preserve raw row data alongside normalized records
- FR-1.10: Support re-import with upsert logic by Txn_ID

### FR-2: Expense Management
- FR-2.1: Create new expense with all supported fields
- FR-2.2: Edit existing expense
- FR-2.3: Delete expense (soft delete with confirmation)
- FR-2.4: List expenses with pagination
- FR-2.5: Filter by date range, category, subcategory, merchant, amount range, family member
- FR-2.6: Search by description text
- FR-2.7: Sort by any column
- FR-2.8: Category auto-suggestion based on merchant/description
- FR-2.9: Duplicate detection warning

### FR-3: Analytics and Visualization
- FR-3.1: Total spending over time (monthly, yearly)
- FR-3.2: Month-over-month comparison
- FR-3.3: Year-over-year comparison
- FR-3.4: Category breakdown (pie/donut chart)
- FR-3.5: Subcategory breakdown within a category
- FR-3.6: Top merchants by spend
- FR-3.7: Spending by family member (Debit_R vs Debit_S)
- FR-3.8: Date range filter on all charts
- FR-3.9: Category filter on all charts
- FR-3.10: Anomaly/spike detection highlighting
- FR-3.11: Large transaction flagging
- FR-3.12: Travel spending analysis

### FR-4: Natural Language Interaction
- FR-4.1: Parse natural language queries about spending
- FR-4.2: Parse natural language commands to add/edit expenses
- FR-4.3: Confirmation step for all data mutations
- FR-4.4: Conversation context for follow-up questions
- FR-4.5: Graceful fallback when intent is unclear
- FR-4.6: Display structured results with supporting visualizations

### FR-5: Prediction and Insights
- FR-5.1: Annual spending projection based on historical trends
- FR-5.2: Category-level trend projections
- FR-5.3: Monthly spending forecast for current year
- FR-5.4: Anomaly detection with explanation
- FR-5.5: Period summary generation (month, quarter, year)
- FR-5.6: All predictions labeled as estimates with methodology

### FR-6: Data Quality Management
- FR-6.1: Display imported data quality issues
- FR-6.2: Allow manual resolution (re-categorize, add description)
- FR-6.3: Track resolution status
- FR-6.4: Show data quality score/metrics

### FR-7: Settings
- FR-7.1: Configure AI provider (local vs external)
- FR-7.2: Manage category taxonomy
- FR-7.3: View import history
- FR-7.4: Export data as CSV
- FR-7.5: Database backup/restore

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Startup time | < 3 seconds |
| Query response (simple) | < 500ms |
| Query response (complex analytics) | < 2 seconds |
| Import 17,881 rows | < 30 seconds |
| Local storage size | < 100MB for full dataset |
| Memory usage | < 512MB typical |
| Offline operation | Full functionality without internet |
| Data integrity | ACID transactions via SQLite |

---

## 9. AI Requirements and Guardrails

### AI Provider Strategy
- **Default mode:** Local/offline with rule-based NLP and statistical methods
- **Optional mode:** External LLM (Anthropic Claude API) for richer NL interaction
- Provider is configurable; app works fully without external AI

### AI Guardrails
- Raw financial data never sent to external APIs by default
- Only anonymized/aggregated summaries sent if external AI enabled
- User must explicitly opt in to external AI
- All AI-generated content labeled as AI-generated
- Predictions include confidence qualifiers
- No financial advice framing; data and trends only

---

## 10. Privacy and Local-First Requirements

- All data stored locally in SQLite database on user's machine
- No telemetry, analytics, or data collection
- No network calls unless user explicitly enables external AI
- Database file is user-owned and portable
- No authentication required (single-user local app)

---

## 11. Data Import Requirements

- Support .xlsx format
- Handle the specific 14-sheet structure of this workbook
- Validate all rows before persisting
- Surface validation errors clearly
- Preserve raw imported values alongside normalized data
- Support incremental re-import (upsert by Txn_ID)
- Maintain import batch history
- Handle edge cases:
  - Missing dates (use fallback from Year_Month)
  - Missing categories (import as "Uncategorized")
  - Currency conversion artifacts (preserve as-is)
  - Negative amounts (preserve and flag)
  - Null/empty fields (preserve nulls)

---

## 12. Analytics and Reporting Requirements

### Dashboard (Overview)
- Key metrics: total spending, average monthly, YTD spending, transaction count
- Spending trend chart (last 12 months default)
- Category breakdown
- Recent large transactions
- Data quality summary

### Trends
- Monthly spending line chart (full history)
- Yearly spending bar chart
- Configurable date range
- Category overlay option

### Categories
- Category donut chart
- Category-to-subcategory drill-down
- Table of transactions per category
- Filters and sorting

### Transactions
- Full transaction table with all columns
- Pagination, filtering, search, sort
- Inline edit
- Bulk operations (future phase)

---

## 13. Prediction and NL Workflow Requirements

### Prediction Methods (MVP)
- **Linear trend projection:** Weighted moving average of annual spending
- **Seasonal adjustment:** Month-level patterns from historical data
- **Category-level trends:** Per-category growth rates

### Natural Language Processing (MVP)
- **Rule-based parser** for common patterns:
  - "How much did I spend on [category] in [period]?"
  - "Add $[amount] for [category] at [merchant]"
  - "Compare [period1] vs [period2]"
  - "What's my top spending category in [period]?"
  - "Show me [category] spending trend"
- **Intent classification:** query, add, edit, compare, summarize, predict
- **Entity extraction:** amount, category, subcategory, merchant, date/period
- **Fallback:** "I didn't understand that. Try: 'How much did I spend on groceries in 2023?'"

### Enhanced NL (with external AI)
- Free-form queries with full context
- Richer explanations and summaries
- Category suggestion for ambiguous entries

---

## 14. Admin/Settings Requirements

- AI provider configuration (local/external, API key if external)
- Category taxonomy viewer/editor
- Import history log
- Data export (CSV)
- Database info (size, record counts)
- About/version info

---

## 15. Error Handling and Edge Cases

| Scenario | Handling |
|---|---|
| Corrupt/incompatible spreadsheet | Clear error message, no partial import |
| Duplicate import | Upsert by Txn_ID, show delta summary |
| Missing required fields on entry | Client-side validation, highlight fields |
| NL query not understood | Suggest example queries |
| External AI unavailable | Fall back to local processing |
| Database corruption | Backup/restore guidance in settings |
| Very large import (>100K rows) | Progress indicator, background processing |
| Zero-amount transactions | Allow but flag |
| Future-dated transactions | Allow but flag |

---

## 16. Success Criteria

1. All 17,881 historical transactions imported and queryable
2. Dashboard renders meaningful charts from real data
3. User can add, edit, and delete expenses
4. At least 5 natural language query patterns work correctly
5. At least 2 natural language add-expense patterns work
6. Spending predictions generated for current and next year
7. Category drill-down works to subcategory level
8. Date range filtering works across all views
9. App starts and operates fully offline
10. All automated tests pass

---

## 17. MVP Scope vs Phase 2

### MVP (This Build)
- Full historical import with provenance
- Dashboard with key metrics and charts
- Trends (monthly/yearly) with date range
- Category breakdown and drill-down
- Transaction list with filter/search/sort
- Add/edit/delete expenses
- Rule-based NL queries and commands
- Statistical predictions (trend + seasonal)
- Data quality issue viewer
- Local SQLite persistence
- Automated tests
- Documentation

### Phase 2 (Future)
- Bank/credit card auto-import
- Budget creation and tracking workflow
- Receipt photo capture and OCR
- Multi-user/family member profiles
- Advanced AI categorization of uncategorized items
- Custom report builder
- Data export to PDF
- Scheduled backups
- Mobile companion app

---

## 18. Acceptance Criteria by Feature

### Import
- [ ] Can import the provided .xlsx successfully
- [ ] All 17,881 Master_Transactions rows are in the database
- [ ] Merchant_Map, Category_Map, Data_Quality_Log imported
- [ ] Import summary shows correct counts
- [ ] Re-import preserves manual entries

### Expense CRUD
- [ ] Can add expense with all fields
- [ ] Can edit any field of an existing expense
- [ ] Can soft-delete an expense
- [ ] Category auto-suggest works from Merchant_Map
- [ ] Duplicate warning shows for matching date+amount+merchant

### Analytics
- [ ] Monthly trend chart renders with real data
- [ ] Yearly trend chart renders with real data
- [ ] Category donut chart shows correct proportions
- [ ] Date range filter updates all charts
- [ ] Category drill-down shows subcategories and transactions
- [ ] Top merchants list matches spreadsheet data

### Natural Language
- [ ] "How much did I spend on groceries in 2023?" returns correct answer
- [ ] "Add $50 groceries at Wegmans" creates correct expense after confirmation
- [ ] "Compare 2023 vs 2024 spending" shows comparison
- [ ] "What was my top category last year?" returns correct answer
- [ ] Unclear input shows helpful fallback message

### Predictions
- [ ] Annual projection for 2026 displayed with methodology
- [ ] Monthly forecast for remaining months shown
- [ ] At least 3 AI-generated insight cards displayed
- [ ] All predictions labeled as estimates

### Data Quality
- [ ] Data quality issues from import are visible
- [ ] Can re-categorize an uncategorized transaction
- [ ] Resolution status updates persist
