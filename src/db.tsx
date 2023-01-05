import KnexDb, { Knex } from 'knex'
import { createContext, useContext } from 'react'
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
  // const db = useDatabase()
  console.log('knex sql=======', db.select(db.raw(1)).toSQL())
  console.log('knex sql=======', await db.select(db.raw(1)).first())
}

export function getDatabase() {
  return db
}
