# Data Model

This document describes the FinApp data model: database schema, indexes, default data, TypeScript interfaces, and the end-to-end data flow from spreadsheet import through to the UI.

---

## 1. Database Tables

All tables are defined in `src-tauri/migrations/001_initial.sql` and managed by SQLite.

### 1.1 transactions

The central table. Each row represents a single financial transaction.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | No (PK) | -- | UUID primary key |
| `transaction_date` | TEXT | No | -- | ISO date string (YYYY-MM-DD) |
| `year` | INTEGER | No | -- | Calendar year extracted from transaction_date |
| `quarter` | TEXT | Yes | NULL | Quarter label (e.g., "Q1") |
| `month` | INTEGER | No | -- | Month number (1--12) |
| `month_name` | TEXT | Yes | NULL | Human-readable month name (e.g., "January") |
| `year_month` | TEXT | No | -- | Formatted as "YYYY-MM" for grouping and sorting |
| `day_of_week` | TEXT | Yes | NULL | Day name (e.g., "Monday") |
| `category` | TEXT | No | 'Uncategorized' | Spending category assigned to the transaction |
| `subcategory` | TEXT | Yes | NULL | Optional finer-grained category |
| `raw_description` | TEXT | Yes | NULL | Original description from the bank/credit card statement |
| `std_merchant` | TEXT | Yes | NULL | Standardized merchant name after normalization |
| `amount` | REAL | No | -- | Absolute transaction amount (always positive) |
| `inflow_outflow` | TEXT | No | 'Outflow' | Direction of money: "Inflow" or "Outflow" |
| `signed_amount` | REAL | No | -- | Positive for inflows, negative for outflows |
| `debit_r` | REAL | Yes | NULL | Amount attributed to member R |
| `debit_s` | REAL | Yes | NULL | Amount attributed to member S |
| `location` | TEXT | Yes | NULL | Geographic location of the transaction |
| `travel_flag` | INTEGER | Yes | 0 | Boolean flag (0/1) indicating a travel-related expense |
| `payment_method` | TEXT | Yes | NULL | Payment instrument (e.g., "Credit Card", "Debit") |
| `tags` | TEXT | Yes | NULL | Comma-separated user-defined tags |
| `notes` | TEXT | Yes | NULL | Free-form user notes |
| `source` | TEXT | No | 'manual' | Origin of the record: "manual", "import", etc. |
| `source_sheet` | TEXT | Yes | NULL | Name of the XLSX sheet this row was imported from |
| `import_batch_id` | TEXT | Yes | NULL | Foreign key to `import_batches.id` |
| `data_quality_status` | TEXT | Yes | 'clean' | Quality flag: "clean", "warning", "error" |
| `data_quality_issue` | TEXT | Yes | NULL | Description of any data quality problem |
| `is_deleted` | INTEGER | Yes | 0 | Soft-delete flag (0 = active, 1 = deleted) |
| `created_at` | TEXT | No | datetime('now') | Row creation timestamp |
| `updated_at` | TEXT | No | datetime('now') | Last modification timestamp |

### 1.2 import_batches

Tracks each file import operation for auditing and rollback.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | No (PK) | -- | UUID primary key |
| `filename` | TEXT | No | -- | Name of the imported file |
| `imported_at` | TEXT | No | datetime('now') | Timestamp of the import |
| `total_rows` | INTEGER | Yes | NULL | Total rows found in the source file |
| `imported_rows` | INTEGER | Yes | NULL | Rows successfully imported |
| `error_rows` | INTEGER | Yes | NULL | Rows that failed validation |
| `warning_rows` | INTEGER | Yes | NULL | Rows imported with warnings |
| `status` | TEXT | No | 'pending' | Batch status: "pending", "completed", "failed" |

### 1.3 merchant_map

Lookup table that maps raw bank descriptions to standardized merchant names and categories. Used during import normalization and for ongoing re-categorization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No (PK) | AUTOINCREMENT | Auto-incrementing primary key |
| `raw_description` | TEXT | No | -- | Original description string from the statement |
| `standardized_merchant` | TEXT | Yes | NULL | Clean merchant name |
| `category` | TEXT | Yes | NULL | Mapped spending category |
| `subcategory` | TEXT | Yes | NULL | Mapped subcategory |
| `txn_count` | INTEGER | Yes | 0 | Number of transactions matching this description |
| `source` | TEXT | Yes | 'imported' | How the mapping was created: "imported", "user", "ai" |

### 1.4 categories

