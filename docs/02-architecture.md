# Architecture and Design Document: Family Expense App

**Version:** 1.0
**Date:** March 27, 2026

---

## 1. Architectural Goals

1. **Local-first**: All data and computation on the user's machine
2. **Privacy by default**: No network calls unless explicitly enabled
3. **Performance**: Sub-second queries on 20K+ transactions
4. **Maintainability**: Clear module boundaries, strong typing, testable design
5. **Extensibility**: Easy to add charts, import formats, AI providers, analytics

---

## 2. System Context

```
+------------------+     +-------------------+
|  .xlsx file      | --> |  Import Pipeline  |
+------------------+     +-------------------+
                               |
                               v
+------------------+     +-------------------+     +------------------+
|  User (macOS)    | <-> |  Tauri App        | <-> |  SQLite DB       |
+------------------+     |  - React Frontend |     +------------------+
                         |  - Rust Backend   |
                         +-------------------+
                               |
                               v (optional)
                         +-------------------+
                         |  External LLM API |
                         +-------------------+
```

---

## 3. Chosen Stack and Rationale

### Desktop Shell: Tauri v2
- **Why**: 10x smaller binary than Electron (~15MB vs ~150MB), native macOS integration, Rust backend for performance, SQLite support via rusqlite
- **Trade-off**: Smaller ecosystem than Electron, but sufficient for this use case

### Frontend: React + TypeScript + Material UI
- **Why**: Mature ecosystem, strong component library, TypeScript for safety, large community
- **Charting**: Recharts - lightweight, React-native, sufficient for financial charts
- **State Management**: Zustand - minimal boilerplate, TypeScript-first

### Backend (Tauri Rust side):
- **Database**: SQLite via rusqlite with migrations
- **XLSX Parsing**: calamine crate (Rust-native xlsx reader, very fast)
- **API**: Tauri IPC commands (type-safe frontend-backend bridge)

### AI Layer:
- **Local**: Rule-based NLP parser + statistical forecasting (all in TypeScript)
- **External (optional)**: Anthropic Claude API via HTTP

### Testing:
- **Frontend**: Vitest + React Testing Library
- **Backend**: Rust #[cfg(test)] modules
- **E2E/Smoke**: Vitest with Tauri test driver

---

## 4. Module Boundaries

```
src/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri entry point
│   │   ├── db/             # Database module
│   │   │   ├── mod.rs
│   │   │   ├── migrations.rs
│   │   │   ├── models.rs
│   │   │   └── queries.rs
│   │   ├── import/         # Import pipeline
│   │   │   ├── mod.rs
│   │   │   ├── parser.rs
│   │   │   ├── validator.rs
│   │   │   └── normalizer.rs
│   │   ├── commands/       # Tauri IPC commands
│   │   │   ├── mod.rs
│   │   │   ├── expenses.rs
│   │   │   ├── analytics.rs
│   │   │   ├── import.rs
│   │   │   └── settings.rs
│   │   └── services/       # Business logic
│   │       ├── mod.rs
│   │       ├── expense_service.rs
│   │       ├── analytics_service.rs
│   │       └── prediction_service.rs
│   ├── migrations/         # SQL migration files
│   └── Cargo.toml
│
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   │   ├── charts/
│   │   ├── forms/
│   │   ├── layout/
│   │   └── common/
│   ├── pages/              # Page-level components
│   │   ├── Overview.tsx
│   │   ├── Trends.tsx
│   │   ├── Categories.tsx
│   │   ├── Transactions.tsx
│   │   ├── Import.tsx
│   │   ├── Assistant.tsx
│   │   └── Settings.tsx
│   ├── services/           # Frontend service layer
│   │   ├── api.ts          # Tauri IPC bridge
│   │   ├── nlp.ts          # NL parsing
│   │   ├── ai.ts           # AI abstraction
│   │   └── prediction.ts   # Statistical forecasting
│   ├── stores/             # Zustand stores
│   │   ├── expenseStore.ts
│   │   ├── analyticsStore.ts
│   │   └── settingsStore.ts
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── theme/              # MUI theme configuration
│   ├── App.tsx
│   └── main.tsx
│
├── tests/                  # Test files
│   ├── unit/
│   ├── integration/
│   └── smoke/
│
└── docs/                   # Documentation
```

