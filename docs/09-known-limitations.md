# Known Limitations and Future Work

## Current Limitations

### Data Import

1. **Single spreadsheet format**: The import pipeline is tailored to the specific XLSX format of `Personal_Finance_Normalized.xlsx`. Importing spreadsheets with different column orders or sheet names will fail or produce incorrect results.

2. **No CSV/OFX/QFX support**: Only XLSX files are supported. Bank exports in CSV, OFX, or QFX format cannot be imported directly.

3. **No incremental sync**: Re-importing the same spreadsheet performs a full upsert by `Txn_ID`. There is no mechanism to detect and import only new rows from a growing spreadsheet.

4. **Currency handling**: All amounts are treated as USD. The original spreadsheet contains INR-to-USD conversion artifacts that are imported as-is. No multi-currency support or live exchange rate conversion.

### AI and NLP

5. **Rule-based NLP only in local mode**: The natural language parser uses keyword matching and regex patterns. It cannot handle complex or ambiguous queries (e.g., "what did I spend more on, food or travel, in the last two years?").

6. **Limited category mapping**: The NLP category alias table covers common terms but may not match user-specific or unusual category names. Unrecognized categories fall through silently.

7. **No Claude API integration by default**: The external AI provider (Claude API) requires manual configuration of an API key in Settings. Local mode provides basic insights only.

8. **Insight generation is heuristic**: Local AI insights are generated from simple statistical rules (highest category, month-over-month change, etc.), not from actual language model analysis.

### Predictions

9. **Weighted moving average only**: The projection model uses a simple weighted moving average with optional inflation adjustment. It does not account for life events, income changes, or macroeconomic factors.

10. **Seasonal model requires 24+ months**: Monthly projections need at least 2 full years of data to compute seasonal patterns. With less data, monthly projections are unavailable.

11. **No confidence intervals**: Projections show point estimates with qualitative confidence labels (high/medium/low) rather than statistical confidence intervals.

### UI/UX

12. **No mobile/responsive optimization**: The UI is designed for desktop (1400x900 default). While resizable, the layout is not optimized for narrow or mobile-sized windows.

13. **No data export**: There is no way to export filtered transactions, reports, or charts to CSV, PDF, or image formats.

14. **No undo for deletions**: Deleting a transaction is immediate and irreversible (no soft delete or undo).

15. **Single-user only**: No multi-user support, authentication, or data separation between family members.

### Technical

16. **macOS only tested**: While Tauri supports cross-platform builds, the app has only been developed and tested on macOS. Windows and Linux builds may require additional configuration.

17. **No auto-updates**: The app does not include an auto-update mechanism. Users must manually download and install new versions.

18. **SQLite single-writer**: SQLite with WAL mode supports concurrent reads but only one writer at a time. This is not an issue for a single-user desktop app but would be for any future multi-process architecture.

19. **Bundle size**: The frontend bundle is ~937KB gzipped (~277KB compressed). This could be reduced with code splitting and lazy loading of chart libraries.

## Future Work (Phase 2)

### High Priority

- **Bank feed integration**: Direct import from bank APIs (Plaid, Yodlee) for automatic transaction sync
- **Multi-currency support**: Store original currency and provide conversion to a base currency
- **CSV/OFX import**: Support additional import formats beyond XLSX
- **Data export**: Export transactions, reports, and charts to CSV and PDF

### Medium Priority

- **Budget management UI**: Full CRUD for budgets with variance tracking and alerts
- **Recurring transaction detection**: Automatic identification of subscriptions and recurring charges
- **Receipt attachment**: Attach photos or PDFs to transactions
- **Category auto-suggestion**: ML-based category prediction for uncategorized transactions
- **Trend alerts**: Notifications when spending in a category exceeds historical norms

### Lower Priority

- **Family member profiles**: Separate spending views per family member
- **Goal tracking**: Savings goals with progress visualization
- **Tax category tagging**: Mark transactions as tax-deductible with year-end summary
- **Dark mode**: Theme toggle for light/dark UI
- **Cross-platform testing**: Verify and fix Windows/Linux builds
- **Auto-updates**: Integrate Tauri's updater plugin