Aggregated category metadata. Maintains running counts and totals for each category/subcategory pair.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No (PK) | AUTOINCREMENT | Auto-incrementing primary key |
| `category` | TEXT | No | -- | Category name |
| `subcategory` | TEXT | Yes | NULL | Subcategory name |
| `transaction_count` | INTEGER | Yes | 0 | Number of transactions in this category |
| `total_amount` | REAL | Yes | 0 | Sum of transaction amounts |
| `avg_amount` | REAL | Yes | 0 | Average transaction amount |
| `is_active` | INTEGER | Yes | 1 | Whether the category is active (0/1) |

### 1.5 budgets

Annual budget targets per category, compared against actual spending.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No (PK) | AUTOINCREMENT | Auto-incrementing primary key |
| `category` | TEXT | No | -- | Budget category (matches `transactions.category`) |
| `year` | INTEGER | No | -- | Budget year |
| `monthly_budget` | REAL | Yes | NULL | Target monthly spend |
| `annual_actual` | REAL | Yes | NULL | Actual annual spend (computed) |
| `monthly_avg_actual` | REAL | Yes | NULL | Actual monthly average (computed) |
| `variance` | REAL | Yes | NULL | Budget minus actual (positive = under budget) |
| `variance_pct` | REAL | Yes | NULL | Variance as a percentage of the budget |

**Unique constraint:** `(category, year)` -- one budget row per category per year.

### 1.6 scenario_assumptions

Key-value store for financial scenario modeling parameters (e.g., inflation rate, savings rate).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No (PK) | AUTOINCREMENT | Auto-incrementing primary key |
| `key` | TEXT | No | -- | Assumption name (unique) |
| `value` | REAL | No | -- | Numeric value for the assumption |
| `description` | TEXT | Yes | NULL | Human-readable explanation of the assumption |
| `updated_at` | TEXT | No | datetime('now') | Last modification timestamp |

**Unique constraint:** `key` must be unique.

### 1.7 settings

Application-wide key-value configuration store.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `key` | TEXT | No (PK) | -- | Setting name (primary key) |
| `value` | TEXT | No | -- | Setting value (stored as text) |
| `updated_at` | TEXT | No | datetime('now') | Last modification timestamp |

---

## 2. Indexes

All indexes are defined on the `transactions` and `merchant_map` tables to accelerate the most common query patterns.

| Index Name | Table | Column(s) | Purpose |
|------------|-------|-----------|---------|
| `idx_txn_date` | transactions | `transaction_date` | Date range filtering and sorting by date |
| `idx_txn_year_month` | transactions | `year_month` | Monthly aggregation queries (dashboard, charts) |
| `idx_txn_category` | transactions | `category` | Category-based filtering and grouping |
| `idx_txn_source` | transactions | `source` | Filtering by import source vs. manual entry |
| `idx_txn_merchant` | transactions | `std_merchant` | Merchant-level spending lookups |
| `idx_txn_amount` | transactions | `amount` | Amount range queries and sorting |
| `idx_txn_deleted` | transactions | `is_deleted` | Efficiently excluding soft-deleted rows |
| `idx_merchant_raw` | merchant_map | `raw_description` | Fast lookup during import normalization |

---

## 3. Default Settings

The migration seeds two default settings via `INSERT OR IGNORE`:

| Key | Default Value | Description |
|-----|---------------|-------------|
| `ai_provider` | `local` | AI backend used for chat and insights (e.g., "local", "openai") |
| `theme` | `light` | UI theme ("light" or "dark") |

---

## 4. TypeScript Interfaces

Defined in `src/types/index.ts`. These interfaces mirror the database schema and Rust models (`src-tauri/src/db/models.rs`) and are used throughout the frontend.

### 4.1 Core Data Interfaces

**`Transaction`** -- Full transaction record as returned from the database. Maps 1:1 to the `transactions` table. All nullable columns use `string | null` or `number | null`.

**`NewTransaction`** -- Subset of fields required to create a transaction. Only `transaction_date`, `category`, and `amount` are mandatory; all other fields are optional.

**`UpdateTransaction`** -- Partial update payload. Every field is optional; only provided fields are written.

**`ImportBatch`** -- Maps to the `import_batches` table.

**`Category`** -- Maps to the `categories` table. Note that `is_active` is typed as `boolean` in TypeScript but stored as INTEGER (0/1) in SQLite.

### 4.2 Filter and Pagination

**`TransactionFilters`** -- Query parameters for filtering, searching, sorting, and paginating the transaction list. Includes `date_from`, `date_to`, `category`, `subcategory`, `merchant`, `search` (free-text), `min_amount`, `max_amount`, `source`, `sort_by`, `sort_dir`, `page`, and `page_size`.

**`PaginatedResult<T>`** -- Generic wrapper for paginated API responses. Contains `data` (array of results), `total`, `page`, `page_size`, and `total_pages`.

### 4.3 Analytics and Aggregation