---

## 5. Local Persistence Strategy

### SQLite Database
- Single `finapp.db` file in Tauri app data directory
- WAL mode for concurrent read/write performance
- Foreign keys enabled
- Migrations tracked in `_migrations` table

### Migration Strategy
- Numbered SQL migration files: `001_initial.sql`, `002_add_tags.sql`, etc.
- Forward-only migrations (no rollback in MVP)
- Migration runner executes on app startup
- Each migration runs in a transaction

---

## 6. Data Model

### Core Tables

```sql
-- Transactions: unified table for imported and manual expenses
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,              -- UUID for manual, Txn_ID for imported
    transaction_date TEXT NOT NULL,   -- ISO 8601 date
    year INTEGER NOT NULL,
    quarter TEXT,
    month INTEGER NOT NULL,
    month_name TEXT,
    year_month TEXT NOT NULL,
    day_of_week TEXT,
    category TEXT NOT NULL DEFAULT 'Uncategorized',
    subcategory TEXT,
    raw_description TEXT,
    std_merchant TEXT,
    amount REAL NOT NULL,
    inflow_outflow TEXT NOT NULL DEFAULT 'Outflow',
    signed_amount REAL NOT NULL,
    debit_r REAL,                     -- Family member R attribution
    debit_s REAL,                     -- Family member S attribution
    location TEXT,
    travel_flag INTEGER DEFAULT 0,
    payment_method TEXT,
    tags TEXT,                        -- JSON array
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',  -- 'imported' or 'manual'
    source_sheet TEXT,                -- Provenance from original workbook
    import_batch_id TEXT,             -- Links to import_batches
    data_quality_status TEXT DEFAULT 'clean', -- 'clean', 'flagged', 'resolved'
    data_quality_issue TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Import batches
CREATE TABLE import_batches (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    total_rows INTEGER,
    imported_rows INTEGER,
    error_rows INTEGER,
    warning_rows INTEGER,
    status TEXT NOT NULL              -- 'completed', 'partial', 'failed'
);

-- Merchant mappings (from Merchant_Map sheet)
CREATE TABLE merchant_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_description TEXT NOT NULL,
    standardized_merchant TEXT,
    category TEXT,
    subcategory TEXT,
    txn_count INTEGER DEFAULT 0,
    source TEXT DEFAULT 'imported'    -- 'imported' or 'manual'
);

-- Category taxonomy (from Category_Map sheet)
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    subcategory TEXT,
    transaction_count INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0,
    avg_amount REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

-- Budget baselines
CREATE TABLE budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    year INTEGER NOT NULL,
    monthly_budget REAL,
    annual_actual REAL,
    monthly_avg_actual REAL,
    variance REAL,
    variance_pct REAL,
    UNIQUE(category, year)
);

-- Scenario model assumptions
CREATE TABLE scenario_assumptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value REAL NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL
);

-- App settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_txn_date ON transactions(transaction_date);
CREATE INDEX idx_txn_year_month ON transactions(year_month);
CREATE INDEX idx_txn_category ON transactions(category);
CREATE INDEX idx_txn_source ON transactions(source);
CREATE INDEX idx_txn_merchant ON transactions(std_merchant);
CREATE INDEX idx_txn_amount ON transactions(amount);
CREATE INDEX idx_merchant_raw ON merchant_map(raw_description);
```

---

## 7. Import Pipeline Design

```
.xlsx file
    │
    v
[Sheet Detection] ──> Identify available sheets
    │
    v
[Master_Transactions Parser]
    │  - Read all 17,882 rows
    │  - Type coercion (dates, numbers)
    │  - Null handling
    │
    v
[Validator]
    │  - Required fields check (Txn_ID, date, amount)
    │  - Date format validation
    │  - Amount range check
    │  - Category existence check
    │
    v
[Normalizer]
    │  - Standardize date format
    │  - Derive year/month/quarter if missing
    │  - Trim strings
    │  - Compute signed_amount if missing
    │  - Set data_quality_status
    │
    v
[Batch Writer]
    │  - Upsert by Txn_ID
    │  - Track import batch
    │  - Generate import summary
    │
    v
[Supplementary Sheet Importers]
    ├── Merchant_Map → merchant_map table
    ├── Category_Map → categories table
    ├── Data_Quality_Log → update transactions.data_quality_*
    ├── Budget_vs_Actual → budgets table
    └── Scenario_Model → scenario_assumptions table
```

