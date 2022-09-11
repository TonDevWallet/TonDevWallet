import { IndexPage } from '@/components/IndexPage/IndexPage'
import Database from 'tauri-plugin-sql-api'
import { LiteClient } from 'ton-lite-client'

import { DbContext } from './db'
import { LiteClientContext } from './liteClient'

export function App({ db, liteClient }: { db: Database; liteClient: LiteClient }) {
  return (
    <LiteClientContext.Provider value={liteClient}>
      <DbContext.Provider value={db}>
        <IndexPage />
      </DbContext.Provider>
    </LiteClientContext.Provider>
  )
}