| Interface | Fields | Use |
|-----------|--------|-----|
| `MonthlySpending` | `year_month`, `total`, `category_totals?` | Monthly spending totals with optional per-category breakdown |
| `YearlySpending` | `year`, `total`, `category_totals?` | Annual spending totals with optional per-category breakdown |
| `CategoryBreakdown` | `category`, `total`, `count`, `percentage` | Category share of total spending |
| `SubcategoryBreakdown` | `subcategory`, `total`, `count` | Drill-down within a category |
| `MerchantSpending` | `merchant`, `total`, `count` | Spending by merchant |
| `MemberSpending` | `year_month`, `debit_r_total`, `debit_s_total` | Monthly spending split between members R and S |
| `KeyMetrics` | (see below) | Dashboard summary metrics |

**`KeyMetrics` fields:** `total_transactions`, `total_spending`, `avg_monthly_spending`, `ytd_spending`, `current_month_spending`, `years_of_data`, `top_category`, `top_category_amount`, `data_quality_issues`.

### 4.4 Import

**`ImportSummary`** -- Returned after an import operation. Reports `batch_id`, `total_rows`, `imported_rows`, `updated_rows`, `error_rows`, `warning_rows`, `merchants_imported`, `categories_imported`, and `quality_issues_imported`.

**`DataQualityIssue`** -- Represents a transaction with data quality problems, surfaced for user review.

### 4.5 AI and Insights

| Interface | Description |
|-----------|-------------|
| `ChatMessage` | A single message in the AI chat. Has `role` ("user" or "assistant"), `content`, optional `data` payload, optional `chart` type, and `timestamp`. |
| `ParsedIntent` | The structured result of parsing a user's natural-language query. Includes `type` (query, add, edit, compare, summarize, top, unknown) and extracted entities. |
| `Insight` | An AI-generated insight with `title`, `description`, `type` (trend, anomaly, prediction, comparison), and `severity` (info, warning, positive, negative). |
| `AnnualProjection` | Projected annual spending: `year`, `projected` amount, and `confidence` level. |
| `MonthlyProjection` | Projected monthly spending with optional `actual` for comparison. |

---

## 5. Data Flow

The end-to-end pipeline from raw spreadsheet to rendered UI:

```
XLSX File
  |
  v
[Parser]
  Reads the .xlsx file and extracts rows from one or more sheets.
  Produces raw row objects with original column values.
  |
  v
[Normalizer]
  - Derives computed date fields (year, quarter, month, month_name,
    year_month, day_of_week) from the transaction date.
  - Looks up raw_description in the merchant_map to resolve
    std_merchant, category, and subcategory.
  - Computes signed_amount from amount and inflow_outflow.
  - Assigns data_quality_status / data_quality_issue for rows
    that fail validation (missing dates, zero amounts, etc.).
  - Generates a UUID for each transaction.
  |
  v
[SQLite Database]
  - An import_batches row is created to track the operation.
  - Normalized transactions are inserted into the transactions table.
  - New merchant mappings are added to merchant_map.
  - Category aggregates in the categories table are updated.
  - The import_batches row is updated with final counts and status.
  |
  v
[Tauri API Layer]  (Rust commands in src-tauri/)
  - Exposes Tauri invoke commands for CRUD operations, filtering,
    aggregation queries, import, and settings management.
  - Returns typed Rust structs (models.rs) serialized as JSON.
  |
  v
[Frontend Stores]  (Svelte stores / state management)
  - Call Tauri commands via @tauri-apps/api.
  - Deserialize JSON responses into TypeScript interfaces.
  - Maintain reactive state for transactions, filters, metrics,
    categories, and settings.
  |
  v
[UI Components]
  - Bind to store values for rendering.
  - Dashboard: KeyMetrics, MonthlySpending charts, CategoryBreakdown.
  - Transaction list: PaginatedResult<Transaction> with filters.
  - Import view: ImportSummary, DataQualityIssue review.
  - AI chat: ChatMessage, Insight, projections.
```

### Key characteristics of the flow

- **Idempotent imports:** Each import is tracked by a batch ID. Duplicate detection prevents the same file from being imported twice.
- **Soft deletes:** Transactions are never physically removed. The `is_deleted` flag and the `idx_txn_deleted` index ensure deleted rows are excluded from queries without data loss.
- **Computed fields at import time:** Date decomposition fields (`year`, `month`, `quarter`, etc.) are computed once during normalization and stored, avoiding repeated parsing at query time.
- **Merchant mapping as a cache:** The `merchant_map` table acts as a growing lookup cache. Each new unique description encountered during import is stored, so subsequent imports and re-categorization are faster.
- **Type alignment across layers:** The SQLite schema, Rust `models.rs` structs, and TypeScript interfaces in `src/types/index.ts` are kept in sync manually. Changes to any layer must be reflected in the other two.
