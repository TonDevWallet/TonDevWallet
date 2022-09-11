import { createContext, useContext } from 'react'
import Database from 'tauri-plugin-sql-api'

export const DbContext = createContext<Database>(Database.prototype)

export const useDatabase = () => useContext(DbContext)

let globalDb: Database
export const getDatabase = async () => {
  if (globalDb) {
    return globalDb
  }

  const db = await Database.load('sqlite:test.db')
  await initDb(db)
  globalDb = db
  return globalDb
}

async function initDb(db: Database) {
  await db.execute(`
  CREATE TABLE IF NOT EXISTS keys (
    id integer PRIMARY KEY,
    words text,
    seed text,
    wallet_id integer,
    name text
  )`)
}
