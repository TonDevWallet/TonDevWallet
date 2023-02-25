// import { DatabaseConnection } from '../../driver/database-connection.js'
import { DatabaseConnection } from 'kysely'
import Database from 'tauri-plugin-sql-api'
/**
 * Config for the SQLite dialect.
 */
export interface SqliteTauriDialectConfig {
  /**
   * An sqlite Database instance or a function that returns one.
   *
   * If a function is provided, it's called once when the first query is executed.
   *
   * https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#new-databasepath-options
   */
  database: Database | (() => Promise<Database>)
  /**
   * Called once when the first query is executed.
   *
   * This is a Kysely specific feature and does not come from the `better-sqlite3` module.
   */
  onCreateConnection?: (connection: DatabaseConnection) => Promise<void>
}
/**
 * This interface is the subset of better-sqlite3 driver's `Database` class that
 * kysely needs.
 *
 * We don't use the type from `better-sqlite3` here to not have a dependency to it.
 *
 * https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#new-databasepath-options
 */
// export interface SqliteTauriDatabase {
// close(): void
// prepare(sql: string): SqliteStatement
// }
// export interface SqliteTauriStatement {
//   readonly reader: boolean
//   all(parameters: ReadonlyArray<unknown>): unknown[]
//   run(parameters: ReadonlyArray<unknown>): {
//     changes: number | bigint
//     lastInsertRowid: number | bigint
//   }
// }
