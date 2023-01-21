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

export function App({ db }: { db: Knex }) {
  const connectSessions = useTonConnectSessions()
  const keysList = useWalletListState()
  const tauriState = useTauriState()
  useTheme()
  useOs()

  useEffect(() => {
    appWindow.setDecorations(true)
  }, [])

  // useEffect(() => {
  //   setTimeout(async () => {

  //   }, 1)
  // }, [])

  return (
    <DbContext.Provider value={db}>
      <React.Suspense>
        {suspend(tauriState) || suspend(connectSessions) || suspend(keysList) || (
          <RouterProvider router={router} />
        )}
        {/* {suspend(wallet) || <IndexPage />} */}
      </React.Suspense>
    </DbContext.Provider>
  )
}
