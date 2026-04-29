import Database, { QueryResult } from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'
import { appDataDir, BaseDirectory } from '@tauri-apps/api/path'
import { remove, exists, mkdir } from '@tauri-apps/plugin-fs'
import { createContext, useContext } from 'react'

export type SqlValue = string | number | boolean | Date | null | undefined
export type SqlParams = SqlValue[]
export type ExecuteResult = QueryResult

export interface SqlConnection {
  select<T>(sql: string, bindings?: SqlParams): Promise<T[]>
  first<T>(sql: string, bindings?: SqlParams): Promise<T | undefined>
  execute(sql: string, bindings?: SqlParams): Promise<ExecuteResult>
}

type DbClientContext = {
  clientId: number
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

export class AppDatabaseClient implements SqlConnection {
  private readonly context: DbClientContext
  private released = false

  constructor(context: DbClientContext) {
    this.context = context
  }

  private assertActive() {
    if (this.released) {
      throw new Error('Database client has been released')
    }
  }

  select<T>(sql: string, bindings?: SqlParams): Promise<T[]> {
    this.assertActive()
    return invoke<T[]>('db_client_select', {
      context: this.context,
      sql,
      values: normalizeBindings(bindings),
    })
  }

  async first<T>(sql: string, bindings?: SqlParams): Promise<T | undefined> {
    const rows = await this.select<T>(sql, bindings)
    return rows[0]
  }

  execute(sql: string, bindings?: SqlParams): Promise<ExecuteResult> {
    this.assertActive()
    return invoke<ExecuteResult>('db_client_execute', {
      context: this.context,
      sql,
      values: normalizeBindings(bindings),
    })
  }

  async release(): Promise<void> {
    if (this.released) {
      return
    }

    try {
      await invoke('db_release_client', { context: this.context })
    } finally {
      this.released = true
    }
  }

  close(): Promise<void> {
    return this.release()
  }
}

export class AppDatabase implements SqlConnection {
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

  async connect(): Promise<AppDatabaseClient> {
    const context = await invoke<DbClientContext>('db_acquire_client')
    return new AppDatabaseClient(context)
  }

  getClient(): Promise<AppDatabaseClient> {
    return this.connect()
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

export async function getDatabaseClient() {
  const database = await getDatabase()
  return database.connect()
}
