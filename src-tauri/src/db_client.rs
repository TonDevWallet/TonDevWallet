use base64::{engine::general_purpose, Engine as _};
use rusqlite::{
    params_from_iter,
    types::{Value as SqliteValue, ValueRef},
    Connection,
};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
};
use std::time::Duration;
use tauri::Manager;

#[derive(Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DbClientContext {
    client_id: u64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DbExecuteResult {
    rows_affected: usize,
    last_insert_id: i64,
}

struct PinnedDbClient {
    connection: Connection,
}

impl Drop for PinnedDbClient {
    fn drop(&mut self) {
        let _ = self.connection.execute_batch("ROLLBACK");
    }
}

#[derive(Default)]
pub(crate) struct DbClientState {
    next_client_id: AtomicU64,
    clients: Mutex<HashMap<u64, PinnedDbClient>>,
}

impl DbClientState {
    fn acquire(&self, db_path: &Path) -> Result<DbClientContext, String> {
        let client = PinnedDbClient {
            connection: open_database_at_path(db_path)?,
        };
        let client_id = self.next_client_id.fetch_add(1, Ordering::Relaxed) + 1;
        let mut clients = self
            .clients
            .lock()
            .map_err(|_| "Database client state lock poisoned".to_string())?;
        clients.insert(client_id, client);

        Ok(DbClientContext { client_id })
    }

    fn with_connection<T>(
        &self,
        context: &DbClientContext,
        operation: impl FnOnce(&Connection) -> Result<T, String>,
    ) -> Result<T, String> {
        let mut clients = self
            .clients
            .lock()
            .map_err(|_| "Database client state lock poisoned".to_string())?;
        let client = clients
            .get_mut(&context.client_id)
            .ok_or_else(|| format!("Database client {} is not active", context.client_id))?;

        operation(&client.connection)
    }

    fn release(&self, context: &DbClientContext) -> Result<(), String> {
        let client = {
            let mut clients = self
                .clients
                .lock()
                .map_err(|_| "Database client state lock poisoned".to_string())?;
            clients
                .remove(&context.client_id)
                .ok_or_else(|| format!("Database client {} is not active", context.client_id))?
        };

        let _ = client.connection.execute_batch("ROLLBACK");
        Ok(())
    }
}

fn json_to_sqlite_value(value: serde_json::Value) -> Result<SqliteValue, String> {
    match value {
        serde_json::Value::Null => Ok(SqliteValue::Null),
        serde_json::Value::Bool(value) => Ok(SqliteValue::Integer(if value { 1 } else { 0 })),
        serde_json::Value::Number(value) => {
            if let Some(value) = value.as_i64() {
                Ok(SqliteValue::Integer(value))
            } else if let Some(value) = value.as_u64() {
                if value <= i64::MAX as u64 {
                    Ok(SqliteValue::Integer(value as i64))
                } else {
                    Ok(SqliteValue::Real(value as f64))
                }
            } else if let Some(value) = value.as_f64() {
                Ok(SqliteValue::Real(value))
            } else {
                Err("Unsupported SQLite numeric value".to_string())
            }
        }
        serde_json::Value::String(value) => Ok(SqliteValue::Text(value)),
        _ => Err("Unsupported SQLite parameter value".to_string()),
    }
}

fn sqlite_value_to_json(value: ValueRef<'_>) -> Result<serde_json::Value, String> {
    match value {
        ValueRef::Null => Ok(serde_json::Value::Null),
        ValueRef::Integer(value) => Ok(serde_json::Value::Number(value.into())),
        ValueRef::Real(value) => serde_json::Number::from_f64(value)
            .map(serde_json::Value::Number)
            .ok_or_else(|| "Unsupported SQLite real value".to_string()),
        ValueRef::Text(value) => Ok(serde_json::Value::String(
            String::from_utf8_lossy(value).to_string(),
        )),
        ValueRef::Blob(value) => Ok(serde_json::Value::String(
            general_purpose::STANDARD.encode(value),
        )),
    }
}

fn configure_connection(connection: &Connection) -> Result<(), String> {
    connection
        .busy_timeout(Duration::from_secs(30))
        .map_err(|e| format!("Failed to configure database busy timeout: {}", e))?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| format!("Failed to enable SQLite foreign keys: {}", e))?;
    Ok(())
}

fn app_database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir.join("databases").join("data.db"))
}

fn open_database_at_path(db_path: &Path) -> Result<Connection, String> {
    let connection = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database {}: {}", db_path.display(), e))?;
    configure_connection(&connection)?;
    Ok(connection)
}

fn values_from_json(values: Vec<serde_json::Value>) -> Result<Vec<SqliteValue>, String> {
    values
        .into_iter()
        .map(json_to_sqlite_value)
        .collect::<Result<Vec<_>, _>>()
}

