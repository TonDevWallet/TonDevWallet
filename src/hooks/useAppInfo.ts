import { invoke } from '@tauri-apps/api'
import { getVersion } from '@tauri-apps/api/app'
import { useState, useEffect } from 'react'

export const useAppInfo = () => {
  const [os, setOs] = useState<string>('')
  const [version, setVersion] = useState('')

  useEffect(() => {
    ;(async () => {
      setOs(await invoke('get_os_name'))
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      setVersion(await getVersion())
    })()
  }, [])

  return {
    os,
    version,
  }
}
