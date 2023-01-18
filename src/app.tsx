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
import { invoke } from '@tauri-apps/api'

function numberToRgba(x: number) {
  return [(x >> 24) & 0xff, (x >> 16) & 0xff, (x >> 8) & 0xff, (x & 0xff) / 255]
}

export function App({ db }: { db: Knex }) {
  const connectSessions = useTonConnectSessions()
  const keysList = useWalletListState()
  const tauriState = useTauriState()

  useEffect(() => {
    appWindow.setDecorations(true)
  }, [])

  useEffect(() => {
    setTimeout(async () => {
      const colors = (await invoke('get_system_colors')) as { [key: string]: number }
      console.log('colors', colors)
      const accent = colors.accent as number

      const [r, g, b, a] = numberToRgba(accent)
      console.log('accent', r, g, b, a)

      const root = document.documentElement
      for (const key of Object.keys(colors)) {
        if (colors[key]) {
          const cssKey = key.replace(/_/, '-')
          const [r, g, b, a] = numberToRgba(colors[key])
          root.style.setProperty(`--color-${cssKey}`, `rgba(${r}, ${g}, ${b}, ${a})`)
          root.style.setProperty(`--color-${cssKey}-rgb`, `${r} ${g} ${b}`)
        }
      }
    }, 1)
  }, [])

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
