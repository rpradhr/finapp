# Codebase Guide

This document provides a map of the Family Expense App codebase, explains its architecture, and includes step-by-step instructions for common development tasks.

## Directory Structure

```
FinApp/
  docs/                           Project documentation
  migrations/
    001_initial.sql               Database schema (applied automatically)
  src/                            Frontend (React + TypeScript)
    components/
      layout/
        Layout.tsx                App shell: sidebar navigation, top bar, content area
    pages/
      Overview.tsx                Dashboard with key metrics and charts
      Trends.tsx                  Monthly/yearly spending trend charts
      Categories.tsx              Category and subcategory breakdown
      Transactions.tsx            Filterable, paginated transaction table
      Import.tsx                  Spreadsheet upload and import history
      Assistant.tsx               AI chat interface with inline charts
      Settings.tsx                App settings and data quality management
    services/
      api.ts                      Typed wrappers around Tauri invoke() calls
      ai.ts                       AI provider manager, intent routing, insight generation
      nlp.ts                      Rule-based natural language intent parser
      prediction.ts               Spending forecasting and anomaly detection
    stores/
      analyticsStore.ts           Zustand store for analytics data (metrics, breakdowns)
      expenseStore.ts             Zustand store for transaction CRUD and filtering
      settingsStore.ts            Zustand store for app settings
    types/
      index.ts                    All TypeScript interfaces and types
    theme/
      index.ts                    MUI theme customization and chart color palette
    App.tsx                       React Router route definitions
    main.tsx                      App entry point (React root, BrowserRouter)
  src-tauri/                      Backend (Rust + Tauri v2)
    migrations/
      001_initial.sql             (referenced via include_str! from db/mod.rs)
    src/
      commands/
        mod.rs                    Re-exports all command modules
        expenses.rs               CRUD commands for transactions
        analytics.rs              Aggregation queries (monthly, yearly, category, merchant, member)
        import.rs                 Spreadsheet import command and import history
        settings.rs               Settings, categories, and data quality commands
      db/
        mod.rs                    Database struct, connection setup, migration runner
        models.rs                 Rust structs for DB rows (serde-serializable)
        queries.rs                SQL query implementations on Database
      import/
        mod.rs                    Import orchestrator: parse -> normalize -> insert
        parser.rs                 XLSX file parser (reads sheets into row vectors)
        normalizer.rs             Row normalization (date parsing, category mapping, dedup)
      lib.rs                      Tauri app builder, plugin registration, command handler
      main.rs                     Binary entry point (calls lib::run)
    Cargo.toml                    Rust dependencies
    tauri.conf.json               Tauri app configuration (window, bundle, permissions)
  tests/
    setup.ts                      Vitest test setup
    unit/
      nlp.test.ts                 Tests for NLP intent parsing
      prediction.test.ts          Tests for prediction functions
  package.json                    npm scripts and frontend dependencies
  vite.config.ts                  Vite bundler configuration
  vitest.config.ts                Test runner configuration
  tsconfig.json                   TypeScript compiler options
```

## Frontend Architecture

### Technology Stack

- **React 19** with TypeScript for the UI layer.
- **Material UI (MUI) v7** for components and theming.
- **Zustand** for state management (lightweight, hook-based stores).
- **React Router v7** for client-side routing.
- **Recharts** for data visualization (bar, line, pie, area charts).
- **Vite** as the dev server and bundler.
- **Vitest** with Testing Library for unit tests.

### Layered Architecture

The frontend follows a three-layer pattern:

```
Pages (UI)  -->  Stores (state)  -->  Services (data access)
                                          |
                                     Tauri invoke()
                                          |
                                     Rust backend
```

**Pages** are route-level components that compose MUI elements and Recharts charts. They read from Zustand stores and call store actions to trigger data fetches. Pages do not call `api.ts` directly (with the exception of `Assistant.tsx`, which uses `ai.ts`).

**Stores** (`src/stores/`) hold application state and expose async actions that call the service layer. Each store is created with `zustand/create` and consumed via hooks (`useAnalyticsStore`, `useExpenseStore`, `useSettingsStore`). Stores handle loading and error states internally.

