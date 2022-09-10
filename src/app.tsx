import { IndexPage } from '@/components/IndexPage/IndexPage'
import Database from 'tauri-plugin-sql-api'

import { DbContext } from './db'

export function App({ db }: { db: Database }) {
  return (
    <DbContext.Provider value={db}>
      <IndexPage />
    </DbContext.Provider>
  )
}
