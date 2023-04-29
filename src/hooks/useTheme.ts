import { invoke } from '@tauri-apps/api'
import { appWindow, Theme } from '@tauri-apps/api/window'
import { useState, useEffect } from 'react'

function numberToRgba(x: number) {
  return [(x >> 24) & 0xff, (x >> 16) & 0xff, (x >> 8) & 0xff, (x & 0xff) / 255]
}

async function setColors() {
  const colors = (await invoke('get_system_colors')) as { [key: string]: number }

  const root = document.documentElement
  for (const key of Object.keys(colors)) {
    if (colors[key]) {
      const [r, g, b, a] = numberToRgba(colors[key])

      const cssKey = key.replace(/_/g, '-')

      root.style.setProperty(`--color-${cssKey}`, `rgba(${r}, ${g}, ${b}, ${a})`)
      root.style.setProperty(`--color-${cssKey}-rgb`, `${r} ${g} ${b}`)
    }
  }
}

export const useTheme = () => {
  const [theme, setThemeValue] = useState<Theme>('light')

  const setTheme = (v: Theme) => {
    setThemeValue(v)
    if (v === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  useEffect(() => {
    let unlisten: () => void | undefined
    ;(async () => {
      setTheme((await appWindow.theme()) || 'light')
      setColors()

      unlisten = await appWindow.onThemeChanged(({ payload: theme }) => {
        console.log(`theme changed to ${theme}`)
        setTheme(theme)
        setColors()
      })
    })()

    return () => {
      if (unlisten != null) {
        unlisten()
      }
    }
  }, [])

  return theme
}