**Services** (`src/services/`) are the boundary between frontend and backend. `api.ts` wraps every Tauri command in a typed async function. `ai.ts` and `nlp.ts` handle AI features entirely on the frontend. `prediction.ts` runs forecasting math on the frontend.

### Routing

All routes are defined in `App.tsx` and wrapped by the `Layout` component which provides a persistent sidebar and app bar:

| Route | Page | Description |
|-------|------|-------------|
| `/overview` | Overview | Dashboard with key metrics |
| `/trends` | Trends | Monthly and yearly spending charts |
| `/categories` | Categories | Category/subcategory breakdown |
| `/transactions` | Transactions | Paginated transaction list with filters |
| `/import` | Import | Upload spreadsheets, view import history |
| `/assistant` | Assistant | AI chat interface |
| `/settings` | Settings | Configuration and data quality |

The root path `/` redirects to `/overview`.

## Backend Architecture

### Technology Stack

- **Tauri v2** as the desktop application framework.
- **Rust** for all backend logic.
- **rusqlite** for SQLite database access (WAL mode, foreign keys enabled).
- **calamine** (via the xlsx crate) for XLSX file parsing.
- **uuid** for generating unique IDs.
- **serde** for serialization between Rust and the frontend.

### Application State

The Tauri app manages a single `AppState` struct containing a `Mutex<Database>`. This is initialized during `setup()` and injected into every command via Tauri's `State` extractor.

```rust
pub struct AppState {
    pub db: Mutex<Database>,
}
```

The database file is stored at the platform-specific app data directory as `finapp.db`.

### Database Layer

`Database` wraps a `rusqlite::Connection` and runs migrations on startup. Migrations are embedded in the binary via `include_str!` and tracked in a `_migrations` table. The connection uses WAL journal mode for concurrent read performance.

The database layer is split into:
- `models.rs` -- Rust structs matching database rows, all deriving `Serialize` for JSON transport.
- `queries.rs` -- Method implementations on `Database` for all SQL operations.

### Command Layer

Each Tauri command is a Rust function annotated with `#[tauri::command]`. Commands follow a consistent pattern:

1. Accept `State<AppState>` and typed parameters.
2. Lock the database mutex.
3. Call a query method on `Database`.
4. Map errors to `String` for transport to the frontend.

Commands are organized into four modules:

| Module | Commands |
|--------|----------|
| `expenses` | `get_transactions`, `add_transaction`, `update_transaction`, `delete_transaction` |
| `analytics` | `get_monthly_spending`, `get_yearly_spending`, `get_category_breakdown`, `get_subcategory_breakdown`, `get_top_merchants`, `get_key_metrics`, `get_spending_by_member` |
| `import` | `import_spreadsheet`, `get_import_history` |
| `settings` | `get_settings`, `update_setting`, `get_categories`, `get_data_quality_issues`, `resolve_data_quality_issue` |

### Import Pipeline

The spreadsheet import flow has three stages:

1. **Parse** (`parser.rs`) -- reads an XLSX file and extracts rows from each sheet.
2. **Normalize** (`normalizer.rs`) -- parses dates, maps categories, standardizes merchants, and flags data quality issues.
3. **Insert** (`mod.rs`) -- creates an import batch record, inserts transactions, and returns an `ImportSummary` with counts of imported, updated, error, and warning rows.

## Key Design Decisions and Tradeoffs

### Local-first AI over cloud LLM

The NLP and insight generation run entirely on the client using regex patterns and statistical rules. This means zero latency, no API keys, no costs, and full offline support. The tradeoff is that the parser handles only a fixed set of sentence structures. The `AIProvider` interface exists so a Claude API provider can be added later for more flexible understanding.

### SQLite over a remote database

All data lives in a local SQLite file. This gives the app instant startup, no network dependency, and trivial backup (copy one file). The tradeoff is that data is not shared across devices. WAL mode is enabled for better read concurrency during analytics queries.

### Zustand over Redux or React Context

