import { suspend } from '@hookstate/core'
import { Knex } from 'knex'
import React from 'react'
import { DbContext } from './db'
import { useWallet } from './store/walletState'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useTonConnectSessions } from './store/tonConnect'

export function App({ db }: { db: Knex }) {
  const wallet = useWallet()
  const connectSessions = useTonConnectSessions()

  return (
    <DbContext.Provider value={db}>
      <React.Suspense>
        {suspend(wallet) || suspend(connectSessions) || <RouterProvider router={router} />}
        {/* {suspend(wallet) || <IndexPage />} */}
      </React.Suspense>
    </DbContext.Provider>
  )
}
