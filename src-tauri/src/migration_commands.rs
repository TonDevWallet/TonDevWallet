use crate::migrations::{get_migrations, MigrationRunner};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Result of running migrations
#[derive(Debug, Serialize, Deserialize)]
pub struct MigrationResult {
    pub success: bool,
    pub applied_count: i32,
    pub current_version: i64,
    pub error: Option<String>,
}

/// Run migrations on the given database path (sync version for internal use)
fn run_migrations_sync(db_path: String) -> Result<MigrationResult, String> {
    let path = PathBuf::from(&db_path);
    
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    let mut conn = Connection::open(&path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let mut runner = MigrationRunner::new(&mut conn);
    let migrations = get_migrations();
    
    // Create migrations tracking table if not exists
    runner.create_migration_table()
        .map_err(|e| format!("Failed to create migration table: {}", e))?;
    
    // Apply pending migrations
    let applied = runner.apply_migrations(&migrations)
        .map_err(|e| format!("Failed to apply migrations: {}", e))?;
    
    let total_count = runner.get_applied_count(&migrations)
        .map_err(|e| format!("Failed to get applied count: {}", e))?;
    
    Ok(MigrationResult {
        success: true,
        applied_count: applied.len() as i32,
        current_version: total_count,
        error: None,
    })
}

/// Public function for internal use (e.g., from other Rust code)
pub fn run_migrations_on_db(db_path: &str) -> Result<MigrationResult, String> {
    run_migrations_sync(db_path.to_string())
}