### Re-Import Safety
- Imported records identified by `source = 'imported'`
- Manual records (`source = 'manual'`) never touched during re-import
- Upsert by `id` (which equals original Txn_ID for imported records)
- Deleted imported records are flagged, not physically removed

---

## 8. Normalization Design

| Field | Normalization Rule |
|---|---|
| Transaction_Date | Parse as ISO 8601; fallback to YYYY-MM-01 from Year_Month |
| Year, Month, Quarter | Derive from Transaction_Date if missing |
| Category | Default to "Uncategorized" if null/empty |
| Amount | Ensure positive; store direction in inflow_outflow |
| Signed_Amount | Compute as -Amount for Outflow, +Amount for Inflow |
| Raw_Description | Trim whitespace, preserve as-is |
| Std_Merchant | Trim whitespace, preserve as-is |
| Travel_Flag | Normalize to 0/1 integer |
| Debit_R/S | Default to null if not present |

---

## 9. AI Abstraction Layer

```typescript
// AI Provider Interface
interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;

  // NL Understanding
  parseIntent(input: string): Promise<ParsedIntent>;

  // Summarization
  summarizePeriod(data: PeriodData): Promise<string>;

  // Categorization
  suggestCategory(description: string): Promise<CategorySuggestion>;

  // Insight Generation
  generateInsights(data: AnalyticsData): Promise<Insight[]>;
}

// Local Provider (rule-based, always available)
class LocalAIProvider implements AIProvider { ... }

// External Provider (Claude API, optional)
class ClaudeAIProvider implements AIProvider { ... }

// Provider Manager
class AIProviderManager {
  private local: LocalAIProvider;
  private external?: ClaudeAIProvider;

  getProvider(): AIProvider {
    if (this.external?.isAvailable()) return this.external;
    return this.local;
  }
}
```

---

## 10. Natural Language Action Pipeline

```
User Input
    │
    v
[Intent Classifier]
    │  - Regex patterns for common queries
    │  - Keyword matching
    │  - Optional: LLM classification
    │
    ├── QUERY intent ──────────> [Query Builder] ──> DB Query ──> Format Result
    │
    ├── ADD intent ────────────> [Entity Extractor] ──> Build Expense ──> Confirm ──> Save
    │
    ├── EDIT intent ───────────> [Entity Extractor] ──> Find Target ──> Show Changes ──> Confirm ──> Update
    │
    ├── COMPARE intent ────────> [Period Parser] ──> Dual Query ──> Format Comparison
    │
    ├── SUMMARIZE intent ──────> [Period Parser] ──> Aggregate ──> Generate Summary
    │
    └── UNKNOWN intent ────────> [Fallback] ──> Suggest examples
```

### Intent Patterns (Rule-Based)

```typescript
const patterns = {
  QUERY: [
    /how much.*spend.*on\s+(.+?)\s+in\s+(\d{4})/i,
    /what.*spend.*on\s+(.+)/i,
    /total\s+(.+?)\s+spending/i,
    /show.*(.+?)\s+expenses/i,
  ],
  ADD: [
    /add\s+\$?([\d.]+)\s+(?:for\s+)?(.+?)(?:\s+at\s+(.+?))?(?:\s+(?:on\s+)?(.+))?$/i,
    /spent\s+\$?([\d.]+)\s+(?:on\s+)?(.+)/i,
  ],
  COMPARE: [
    /compare\s+(\d{4})\s+(?:vs|versus|to|and)\s+(\d{4})/i,
    /(.+?)\s+vs\s+(.+)/i,
  ],
  SUMMARIZE: [
    /summarize\s+(.+)/i,
    /summary\s+(?:for|of)\s+(.+)/i,
  ],
  TOP: [
    /top\s+(?:spending\s+)?categor/i,
    /biggest\s+expense/i,
    /where.*most.*money/i,
  ],
};
```

---

## 11. Analytics Engine Design

