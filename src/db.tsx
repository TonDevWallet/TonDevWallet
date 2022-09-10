import { createContext, useContext } from 'react'
import Database from 'tauri-plugin-sql-api'

export const DbContext = createContext<Database>(Database.prototype)

export const useDatabase = () => useContext(DbContext)

export const createDatabase = async () => {
  const db = await Database.load('sqlite:test.db')
  return db
}
