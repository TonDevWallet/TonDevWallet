import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Theme } from '@tauri-apps/api/window'
import { useState, useEffect } from 'react'
import useLocalStorageState from 'use-local-storage-state'
const appWindow = getCurrentWebviewWindow()

export const useTheme = (): [Theme, (v: Theme) => void] => {
  const [theme, setThemeValue] = useState<Theme>('light')
  const [localTheme, setLocalTheme] = useLocalStorageState<Theme>('theme')

  const setTheme = (v: Theme, saveLocal = true) => {
    setThemeValue(v)
    if (saveLocal) {
      setLocalTheme(v)
    }
    if (v === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  useEffect(() => {
    if (localTheme) {
      setTheme(localTheme)
    }
  }, [localTheme])

  useEffect(() => {
    let unlisten: () => void | undefined
    ;(async () => {
      if (!localTheme) {
        setTheme((await appWindow.theme()) || 'light', false)
      }

      unlisten = await appWindow.onThemeChanged(({ payload: theme }) => {
        if (localTheme) {
          return
        }
        console.log(`theme changed to ${theme}`)
        setTheme(theme, false)
      })
    })()

    return () => {
      if (unlisten != null) {
        unlisten()
      }
    }
  }, [theme])

  return [theme, setTheme]
}
