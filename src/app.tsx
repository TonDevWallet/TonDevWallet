import { suspend } from '@hookstate/core'
import { Knex } from 'knex'
import React from 'react'
import { DbContext } from './db'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useTonConnectState } from './store/tonConnect'
import { useWalletListState } from './store/walletsListState'
import { useTauriState } from './store/tauri'
import { useTheme } from './hooks/useTheme'
import { useOs } from './hooks/useOs'
import { usePassword } from './store/passwordManager'
import { useLiteclientState } from './store/liteClient'

export function App({ db }: { db: Knex }) {
  const keysList = useWalletListState()
  const tauriState = useTauriState()
  const passwordState = usePassword()
  const tonConnectState = useTonConnectState()
  const liteClientState = useLiteclientState()

  useTheme()
  useOs()

  return (
    <DbContext.Provider value={db}>
      <React.Suspense>
        {suspend(tauriState) ||
          suspend(keysList) ||
          suspend(passwordState) ||
          suspend(tonConnectState) ||
          suspend(liteClientState) || <RouterProvider router={router} />}
        {/* {suspend(wallet) || <IndexPage />} */}
      </React.Suspense>
    </DbContext.Provider>
  )
}
