import { IndexPage } from '@/components/IndexPage/IndexPage'
import { suspend } from '@hookstate/core'
import { Knex } from 'knex'
import React from 'react'
import Database from 'tauri-plugin-sql-api'

import { DbContext } from './db'
// import { LiteClientContext } from './liteClient'
import { useWallet } from './store/walletState'

export function App({ db }: { db: Knex }) {
  const wallet = useWallet()

  return (
    <DbContext.Provider value={db}>
      <React.Suspense>{suspend(wallet) || <IndexPage />}</React.Suspense>
    </DbContext.Provider>
  )
}
