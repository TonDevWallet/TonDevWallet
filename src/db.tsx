import KnexDb, { Knex } from 'knex'
import { createContext, useContext } from 'react'
import { ImportMigrations } from './utils/getMigrations'
import { ClientSqliteWasm } from './utils/knexSqliteDialect'
import { appDataDir, BaseDirectory } from '@tauri-apps/api/path'
import { removeFile, exists, createDir } from '@tauri-apps/api/fs'

let db: Knex

export const DbContext = createContext<Knex>(null as any)

export const useDatabase = () => useContext(DbContext)

export async function InitDB() {
  try {
    const dataDir = await appDataDir()
    db = KnexDb({
      client: ClientSqliteWasm as any,
      connection: {
        filename: `sqlite:${dataDir}/databases/data.db`,
      },
    })

    await checkFs()

    const migrations = new ImportMigrations()
    await db.migrate.latest({
      migrationSource: migrations,
    })
  } catch (e) {
    console.log('migrate error', e)
    throw e
  }
}

async function checkFs() {
  const cleanFiles = ['test.db', 'test.db-shm', 'test.db-wal']
  for (const file of cleanFiles) {
    const testDbExists = await exists(file, { dir: BaseDirectory.AppData })
    if (testDbExists) {
      await removeFile(file, { dir: BaseDirectory.AppData })
    }
  }

  if (!(await exists('databases', { dir: BaseDirectory.AppData }))) {
    await createDir('databases', { dir: BaseDirectory.AppData })
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