fn query_rows(
    connection: &Connection,
    sql: &str,
    values: &[SqliteValue],
) -> Result<Vec<serde_json::Value>, String> {
    let mut prepared = connection
        .prepare(sql)
        .map_err(|e| format!("Failed to prepare database query: {}", e))?;
    let column_names = prepared
        .column_names()
        .into_iter()
        .map(|column| column.to_string())
        .collect::<Vec<_>>();
    let mut rows = prepared
        .query(params_from_iter(values.iter()))
        .map_err(|e| format!("Failed to execute database query: {}", e))?;
    let mut statement_rows = Vec::new();

    while let Some(row) = rows
        .next()
        .map_err(|e| format!("Failed to read database row: {}", e))?
    {
        let mut object = serde_json::Map::new();
        for (index, column) in column_names.iter().enumerate() {
            let value = row
                .get_ref(index)
                .map_err(|e| format!("Failed to read database column: {}", e))?;
            object.insert(column.clone(), sqlite_value_to_json(value)?);
        }
        statement_rows.push(serde_json::Value::Object(object));
    }

    Ok(statement_rows)
}

fn execute_statement(
    connection: &Connection,
    sql: &str,
    values: &[SqliteValue],
) -> Result<DbExecuteResult, String> {
    let rows_affected = connection
        .execute(sql, params_from_iter(values.iter()))
        .map_err(|e| format!("Failed to execute database statement: {}", e))?;

    Ok(DbExecuteResult {
        rows_affected,
        last_insert_id: connection.last_insert_rowid(),
    })
}

#[tauri::command]
pub(crate) fn db_acquire_client(
    app: tauri::AppHandle,
    state: tauri::State<'_, DbClientState>,
) -> Result<DbClientContext, String> {
    let db_path = app_database_path(&app)?;
    state.acquire(&db_path)
}

#[tauri::command]
pub(crate) fn db_client_select(
    state: tauri::State<'_, DbClientState>,
    context: DbClientContext,
    sql: String,
    values: Vec<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    let values = values_from_json(values)?;
    state.with_connection(&context, move |connection| {
        query_rows(connection, &sql, &values)
    })
}

#[tauri::command]
pub(crate) fn db_client_execute(
    state: tauri::State<'_, DbClientState>,
    context: DbClientContext,
    sql: String,
    values: Vec<serde_json::Value>,
) -> Result<DbExecuteResult, String> {
    let values = values_from_json(values)?;
    state.with_connection(&context, move |connection| {
        execute_statement(connection, &sql, &values)
    })
}

#[tauri::command]
pub(crate) fn db_release_client(
    state: tauri::State<'_, DbClientState>,
    context: DbClientContext,
) -> Result<(), String> {
    state.release(&context)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn test_db_path(name: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        path.push(format!("ton_dev_wallet_{}_{}.db", name, std::process::id()));
        let _ = fs::remove_file(&path);
        path
    }

    #[test]
    fn context_pins_connection_for_temp_state_and_reads() {
        let path = test_db_path("pinning");
        let state = DbClientState::default();
        let context = state.acquire(&path).unwrap();

        state
            .with_connection(&context, |connection| {
                connection
                    .execute_batch(
                        "CREATE TEMP TABLE pinned (value TEXT); INSERT INTO pinned VALUES ('ok');",
                    )
                    .map_err(|e| e.to_string())
            })
            .unwrap();

        let values = Vec::new();
        let rows = state
            .with_connection(&context, |connection| {
                query_rows(connection, "SELECT value FROM pinned", &values)
            })
            .unwrap();
        assert_eq!(
            rows[0].get("value").and_then(|value| value.as_str()),
            Some("ok")
        );

        state.release(&context).unwrap();
        let _ = fs::remove_file(path);
    }

    #[test]
    fn client_manual_transactions_commit_and_rollback() {
        let path = test_db_path("manual_transaction");
        open_database_at_path(&path)
            .unwrap()
            .execute_batch("CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT);")
            .unwrap();

        let state = DbClientState::default();
        let commit_context = state.acquire(&path).unwrap();
        let no_values = Vec::new();
        let insert_values = vec![SqliteValue::Text("one".to_string())];

        state
            .with_connection(&commit_context, |connection| {
                execute_statement(connection, "BEGIN IMMEDIATE", &no_values)?;
                execute_statement(
                    connection,
                    "INSERT INTO items (value) VALUES (?)",
                    &insert_values,
                )?;
                execute_statement(connection, "COMMIT", &no_values)?;
                Ok(())
            })
            .unwrap();
        state.release(&commit_context).unwrap();

        let rollback_context = state.acquire(&path).unwrap();
        let rollback_values = vec![SqliteValue::Text("two".to_string())];
        state
            .with_connection(&rollback_context, |connection| {
                execute_statement(connection, "BEGIN IMMEDIATE", &no_values)?;
                execute_statement(
                    connection,
                    "INSERT INTO items (value) VALUES (?)",
                    &rollback_values,
                )?;
                execute_statement(connection, "ROLLBACK", &no_values)?;
                Ok(())
            })
            .unwrap();
        state.release(&rollback_context).unwrap();

        let count: i64 = open_database_at_path(&path)
            .unwrap()
            .query_row("SELECT COUNT(*) FROM items", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
        let _ = fs::remove_file(path);
    }
}
