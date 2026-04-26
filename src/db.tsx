import Database, { QueryResult } from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'
import { appDataDir, BaseDirectory } from '@tauri-apps/api/path'
import { remove, exists, mkdir } from '@tauri-apps/plugin-fs'
import { createContext, useContext } from 'react'

export type SqlValue = string | number | boolean | Date | null | undefined
export type SqlParams = SqlValue[]
export type ExecuteResult = QueryResult
export type TransactionStatement = {
  sql: string
  bindings?: SqlParams
  returnRows?: boolean
  expectedRowsAffected?: number
}

type NativeTransactionStatement = {
  sql: string
  values: ReturnType<typeof normalizeBindings>
  returnRows?: boolean
  expectedRowsAffected?: number
}

function normalizeBindings(bindings: SqlParams = []) {
  return bindings.map((binding) => {
    if (binding instanceof Date) {
      return binding.valueOf()
    }

    if (typeof binding === 'boolean') {
      return Number(binding)
    }

    return binding ?? null
  })
}

class AppDatabaseTransaction {
  readonly statements: TransactionStatement[] = []

  async execute(sql: string, bindings?: SqlParams): Promise<ExecuteResult> {
    this.statements.push({ sql, bindings })
    return { rowsAffected: 0 }
  }

  select<T>(): Promise<T[]> {
    return Promise.reject(
      new Error('Transactional SELECT is not supported; read before executeTransaction')
    )
  }

  first<T>(): Promise<T | undefined> {
    return Promise.reject(
      new Error('Transactional SELECT is not supported; read before executeTransaction')
    )
  }
}

export class AppDatabase {
  private readonly connection: Database

  constructor(connection: Database) {
    this.connection = connection
  }

  select<T>(sql: string, bindings?: SqlParams): Promise<T[]> {
    return this.connection.select<T[]>(sql, normalizeBindings(bindings))
  }

  async first<T>(sql: string, bindings?: SqlParams): Promise<T | undefined> {
    const rows = await this.select<T>(sql, bindings)
    return rows[0]
  }

  execute(sql: string, bindings?: SqlParams): Promise<ExecuteResult> {
    return this.connection.execute(sql, normalizeBindings(bindings))
  }

  async executeTransaction<T = unknown>(statements: TransactionStatement[]): Promise<T[][]> {
    if (statements.length === 0) {
      return []
    }

    const nativeStatements: NativeTransactionStatement[] = statements.map((statement) => ({
      sql: statement.sql,
      values: normalizeBindings(statement.bindings),
      returnRows: statement.returnRows,
      expectedRowsAffected: statement.expectedRowsAffected,
    }))

    return invoke<T[][]>('db_transaction', { statements: nativeStatements })
  }

  async transaction<T>(callback: (tx: AppDatabaseTransaction) => Promise<T>): Promise<T> {
    const tx = new AppDatabaseTransaction()
    const result = await callback(tx)
    await this.executeTransaction(tx.statements)
    return result
  }

  close() {
    return this.connection.close()
  }
}

let db: AppDatabase

export const DbContext = createContext<AppDatabase>(null as any)

export const useDatabase = () => useContext(DbContext)

export async function InitDB() {
  try {
    const dataDir = await appDataDir()

    await checkFs()

    const connection = await Database.load(`sqlite:${dataDir}/databases/data.db`)
    db = new AppDatabase(connection)
  } catch (e) {
    console.log('database init error', e)
    throw e
  }
}

async function checkFs() {
  const cleanFiles = ['test.db', 'test.db-shm', 'test.db-wal']
  for (const file of cleanFiles) {
    const testDbExists = await exists(file, { baseDir: BaseDirectory.AppData })
    if (testDbExists) {
      await remove(file)
    }
  }

  if (!(await exists('databases', { baseDir: BaseDirectory.AppData }))) {
    await mkdir('databases', { baseDir: BaseDirectory.AppData, recursive: true })
  }
}

let waiting: Promise<void> | undefined

export async function getDatabase() {
  if (!waiting) {
    waiting = InitDB()
  }
  await waiting

  return db
}
