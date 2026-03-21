//! Migration runner - manages the migrations table and applies pending migrations.
//!
//! Lock semantics:
//! - Table has rows = locked (migrations in progress or stale lock)
//! - Table empty = can acquire lock
//! - Always release lock when done (including on error)

use super::{Migration, MigrationError, MigrationResult};
use rusqlite::Connection;

/// Runs database migrations
pub struct MigrationRunner<'a> {
    conn: &'a mut Connection,
}

impl<'a> MigrationRunner<'a> {
    /// Create a new migration runner with the given connection
    pub fn new(conn: &'a mut Connection) -> Self {
        Self { conn }
    }
    
    /// Create the migrations tracking table if it doesn't exist
    /// Uses the same table name as Knex (knex_migrations) for compatibility
    pub fn create_migration_table(&self) -> MigrationResult<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS knex_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                batch INTEGER NOT NULL,
                migration_time DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .map_err(|e| MigrationError::SqlError(e.to_string()))?;
        
        // Create the migrations_lock table. Lock semantics: rows = locked, empty = can acquire
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS knex_migrations_lock (
                is_locked INTEGER NOT NULL DEFAULT 1
            )",
            [],
        )
        .map_err(|e| MigrationError::SqlError(e.to_string()))?;
        Ok(())
    }
    
    /// Acquire migration lock. Fails if table has rows (already locked).
    fn acquire_lock(&mut self) -> MigrationResult<()> {
        let count: i64 = self.conn
            .query_row(
                "SELECT COUNT(*) FROM knex_migrations_lock WHERE is_locked = 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| MigrationError::SqlError(e.to_string()))?;
        
        if count > 0 {
            return Err(MigrationError::InvalidState(
                "Migrations are locked (another process may be running migrations)".to_string(),
            ));
        }
        
        self.conn.execute(
            "INSERT INTO knex_migrations_lock (is_locked) VALUES (1)",
            [],
        )
        .map_err(|e| MigrationError::SqlError(e.to_string()))?;
        
        log::debug!("Migration lock acquired");
        Ok(())
    }
    
    /// Release migration lock. Must be called when done (including on error).
    fn release_lock(&mut self) {
        let _ = self.conn.execute("DELETE FROM knex_migrations_lock", []);
        log::debug!("Migration lock released");
    }
    
    fn get_applied_names(&self) -> MigrationResult<std::collections::HashSet<String>> {
        let mut stmt = self.conn
            .prepare("SELECT name FROM knex_migrations")
            .map_err(|e| MigrationError::SqlError(e.to_string()))?;
        let names: std::collections::HashSet<String> = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| MigrationError::SqlError(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();
        Ok(names)
    }

    fn is_migration_applied(&self, migration: &dyn Migration, applied: &std::collections::HashSet<String>) -> bool {
        applied.contains(migration.name())
    }

    /// Returns the count of applied migrations (for reporting)
    pub fn get_applied_count(&self, migrations: &[Box<dyn Migration>]) -> MigrationResult<i64> {
        let applied = self.get_applied_names()?;
        let count = migrations
            .iter()
            .filter(|m| self.is_migration_applied(m.as_ref(), &applied))
            .count() as i64;
        Ok(count)
    }
    
    /// Apply all migrations whose names are not in the database.
    /// Uses the order from get_migrations() vec - no sorting.
    /// Acquires lock before running, always releases when done (including on error).
    pub fn apply_migrations(&mut self, migrations: &[Box<dyn Migration>]) -> MigrationResult<Vec<String>> {
        self.create_migration_table()?;
        self.acquire_lock()?;
        
        let result = self.apply_migrations_inner(migrations);
        self.release_lock();
        result
    }
    
    fn apply_migrations_inner(&mut self, migrations: &[Box<dyn Migration>]) -> MigrationResult<Vec<String>> {
        let applied = self.get_applied_names()?;
        let pending: Vec<_> = migrations
            .iter()
            .filter(|m| !self.is_migration_applied(m.as_ref(), &applied))
            .collect();
        
        let mut applied_names = Vec::new();

        // Record the migration in Knex format
        // Get the next batch number
        let batch: i64 = self.conn.query_row(
            "SELECT COALESCE(MAX(batch), 0) + 1 FROM knex_migrations",
            [],
            |row| row.get(0),
        )
        .map_err(|e| MigrationError::SqlError(e.to_string()))?;
        
        for migration in pending {
            self.apply_migration(migration.as_ref(), batch)?;
            applied_names.push(migration.name().to_string());
        }
        
        Ok(applied_names)
    }

    /// Apply a single migration
    fn apply_migration(&mut self, migration: &dyn Migration, batch: i64) -> MigrationResult<()> {
        log::info!("Applying migration: {}", migration.name());

        let tx = self.conn.transaction().map_err(|e| MigrationError::SqlError(e.to_string()))?;

        tx.execute_batch(migration.up())
            .map_err(|e| MigrationError::SqlError(format!(
                "Migration {} failed: {}",
                migration.name(),
                e
            )))?;

        tx.execute(
            "INSERT INTO knex_migrations (name, batch, migration_time) VALUES (?1, ?2, datetime('now'))",
            rusqlite::params![migration.name(), batch],
        )
        .map_err(|e| MigrationError::SqlError(e.to_string()))?;
        
        tx.commit().map_err(|e| MigrationError::SqlError(e.to_string()))?;
        
        log::info!("Migration {} applied successfully", migration.name());
        Ok(())
    }
    
    /// Rollback migrations after the given name (inclusive)
    #[allow(dead_code)]
    pub fn rollback_to(&mut self, migrations: &[Box<dyn Migration>], target_name: &str) -> MigrationResult<()> {
        self.create_migration_table()?;
        let applied = self.get_applied_names()?;
        
        if !applied.contains(target_name) {
            return Ok(());
        }
        
        let to_rollback: Vec<_> = migrations
            .iter()
            .rev()
            .skip_while(|m| m.name() != target_name)
            .take_while(|m| applied.contains(m.name()))
            .collect();
        
        for migration in to_rollback {
            self.revert_migration(migration.as_ref())?;
        }
        
        Ok(())
    }
    
    #[allow(dead_code)]
    fn revert_migration(&mut self, migration: &dyn Migration) -> MigrationResult<()> {
        let down_sql = migration.down().ok_or_else(|| {
            MigrationError::InvalidState(format!(
                "Migration {} cannot be rolled back",
                migration.name()
            ))
        })?;
        
        log::info!("Reverting migration: {}", migration.name());
        
        let tx = self.conn.transaction().map_err(|e| MigrationError::SqlError(e.to_string()))?;
        
        tx.execute_batch(down_sql)
            .map_err(|e| MigrationError::SqlError(format!(
                "Rollback of migration {} failed: {}",
                migration.name(),
                e
            )))?;
        
        tx.execute(
            "DELETE FROM knex_migrations WHERE name = ?1",
            [migration.name()],
        )
        .map_err(|e| MigrationError::SqlError(e.to_string()))?;
        
        tx.commit().map_err(|e| MigrationError::SqlError(e.to_string()))?;
        
        log::info!("Migration {} reverted successfully", migration.name());
        Ok(())
    }
}
