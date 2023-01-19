import { invoke } from '@tauri-apps/api'
import { useState, useEffect } from 'react'

export const useOs = () => {
  const [os, setOsValue] = useState<string>('')

  const setOs = (v: string) => {
    setOsValue(v)
    document.documentElement.classList.add(v)
  }

  useEffect(() => {
    ;(async () => {
      setOs(await invoke('get_os_name'))
    })()
  }, [])

  return os
}
