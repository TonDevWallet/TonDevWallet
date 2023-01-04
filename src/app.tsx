import { IndexPage } from '@/components/IndexPage/IndexPage'
import { suspend } from '@hookstate/core'
import React from 'react'
import Database from 'tauri-plugin-sql-api'
import { LiteClient } from 'ton-lite-client'

import { DbContext } from './db'
import { LiteClientContext } from './liteClient'
import { useWallet } from './store/walletState'

export function App({ db, liteClient }: { db: Database; liteClient: LiteClient }) {
  const wallet = useWallet()

  return (
    <LiteClientContext.Provider value={liteClient}>
      <DbContext.Provider value={db}>
        <React.Suspense>{suspend(wallet) || <IndexPage />}</React.Suspense>
      </DbContext.Provider>
    </LiteClientContext.Provider>
  )
}