Zustand was chosen for its minimal boilerplate and hook-based API. Each domain (expenses, analytics, settings) gets its own store, keeping state isolated and tree-shakeable. The tradeoff is less middleware ecosystem compared to Redux, but the app's state needs are straightforward enough that this is not a concern.

### Frontend-side prediction and analytics

Forecasting (weighted moving average, seasonal decomposition) and anomaly detection run in TypeScript on the frontend. This keeps the Rust backend focused on data storage and retrieval. The tradeoff is that very large datasets could cause UI thread delays, but typical family expense data (thousands of rows over several years) is well within acceptable limits.

### Tauri over Electron

Tauri produces significantly smaller binaries and uses less memory than Electron because it relies on the OS webview instead of bundling Chromium. The Rust backend is faster and more memory-efficient than a Node.js backend. The tradeoff is a smaller ecosystem and more complex debugging across the Rust/JS boundary.

## How to Add a New Page

1. **Create the page component** at `src/pages/YourPage.tsx`. Use the existing pages as a template. Import MUI components and any stores you need.

2. **Add a route** in `src/App.tsx`:
   ```tsx
   import YourPage from './pages/YourPage';
   // Inside <Routes>:
   <Route path="/your-page" element={<YourPage />} />
   ```

3. **Add navigation** in `src/components/layout/Layout.tsx`. Add an entry to the `NAV_ITEMS` array:
   ```tsx
   { path: '/your-page', label: 'Your Page', icon: <SomeIcon /> },
   ```

4. **Create a store** (if needed) at `src/stores/yourStore.ts` using the Zustand pattern from existing stores. Define the state interface, initial values, and async actions that call `api.ts` functions.

5. **Add API functions** (if the page needs new backend data) to `src/services/api.ts`:
   ```typescript
   export async function yourQuery(param: string): Promise<YourType> {
     return invoke('your_command', { param });
   }
   ```

6. **Add types** to `src/types/index.ts` for any new data structures.

7. **Implement the backend command** (see next section) if you added an API function.

## How to Add a New Tauri Command

1. **Define the Rust struct** (if returning new data) in `src-tauri/src/db/models.rs`. Derive `Serialize` and `Deserialize`:
   ```rust
   #[derive(Debug, Serialize, Deserialize)]
   pub struct YourModel {
       pub field: String,
       pub amount: f64,
   }
   ```

2. **Implement the query** in `src-tauri/src/db/queries.rs` as a method on `Database`:
   ```rust
   impl Database {
       pub fn your_query(&self, param: &str) -> rusqlite::Result<Vec<YourModel>> {
           let mut stmt = self.conn.prepare("SELECT ... FROM ... WHERE ...")?;
           let rows = stmt.query_map(params![param], |row| {
               Ok(YourModel {
                   field: row.get(0)?,
                   amount: row.get(1)?,
               })
           })?;
           rows.collect()
       }
   }
   ```

3. **Create the command** in the appropriate module under `src-tauri/src/commands/` (or create a new module). Follow the existing pattern:
   ```rust
   #[tauri::command]
   pub fn your_command(
       state: State<AppState>,
       param: String,
   ) -> Result<Vec<YourModel>, String> {
       let db = state.db.lock().map_err(|e| format!("Lock error: {}", e))?;
       db.your_query(&param).map_err(|e| format!("DB error: {}", e))
   }
   ```

4. **Register the command** in `src-tauri/src/lib.rs` by adding it to the `generate_handler!` macro:
   ```rust
   .invoke_handler(tauri::generate_handler![
       // ... existing commands ...
       commands::your_module::your_command,
   ])
   ```

5. **If you created a new command module**, add `pub mod your_module;` to `src-tauri/src/commands/mod.rs`.

6. **Add the TypeScript wrapper** in `src/services/api.ts`:
   ```typescript
   export async function yourQuery(param: string): Promise<YourModel[]> {
     return invoke('your_command', { param });
   }
   ```

7. **Add the TypeScript type** in `src/types/index.ts`:
   ```typescript
   export interface YourModel {
     field: string;
     amount: number;
   }
   ```

8. **Test the round trip** by calling the API function from a page or the browser console and verifying the data flows from SQLite through Rust through Tauri IPC to the React frontend.
