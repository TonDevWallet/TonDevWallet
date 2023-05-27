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

      let startString: string

      if (typeof payload === 'string') {
        startString = payload
      } else {
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

        startString = urlArg.replace('--url=', '')

        // if (urlArg === '--url=tondevwallet://connect/?ret=back') {
        //   navigate('/')
        //   return
        // }
      }

      if (startString === 'tondevwallet://connect/?ret=back') {
        navigate('/app')
        return
      }

      tWindow.appWindow.setFocus()

      // console.log('args', args)

      const password = await getPasswordInteractive()

      if (password) {
        tonConnectState.connectArg.set(startString)
        tonConnectState.popupOpen.set(true)
      }
    })

    const l2 = listen('scheme-request-received', (e) => {
      console.log('got scheme r', e)
    })

    return () => {
      unlisten.then((f) => f())
      l2.then((f) => f())
    }
  }, [])
}