### Query-Based Architecture
- All analytics computed from SQL queries against the transactions table
- No pre-computed summary tables (derive everything from source data)
- Common aggregation patterns abstracted into query builders

### Key Analytics Queries

```typescript
interface AnalyticsService {
  // Time series
  getMonthlySpending(filters: DateRange & CategoryFilter): MonthlyData[];
  getYearlySpending(filters: DateRange & CategoryFilter): YearlyData[];

  // Breakdowns
  getCategoryBreakdown(filters: DateRange): CategoryData[];
  getSubcategoryBreakdown(category: string, filters: DateRange): SubcategoryData[];
  getTopMerchants(filters: DateRange, limit: number): MerchantData[];

  // Comparisons
  compareMonths(month1: string, month2: string): ComparisonData;
  compareYears(year1: number, year2: number): ComparisonData;

  // Metrics
  getKeyMetrics(filters: DateRange): KeyMetrics;

  // Anomalies
  detectAnomalies(filters: DateRange): Anomaly[];
}
```

### Anomaly Detection
- Z-score based: flag months where spending > 2 standard deviations from category mean
- Simple and deterministic; no ML required

---

## 12. Forecast/Prediction Design

### Method: Weighted Moving Average + Seasonal Decomposition

```
1. Calculate average annual spending (last 5 years, weighted toward recent)
2. Calculate monthly seasonal factors (avg % of annual for each month)
3. Apply growth rate (configurable, default 3% from Scenario_Model)
4. Project: monthly_forecast = annual_projection * seasonal_factor[month]
```

### Category-Level Projections
- Same method applied per category
- Only for categories with 3+ years of data
- Flagged as low-confidence if high variance

### Implementation
```typescript
interface PredictionService {
  projectAnnualSpending(baseYear: number, years: number): AnnualProjection[];
  projectMonthlySpending(year: number): MonthlyProjection[];
  projectCategorySpending(category: string, years: number): CategoryProjection[];
  getSeasonalFactors(): SeasonalFactors;
  getGrowthRate(): number;
}
```

---

## 13. Test Strategy

| Level | Tool | Scope | Count Target |
|---|---|---|---|
| Unit (Rust) | cargo test | DB queries, import parsing, validation | 20+ |
| Unit (TS) | Vitest | NLP parser, prediction math, utils | 20+ |
| Component | Vitest + RTL | React components render correctly | 10+ |
| Integration | Vitest | Service → API → Store flow | 5+ |
| Smoke/E2E | Vitest | Full app workflows | 5+ |

### Critical Test Cases
- Import parses all 20 columns correctly
- Import handles null values gracefully
- Duplicate import is idempotent
- NL parser extracts correct intents
- Prediction math produces reasonable results
- Date range filters return correct subsets
- Category breakdown sums match totals

---

## 14. Deployment/Packaging Approach

### macOS Distribution
- Tauri builds native .dmg/.app bundle
- Code signing: optional for local use, required for distribution
- App data stored in `~/Library/Application Support/com.finapp.family`
- Database file: `finapp.db` in app data directory

### Build Commands
```bash
# Development
npm run tauri dev

# Production build
npm run tauri build
```

---

## 15. Security/Privacy Considerations

- SQLite database file readable only by user (Unix permissions)
- No passwords or credentials stored in database
- External AI API key stored in settings table (app-local)
- No telemetry or crash reporting
- CORS not relevant (local app, no web server)
- XSS not a risk (Tauri CSP configured, no dynamic HTML injection)

---

## 16. Extensibility Strategy

### Adding a New Chart Type
1. Create React component in `src/components/charts/`
2. Add query method in analytics service
3. Wire into relevant page
4. Add test

### Adding a New Import Format
1. Create parser in `src-tauri/src/import/`
2. Implement same `ImportResult` interface
3. Register in import pipeline

### Swapping AI Provider
1. Implement `AIProvider` interface
2. Register in `AIProviderManager`
3. Add configuration in Settings

### Adding Budgets Feature
1. Extend budgets table with monthly targets
2. Add budget CRUD commands
3. Create budget-tracking UI components
4. Add budget vs actual comparison views

---

## 17. Tradeoffs and Rejected Alternatives

