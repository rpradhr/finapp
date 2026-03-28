pub mod models;
pub mod queries;

use rusqlite::{Connection, Result as SqlResult};
use std::path::Path;

pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Database { conn };
        db.run_migrations()?;
        Ok(db)
    }

    pub fn new_in_memory() -> SqlResult<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;
        let db = Database { conn };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> SqlResult<()> {
        self.conn.execute_batch("
            CREATE TABLE IF NOT EXISTS _migrations (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ")?;

        let applied: Vec<String> = {
            let mut stmt = self.conn.prepare("SELECT name FROM _migrations ORDER BY id")?;
            let rows = stmt.query_map([], |row| row.get(0))?;
            rows.filter_map(|r| r.ok()).collect()
        };

        let migrations = vec![
            ("001_initial", include_str!("../../migrations/001_initial.sql")),
        ];

        for (name, sql) in migrations {
            if !applied.contains(&name.to_string()) {
                self.conn.execute_batch(sql)?;
                self.conn.execute(
                    "INSERT INTO _migrations (name) VALUES (?1)",
                    [name],
                )?;
                tracing::info!("Applied migration: {}", name);
            }
        }

        Ok(())
    }
}
