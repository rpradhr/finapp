CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    transaction_date TEXT NOT NULL,
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
    debit_r REAL,
    debit_s REAL,
    location TEXT,
    travel_flag INTEGER DEFAULT 0,
    payment_method TEXT,
    tags TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    source_sheet TEXT,
    import_batch_id TEXT,
    data_quality_status TEXT DEFAULT 'clean',
    data_quality_issue TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    imported_at TEXT NOT NULL DEFAULT (datetime('now')),
    total_rows INTEGER,
    imported_rows INTEGER,
    error_rows INTEGER,
    warning_rows INTEGER,
    status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS merchant_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_description TEXT NOT NULL,
    standardized_merchant TEXT,
    category TEXT,
    subcategory TEXT,
    txn_count INTEGER DEFAULT 0,
    source TEXT DEFAULT 'imported'
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    subcategory TEXT,
    transaction_count INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0,
    avg_amount REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budgets (
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

CREATE TABLE IF NOT EXISTS scenario_assumptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value REAL NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_txn_year_month ON transactions(year_month);
CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_txn_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_txn_merchant ON transactions(std_merchant);
CREATE INDEX IF NOT EXISTS idx_txn_amount ON transactions(amount);
CREATE INDEX IF NOT EXISTS idx_txn_deleted ON transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_merchant_raw ON merchant_map(raw_description);

INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_provider', 'local');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'light');
