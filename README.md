# Family Expense App

A production-grade, local-first macOS desktop application for tracking and analyzing family expenses. Built with Tauri v2 (Rust backend + React/TypeScript frontend), the app provides complete visibility into 24+ years of expense history, daily expense tracking, interactive analytics dashboards, natural language queries, AI-powered insights, and spending projections -- all while keeping data entirely on your machine.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Data Import Format](#data-import-format)
- [Architecture Overview](#architecture-overview)
- [License](#license)

---

## Features

- **XLSX Import** -- Import historical expense data from structured Excel workbooks with full provenance tracking, validation, and re-import support (upsert by transaction ID).
- **Expense CRUD** -- Create, read, update, and soft-delete expenses with category auto-suggestion, duplicate detection, and full audit trail.
- **Analytics Dashboards** -- Interactive charts for monthly/yearly spending trends, category breakdowns (donut/bar), top merchants, family member attribution, and anomaly detection.
- **Natural Language Assistant** -- Ask questions like "How much did I spend on groceries in 2023?" or issue commands like "Add $45 groceries at Wegmans today" using a rule-based NLP parser with optional external LLM support.
- **AI-Powered Insights** -- Automatically generated insight cards highlighting spending anomalies, category trends, and period summaries.
- **Spending Projections** -- Annual and monthly forecasts using weighted moving averages with seasonal decomposition, applied at both total and per-category levels.
- **Data Quality Management** -- Review and resolve flagged issues from imports such as uncategorized transactions, missing dates, and anomalous amounts.
- **Privacy by Default** -- All data stored locally in SQLite. No telemetry, no network calls unless the user explicitly enables an external AI provider.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Tauri v2 (~15 MB binary, native macOS integration) |
| Frontend | React 19, TypeScript, Vite |
| UI Components | Material UI (MUI) v7 |
| Charting | Recharts v3 |
| State Management | Zustand v5 |
| Routing | React Router v7 |
| Backend (Rust) | Tauri 2 IPC commands, rusqlite (SQLite with WAL mode) |
| XLSX Parsing | calamine (Rust-native, high-performance) |
| Serialization | serde / serde_json |
| Date/Time | chrono |
| Error Handling | thiserror |
| Logging | tracing / tracing-subscriber |
| Frontend Testing | Vitest, React Testing Library, jsdom |
| Backend Testing | Rust built-in test framework (`cargo test`) |

---

## Prerequisites

Before building the app, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Rust toolchain** (install via [rustup](https://rustup.rs/))
  - Ensure `rustc` and `cargo` are available on your PATH
- **Tauri v2 CLI**
  - Install globally: `cargo install tauri-cli --version "^2"`
  - Or use the project-local version via `npx tauri`
- **macOS** development environment (Xcode Command Line Tools)

---

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd FinApp
   ```

2. **Install frontend dependencies**

   ```bash
   npm install
   ```

3. **Run in development mode**

   ```bash
   npx tauri dev
   ```

   This starts both the Vite dev server (frontend) and the Tauri Rust backend with hot reload.

4. **Build for production**

   ```bash
   npx tauri build
   ```

   Produces a native `.dmg` / `.app` bundle in `src-tauri/target/release/bundle/`.

---

## Project Structure

```
FinApp/
├── src/                        # React frontend
│   ├── components/             # Reusable UI components
│   │   ├── charts/             # Chart components (Recharts)
│   │   ├── forms/              # Form components
│   │   ├── layout/             # Layout and navigation
│   │   └── common/             # Shared UI elements
│   ├── pages/                  # Page-level components
│   │   ├── Overview.tsx        # Dashboard with key metrics
│   │   ├── Trends.tsx          # Monthly/yearly trend charts
│   │   ├── Categories.tsx      # Category breakdown and drill-down
│   │   ├── Transactions.tsx    # Transaction list with filters
│   │   ├── Import.tsx          # XLSX import and data quality
│   │   ├── Assistant.tsx       # Natural language assistant
│   │   └── Settings.tsx        # App configuration
│   ├── services/               # Frontend service layer
│   │   ├── api.ts              # Tauri IPC bridge
│   │   ├── nlp.ts              # Natural language parsing
│   │   ├── ai.ts               # AI provider abstraction
│   │   └── prediction.ts       # Statistical forecasting
│   ├── stores/                 # Zustand state stores
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   ├── theme/                  # MUI theme configuration
│   ├── App.tsx                 # Root component
│   └── main.tsx                # Entry point
│
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs             # Tauri entry point
│   │   ├── lib.rs              # Library root
│   │   ├── db/                 # Database module (migrations, models, queries)
│   │   ├── import/             # Import pipeline (parser, validator, normalizer)
│   │   ├── commands/           # Tauri IPC command handlers
│   │   └── services/           # Business logic services
│   ├── migrations/             # SQL migration files
│   └── Cargo.toml              # Rust dependencies
│
├── tests/                      # Test files
│   ├── unit/
│   ├── integration/
│   └── smoke/
│
├── docs/                       # Project documentation
│   ├── 01-PRD.md               # Product requirements document
│   ├── 02-architecture.md      # Architecture and design document
│   └── ...                     # Additional docs
│
├── package.json                # Node.js dependencies and scripts
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

---

## Available Scripts

### Frontend / Full App

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (frontend only, no Tauri shell) |
| `npm run build` | Type-check with `tsc` and build the frontend with Vite |
| `npm run preview` | Preview the production frontend build |
| `npm test` | Run all frontend tests via Vitest |
| `npm run test:watch` | Run frontend tests in watch mode |
| `npm run lint` | Type-check the project with `tsc --noEmit` |

### Tauri (Full Desktop App)

| Command | Description |
|---|---|
| `npx tauri dev` | Launch the full desktop app in development mode |
| `npx tauri build` | Build the production desktop app (.dmg / .app) |

### Rust Backend

| Command | Description |
|---|---|
| `cd src-tauri && cargo test` | Run all Rust backend tests |
| `cd src-tauri && cargo build` | Build the Rust backend only |

---

## Testing

The project includes **48 total tests** across frontend and backend:

### Frontend Tests (31 tests) -- Vitest

Run with:

```bash
npm test
```

Covers:
- Natural language parser intent classification and entity extraction
- Prediction/forecasting math and seasonal decomposition
- React component rendering and interaction
- Service layer integration tests

### Rust Backend Tests (17 tests) -- cargo test

Run with:

```bash
cd src-tauri && cargo test
```

Covers:
- Database query correctness
- Import pipeline parsing and validation
- Data normalization rules
- Edge cases (null handling, duplicate imports, date fallbacks)

### Run All Tests

```bash
npm test && cd src-tauri && cargo test
```

---

## Data Import Format

The app imports structured `.xlsx` workbooks. The expected workbook contains the following sheets:

| Sheet Name | Purpose |
|---|---|
| **Master_Transactions** | Primary dataset -- all historical transactions (one row per transaction with ~20 columns including Txn_ID, date, amount, category, subcategory, merchant, etc.) |
| **Merchant_Map** | Maps raw descriptions to standardized merchant names and categories |
| **Category_Map** | Defines the category/subcategory taxonomy with aggregate statistics |
| **Data_Quality_Log** | Tracks known data quality issues for imported transactions |
| **Budget_vs_Actual** | Budget baselines by category and year |
| **Scenario_Model** | Assumption parameters for spending projections (e.g., growth rates) |

### Import Behavior

- First import populates the database from scratch
- Re-imports use **upsert by Txn_ID**: new rows are inserted, existing rows are updated, missing rows are flagged (not deleted)
- Manually added expenses (source = "manual") are never modified during re-import
- Each import creates a batch record with summary statistics (total, imported, errors, warnings)
- Validation issues (missing dates, uncategorized transactions, anomalous amounts) are flagged for manual review

---

## Architecture Overview

### Local-First Design

All data and computation run entirely on the user's machine. The app requires no internet connection for full functionality. An external AI provider (e.g., Anthropic Claude API) can be optionally enabled for richer natural language interaction, but the app ships with a fully capable rule-based NLP engine and statistical forecasting system.

### Data Flow

```
.xlsx file --> [Rust Import Pipeline] --> SQLite Database (WAL mode)
                                              |
                                              v
              [Tauri IPC Commands] <--> [React Frontend]
                                              |
                                              v
                                     [Dashboards, Charts, NL Assistant]
```

### Key Design Decisions

- **Tauri v2 over Electron** -- 10x smaller binary (~15 MB vs ~150 MB), faster startup, Rust backend for high-performance import and query execution.
- **SQLite with WAL mode** -- Single-file database with ACID transactions, concurrent read/write support, zero configuration. Stored in `~/Library/Application Support/com.finapp.family/`.
- **calamine for XLSX parsing** -- Rust-native Excel reader, roughly 10x faster than Python-based alternatives, no external runtime dependency.
- **Zustand over Redux** -- Minimal boilerplate, TypeScript-first, appropriate for the application's scale.
- **Rule-based NLP** -- Zero external dependencies, deterministic behavior, sufficient for the defined set of query and command patterns.
- **Forward-only migrations** -- SQL migration files run on app startup in order, tracked in a `_migrations` table.

### Privacy and Security

- No telemetry, analytics, or data collection of any kind
- No network calls unless the user explicitly enables an external AI provider
- Raw financial data is never sent to external APIs; only anonymized/aggregated summaries if external AI is opted into
- Database file is user-owned and portable
- No authentication required (single-user local application)

### Performance Targets

| Metric | Target |
|---|---|
| App startup | < 3 seconds |
| Simple query response | < 500 ms |
| Complex analytics query | < 2 seconds |
| Import of ~18,000 rows | < 30 seconds |
| Memory usage (typical) | < 512 MB |

---

## License

TBD -- License information to be added.
