# Maintenance Guide

## Development Environment Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend build toolchain |
| npm | 9+ | Package management |
| Rust | stable (1.70+) | Backend compilation |
| Tauri CLI | 2.x | Desktop app packaging |

### First-Time Setup

```bash
# Clone and install frontend dependencies
cd /Users/rahul.pradhan/AppDev/FinApp
npm install

# Verify Rust toolchain
rustup update stable
cargo --version

# Install Tauri CLI (if not already installed)
cargo install tauri-cli

# Build and run in development mode
npm run dev          # Start frontend dev server (port 1420)
npx tauri dev        # Start full Tauri app in dev mode
```

## Common Development Tasks

### Adding a New Database Migration

1. Create a new SQL file: `src-tauri/migrations/002_your_migration.sql`
2. Register it in `src-tauri/src/db/mod.rs` in the `migrations` vec:

```rust
let migrations = vec![
    ("001_initial", include_str!("../../migrations/001_initial.sql")),
    ("002_your_migration", include_str!("../../migrations/002_your_migration.sql")),
];
```

Migrations are applied automatically on app startup. Each migration runs only once (tracked in the `_migrations` table).

### Adding a New Tauri Command

1. Write the handler function in the appropriate file under `src-tauri/src/commands/`
2. Register it in `src-tauri/src/lib.rs` in the `invoke_handler` macro
3. Add the corresponding TypeScript wrapper in `src/services/api.ts`
4. Call from frontend via `import { yourFunction } from '../services/api'`

### Adding a New Frontend Page

1. Create a component in `src/pages/YourPage.tsx`
2. Add a route in `src/App.tsx`
3. Add navigation entry in `src/components/layout/Layout.tsx`

### Adding a New Zustand Store

1. Create `src/stores/yourStore.ts` following the pattern in existing stores
2. Import and use via `useYourStore()` hook in components

## Database Management

### Location

The SQLite database is stored at the platform's app data directory:
- macOS: `~/Library/Application Support/com.finapp.family/finapp.db`

### Backup

The database is a single file. To back up:
```bash
cp ~/Library/Application\ Support/com.finapp.family/finapp.db ~/Desktop/finapp-backup.db
```

### WAL Mode

The database uses Write-Ahead Logging (WAL) for better concurrent read performance. This creates two additional files alongside the main database:
- `finapp.db-wal` (write-ahead log)
- `finapp.db-shm` (shared memory)

Do not delete these files while the app is running. They are automatically cleaned up on graceful shutdown.

### Resetting Data

To start fresh, close the app and delete the database file. The schema will be recreated on next launch.

## Build and Release

### Development Build

```bash
npx tauri dev
```

### Production Build

```bash
npx tauri build
```

Output: `src-tauri/target/release/finapp` (macOS binary)

The build process:
1. Runs `npm run build` (TypeScript compilation + Vite bundling)
2. Compiles Rust backend in release mode
3. Packages the app with the bundled frontend

### Build Troubleshooting

| Issue | Solution |
|-------|----------|
| `cargo` not found | Add `~/.cargo/bin` to PATH |
| `generate_context!()` panic | Run `npm run build` first to create `dist/` |
| Missing icon error | Ensure `src-tauri/icons/icon.png` exists |
| SQLite build failure | `rusqlite` uses bundled SQLite; ensure C compiler is available |
| Frontend type errors | Run `npx tsc --noEmit` to check |

## Dependency Updates

### Frontend

```bash
npm outdated        # Check for outdated packages
npm update          # Update within semver ranges
```

Key dependencies to monitor:
- `@tauri-apps/api` - Must match Tauri backend version
- `react` / `react-dom` - Major version changes need testing
- `@mui/material` - UI component library
- `recharts` - Chart library

### Backend (Rust)

```bash
cd src-tauri
cargo outdated      # Requires cargo-outdated
cargo update        # Update within semver ranges
```

Key dependencies:
- `tauri` - Must match frontend `@tauri-apps/api` version
- `rusqlite` - Database driver
- `calamine` - XLSX parser (API can change between minor versions)

## Performance Considerations

- The app handles 17,000+ transactions efficiently with SQLite indexing
- Analytics queries use indexes on `year`, `category`, `year_month`, `transaction_date`
- Frontend charts limit data points (last 12 months, top 8 categories) for rendering performance
- The import pipeline processes the full spreadsheet in a single transaction for atomicity

## Logging

Backend logging uses the `tracing` crate. Log output goes to stderr during development.
Key log points:
- Migration application
- Import progress (row counts)
- Import errors (per-row)
- Command execution errors
