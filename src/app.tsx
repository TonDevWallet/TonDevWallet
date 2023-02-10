import { suspend } from '@hookstate/core'
import { Knex } from 'knex'
import React, { useEffect } from 'react'
import { DbContext } from './db'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useTonConnectSessions } from './store/tonConnect'
import { useWalletListState } from './store/walletsListState'
import { useTauriState } from './store/tauri'
import { appWindow } from '@tauri-apps/api/window'
import { useTheme } from './hooks/useTheme'
import { useOs } from './hooks/useOs'
import { useLiteclientState } from './store/liteClient'
import { usePassword } from './store/passwordManager'

export function App({ db }: { db: Knex }) {
  const connectSessions = useTonConnectSessions()
  const keysList = useWalletListState()
  const tauriState = useTauriState()
  const liteClientState = useLiteclientState()
  const passwordState = usePassword()

  useTheme()
  useOs()

  useEffect(() => {
    appWindow.setDecorations(true)
  }, [])

  return (
    <DbContext.Provider value={db}>
      <React.Suspense>
        {suspend(tauriState) ||
          suspend(connectSessions) ||
          suspend(keysList) ||
          suspend(liteClientState) ||
          suspend(passwordState) || <RouterProvider router={router} />}
        {/* {suspend(wallet) || <IndexPage />} */}
      </React.Suspense>
    </DbContext.Provider>
  )
}
