import { listen } from '@tauri-apps/api/event'
import { window as tWindow } from '@tauri-apps/api'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTonConnectState } from './store/tonConnect'
import { getPasswordInteractive } from './store/passwordManager'

export function useTauriEventListener() {
  const navigate = useNavigate()
  const tonConnectState = useTonConnectState()

  useEffect(() => {
    const unlisten = listen('single-instance', async ({ event, payload, ...eventObj }) => {
      console.log('single listen', event, payload, eventObj)

      if (!payload) {
        return
      }

      const args = (
        payload as {
          args: string[]
        }
      ).args

      if (args.length < 2) {
        return
      }

      const urlArg = args[1]
      if (!urlArg.startsWith('--url=tondevwallet://connect/')) {
        return
      }

      tWindow.appWindow.setFocus()

      if (urlArg === '--url=tondevwallet://connect/?ret=back') {
        navigate('/')
        return
      }

      console.log('args', args)

      const password = await getPasswordInteractive()

      if (password) {
        tonConnectState.connectArg.set(urlArg)
        tonConnectState.popupOpen.set(true)
      }
    })

    return () => {
      unlisten.then((f) => f())
    }
  }, [])
}
