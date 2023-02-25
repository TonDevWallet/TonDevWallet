import {
  CompiledQuery,
  DatabaseConnection,
  Driver,
  QueryResult,
  SqliteDatabase,
  SqliteDialectConfig,
} from 'kysely'
import Database from 'tauri-plugin-sql-api'
import { SqliteTauriDialectConfig } from './sqliteTauriDialectConfig'
// import { isFunction } from 'util'
// import { Driver } from '../../driver/driver.js'
// import { CompiledQuery } from '../../query-compiler/compiled-query.js'
// import { freeze, isFunction } from '../../util/object-utils.js'
// import { SqliteDatabase, SqliteDialectConfig } from './sqlite-dialect-config.js'

// eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(obj: unknown): obj is Function {
  return typeof obj === 'function'
}

export class SqliteTauriDriver implements Driver {
  readonly #config: SqliteTauriDialectConfig
  readonly #connectionMutex = new ConnectionMutex()

  #db?: Database
  #connection?: DatabaseConnection

  constructor(config: SqliteTauriDialectConfig) {
    this.#config = Object.freeze({ ...config })
  }

  async init(): Promise<void> {
    this.#db = isFunction(this.#config.database)
      ? await this.#config.database()
      : this.#config.database

    this.#connection = new SqliteTauriConnection(this.#db)

    if (this.#config.onCreateConnection) {
      await this.#config.onCreateConnection(this.#connection)
    }
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    // SQLite only has one single connection. We use a mutex here to wait
    // until the single connection has been released.
    await this.#connectionMutex.lock()
    return this.#connection!
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('begin'))
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('commit'))
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('rollback'))
  }

  async releaseConnection(): Promise<void> {
    this.#connectionMutex.unlock()
  }

  async destroy(): Promise<void> {
    this.#db = undefined
    // this.#db?.close()
  }
}

class SqliteTauriConnection implements DatabaseConnection {
  readonly #db: Database

  constructor(db: Database) {
    this.#db = db
  }

  async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    const { sql, parameters } = compiledQuery

    console.log('execute', sql, parameters)
    let callMethod: 'all' | 'run'
    switch (sql.split(' ')[0]) {
      case 'insert':
      case 'update':
        callMethod = sql.includes('returning') ? 'all' : 'run'
        break
      case 'counter':
      case 'del':
        callMethod = 'run'
        break
      default:
        callMethod = 'all'
    }

    if (callMethod === 'all') {
      return Promise.resolve({
        rows: (await this.#db.select(sql, parameters as unknown[])) as O[], // stmt.all(parameters) as O[],
      })
    } else {
      const { rowsAffected, lastInsertId } = await this.#db.execute(sql, parameters as unknown[])
      const numAffectedRows =
        rowsAffected !== undefined && rowsAffected !== null ? BigInt(rowsAffected) : undefined
      return Promise.resolve({
        // TODO: remove.
        numUpdatedOrDeletedRows: numAffectedRows,
        numAffectedRows,
        insertId:
          lastInsertId !== undefined && lastInsertId !== null ? BigInt(lastInsertId) : undefined,
        rows: [],
      })
    }
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("Sqlite driver doesn't support streaming")
  }
}

class ConnectionMutex {
  #promise?: Promise<void>
  #resolve?: () => void

  async lock(): Promise<void> {
    while (this.#promise) {
      await this.#promise
    }

    this.#promise = new Promise((resolve) => {
      this.#resolve = resolve
    })
  }

  unlock(): void {
    const resolve = this.#resolve

    this.#promise = undefined
    this.#resolve = undefined

    resolve?.()
  }
}
