import { createContext, useContext } from 'react'
import { appDataDir, BaseDirectory } from '@tauri-apps/api/path'
import { removeFile, exists, createDir } from '@tauri-apps/api/fs'
import { Kysely, Migrator, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely'
import Database from 'tauri-plugin-sql-api'
import { SqliteTauriDriver } from './utils/kysely/kyselySqliteDriver'
import { StaticMigrationProvider } from './utils/kysely/migrationProvider'
import { Key } from './types/Key'
import { SavedWallet } from './types'
import { ConnectSession, ConnectMessageTransaction } from './types/connect'

const dataDir = await appDataDir()

export interface DbTypes {
  keys: Key
  wallets: SavedWallet
  connect_sessions: ConnectSession
  connect_message_transactions: ConnectMessageTransaction
}

export type DB = Kysely<DbTypes>

const db = new Kysely<DbTypes>({
  dialect: {
    createAdapter() {
      return new SqliteAdapter()
    },
    createDriver() {
      return new SqliteTauriDriver({
        database: Database.get(`sqlite:${dataDir}/databases/data.db`),
      })
    },
    createIntrospector(db: Kysely<unknown>) {
      return new SqliteIntrospector(db)
    },
    createQueryCompiler() {
      return new SqliteQueryCompiler()
    },
  },
})

// const oldDb = KnexDb({
//   client: ClientSqliteWasm as any,
//   connection: {
//     filename: 'sqlite:test.db',
//   },
// })

export const DbContext = createContext<Kysely<DbTypes>>(db)

export const useDatabase = () => useContext(DbContext)

export async function InitDB() {
  try {
    await checkFs()

    const migrator = new Migrator({
      db,
      provider: new StaticMigrationProvider(),
    })
    console.log('before migrate')
    await migrator.migrateToLatest()
    console.log('after migrate')
    // await db.migrate.latest({
    //   migrationSource: new ImportMigrations(),
    // })
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