| Decision | Alternative Rejected | Rationale |
|---|---|---|
| Tauri | Electron | 10x smaller, faster startup, Rust performance for import |
| SQLite | PostgreSQL, DuckDB | Simplest local persistence, zero config, ACID |
| Zustand | Redux, MobX | Minimal boilerplate, sufficient for this scale |
| Recharts | D3, Chart.js, Nivo | React-native, simple API, good for financial charts |
| Rule-based NLP | spaCy, local LLM | Zero dependencies, predictable, sufficient for defined patterns |
| Calamine | openpyxl (Python) | Rust-native, 10x faster xlsx parsing, no Python dependency |
| WAL mode | Default journal | Better concurrent read performance |

---

## 18. Component Hierarchy (Frontend)

```
App
├── Layout
│   ├── Sidebar (navigation)
│   └── Main Content Area
│       ├── Overview Page
│       │   ├── KeyMetricsCards
│       │   ├── SpendingTrendChart
│       │   ├── CategoryBreakdownChart
│       │   ├── RecentTransactions
│       │   └── InsightCards
│       ├── Trends Page
│       │   ├── DateRangeSelector
│       │   ├── MonthlyTrendChart
│       │   ├── YearlyComparisonChart
│       │   └── CategoryOverlayToggle
│       ├── Categories Page
│       │   ├── CategoryDonutChart
│       │   ├── SubcategoryBarChart
│       │   └── CategoryTransactionTable
│       ├── Transactions Page
│       │   ├── TransactionFilters
│       │   ├── TransactionTable
│       │   ├── AddExpenseDialog
│       │   └── EditExpenseDialog
│       ├── Import Page
│       │   ├── ImportUploader
│       │   ├── ImportProgress
│       │   ├── ImportSummary
│       │   └── DataQualityTable
│       ├── Assistant Page
│       │   ├── ChatInput
│       │   ├── ChatMessages
│       │   └── ResultCards
│       └── Settings Page
│           ├── AIConfiguration
│           ├── CategoryManager
│           ├── ImportHistory
│           └── DatabaseInfo
```

---

## 19. State Management Approach

```typescript
// Expense Store
interface ExpenseStore {
  transactions: Transaction[];
  filters: TransactionFilters;
  pagination: PaginationState;
  loading: boolean;
  error: string | null;

  fetchTransactions: (filters: TransactionFilters) => Promise<void>;
  addExpense: (expense: NewExpense) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

// Analytics Store
interface AnalyticsStore {
  monthlyData: MonthlySpending[];
  yearlyData: YearlySpending[];
  categoryData: CategoryBreakdown[];
  keyMetrics: KeyMetrics | null;
  dateRange: DateRange;

  fetchMonthlySpending: (range: DateRange) => Promise<void>;
  fetchYearlySpending: (range: DateRange) => Promise<void>;
  fetchCategoryBreakdown: (range: DateRange) => Promise<void>;
  fetchKeyMetrics: () => Promise<void>;
}

// Settings Store
interface SettingsStore {
  aiProvider: 'local' | 'external';
  aiApiKey: string | null;
  categories: Category[];
  importHistory: ImportBatch[];

  updateAIProvider: (provider: 'local' | 'external') => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
}
```

---

## 20. Error Handling Strategy

| Layer | Strategy |
|---|---|
| Rust backend | Result<T, Error> types; errors mapped to Tauri IPC error responses |
| Tauri commands | All commands return Result; frontend receives structured errors |
| Frontend services | try/catch with typed error handling; errors stored in Zustand |
| UI | Error boundaries for component crashes; toast notifications for operation failures |
| Import | Row-level error tracking; partial import allowed with error summary |

---

## 21. Logging Strategy

| Layer | Approach |
|---|---|
| Rust backend | tracing crate with structured logging to file |
| Frontend | console.log in development; silent in production |
| Import | Detailed per-row logging to import batch record |
| AI | Request/response logging (without raw data for external) |

---

## 22. Documentation Structure

```
docs/
├── 00-spreadsheet-findings.md
├── 01-PRD.md
├── 02-architecture.md
├── 03-data-model.md
├── 04-import-pipeline.md
├── 05-testing-guide.md
├── 06-ai-integration.md
├── 07-codebase-guide.md
├── 08-maintenance-guide.md
├── 09-known-limitations.md
└── README.md (at repo root)
```
