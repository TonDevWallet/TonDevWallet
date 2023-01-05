import KnexDb, { Knex } from 'knex'
import { createContext, useContext } from 'react'
import { ImportMigrations } from './utils/getMigrations'
import { ClientSqliteWasm } from './utils/knexSqliteDialect'

const db = KnexDb({
  client: ClientSqliteWasm as any,
  connection: {
    filename: 'sqlite:test.db',
  },
})

export const DbContext = createContext<Knex>(db)

export const useDatabase = () => useContext(DbContext)

export async function InitDB() {
  await db.migrate.latest({
    migrationSource: new ImportMigrations(),
  })
}

let waiting: Promise<void> | undefined

export async function getDatabase() {
  if (!waiting) {
    waiting = InitDB()
  }
  await waiting

  return db
}
