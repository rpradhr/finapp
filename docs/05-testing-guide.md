# Testing Guide

## Overview

The Family Expense App has 48 tests across two layers:

| Layer | Framework | Test Count |
|---|---|---|
| Frontend (TypeScript) | Vitest + jsdom | 31 |
| Backend (Rust) | cargo test | 17 |

---

## Frontend Tests

Frontend tests live in `tests/unit/` and are run with Vitest using the jsdom environment.

### NLP Parser Tests (17 tests)

**File**: `tests/unit/nlp.test.ts`

These tests verify the `parseIntent` function from `src/services/nlp`, which converts natural language input into structured intent objects. The tests are organized by intent type:

**Query intents (5 tests)** -- Verify that spending questions are parsed with the correct `type: 'query'`, `category`, and `period`. Examples include "how much did I spend on groceries in 2023" and "total food spending". Category keywords like "groceries" and "grocery" are mapped to canonical names (e.g., `"Food"`).

**Add intents (4 tests)** -- Verify that expense entry phrases are parsed with `type: 'add'`, extracting `amount`, `category`, and optionally `merchant`. Examples include "add $50 for groceries at Wegmans" and "spent $120 on gas". The parser handles dollar signs and decimal amounts (e.g., `45.50`). Category keywords like "gas" map to `"Transportation"`, and "dining" maps to `"Food"`.

**Compare intents (2 tests)** -- Verify that year-over-year comparison phrases produce `type: 'compare'` with `period` and `period2`. Both "vs" and "to" separators are supported.

**Top intents (3 tests)** -- Verify that phrases about highest-spending categories produce `type: 'top'`. Trigger words include "top", "biggest", and "most".

**Summarize intents (2 tests)** -- Verify that summary requests produce `type: 'summarize'` with a `period`.

**Unknown intents (1 test)** -- Verify that empty strings and unrecognizable input return `type: 'unknown'`.

### Prediction Service Tests (14 tests)

**File**: `tests/unit/prediction.test.ts`

These tests verify the projection and anomaly detection functions from `src/services/prediction`.

**projectAnnualSpending (5 tests)** -- Tests annual projection with a configurable growth rate and number of future years. Verifies that projections start at the next year after the data, values increase with positive growth, confidence levels degrade from "high" to "medium" to "low" for years 1/2/3+, and edge cases (single data point, zero totals) return empty arrays.

**projectMonthlySpending (3 tests)** -- Tests monthly projection for a target year based on historical monthly patterns. Verifies that 12 months are returned, projected values are within a reasonable range (greater than 0, less than 50000), and insufficient data (fewer than 12 months) returns empty.

**calculateGrowthRate (2 tests)** -- Tests year-over-year growth rate calculation. Verifies that the rate is positive and below 20% for the sample data, and that insufficient data falls back to a default of 0.03 (3%).

**detectAnomalies (3 tests)** -- Tests anomaly detection on monthly spending data. Verifies that an extreme value (50000 among otherwise uniform 10000 values) is detected and identified by its year-month, uniform data produces no anomalies, and empty data returns an empty array.

---

## Backend Tests

Backend tests are inline in the Rust source files and run with `cargo test`.

### DB Query Tests (10 tests)

**File**: `src-tauri/src/db/queries.rs`

These tests use an in-memory SQLite database populated with three seed transactions:

| ID | Date | Year | Category | Amount | Source |
|---|---|---|---|---|---|
| test-1 | 2024-01-15 | 2024 | Food | 50.00 | manual |
| test-2 | 2024-02-20 | 2024 | Transportation | 40.00 | manual |
| test-3 | 2023-06-10 | 2023 | Food | 75.00 | imported |

**Tests**:

1. `test_get_transactions_no_filter` -- Retrieves all 3 transactions with no filters applied.
2. `test_get_transactions_with_category_filter` -- Filters by category "Food" and expects 2 results.
3. `test_get_transactions_with_date_filter` -- Filters to 2024 date range and expects 2 results.
4. `test_add_transaction` -- Adds a new "Utilities" transaction and verifies amount, category, signed_amount (-120.0), and source ("manual").
5. `test_update_transaction` -- Updates test-1's category to "Dining" and amount to 55.0.
6. `test_delete_transaction` -- Deletes test-1 and verifies only 2 transactions remain.
7. `test_get_monthly_spending` -- Verifies monthly spending aggregation returns non-empty results.
8. `test_get_category_breakdown` -- Verifies category breakdown returns Food with a total of 125.0.
9. `test_get_key_metrics` -- Verifies total_transactions is 3 and total_spending is 165.0.
10. `test_settings` -- Writes and reads back a settings key-value pair.

### Normalizer Tests (7 tests)

**File**: `src-tauri/src/import/normalizer.rs`

These tests use a `make_raw` helper that creates a fully-populated `RawTransaction` with sensible defaults (Txn_ID: "TXN-TEST123", date: "2024-03-15", category: "Food", amount: 50.0). Each test overrides specific fields to test one normalization rule.

**Tests**:

1. `test_normalize_basic` -- A fully valid transaction normalizes with status "clean", correct ID, amount, category, and signed_amount.
2. `test_normalize_uncategorized_flagged` -- A transaction with category "Uncategorized" is flagged.
3. `test_normalize_missing_category_defaults` -- A transaction with `None` category defaults to "Uncategorized" and is flagged.
4. `test_normalize_date_fallback_year_month` -- When `transaction_date` is `None`, the date is reconstructed from `year_month` as "2024-03-01".
5. `test_normalize_amount_absolute` -- A negative amount (-75.0) is converted to its absolute value (75.0).
6. `test_normalize_missing_txn_id_errors` -- A transaction with no `Txn_ID` returns an error.
7. `test_normalize_inflow` -- When `inflow_outflow` is "Inflow" and `signed_amount` is `None`, the signed amount is computed as positive.

---

## Running Tests

### Frontend

```bash
cd /Users/rahul.pradhan/AppDev/FinApp
npm test
```

This runs Vitest, which discovers all `*.test.ts` files in `tests/unit/`. The jsdom environment is used to simulate a browser context where needed.

### Backend

```bash
cd /Users/rahul.pradhan/AppDev/FinApp/src-tauri
cargo test
```

This compiles and runs all `#[test]` functions across the Rust codebase, including the query and normalizer test modules.

### Running a Specific Test

```bash
# Frontend - run a single test file
npx vitest run tests/unit/nlp.test.ts

# Backend - run tests matching a name pattern
cargo test --manifest-path src-tauri/Cargo.toml test_normalize
```

---

## Test Data Patterns

### Frontend

- **NLP tests** use plain string inputs representing natural language queries. No mock services or external dependencies are needed; the parser is a pure function.
- **Prediction tests** use synthetic data arrays constructed inline:
  - `sampleYearly`: Five years (2020-2024) with linearly increasing totals (100k to 140k).
  - `sampleMonthly`: 36 months (2022-2024) with a sinusoidal seasonal pattern plus a year-over-year trend.
  - Anomaly test data: 12 months of uniform spending (10000) with one extreme outlier (50000 in December).

### Backend

- **DB query tests** use `Database::new_in_memory()` to create a disposable SQLite database with the full schema, then insert 3 seed transactions spanning two years and two categories.
- **Normalizer tests** use a `make_raw` factory function that produces a complete `RawTransaction` with all fields populated. Each test overrides one or two fields via a closure to isolate the behavior being tested.
