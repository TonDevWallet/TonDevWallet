import { listen } from '@tauri-apps/api/event'
import { window as tWindow } from '@tauri-apps/api'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTonConnectState } from './store/tonConnect'
import { getPasswordInteractive } from './store/passwordManager'
import { getMatches } from '@tauri-apps/api/cli'

export function useTauriEventListener() {
  const navigate = useNavigate()
  const tonConnectState = useTonConnectState()

  const doConnect = async (arg: string) => {
    if (arg.startsWith('--url=')) {
      arg.replace('--url=', '')
    }

    if (!arg.startsWith('tondevwallet://connect/')) {
      return
    }

    const startString = arg.replace('--url=', '')

    if (startString === 'tondevwallet://connect/?ret=back') {
      navigate('/app')
      tWindow.appWindow.unminimize()
      tWindow.appWindow.setFocus()
      return
    }

    tWindow.appWindow.unminimize()
    tWindow.appWindow.setFocus()

    const password = await getPasswordInteractive()

    if (password) {
      tonConnectState.connectArg.set(startString)
      tonConnectState.popupOpen.set(true)
    }
  }

  useEffect(() => {
    getMatches().then((matches) => {
      if (matches?.args?.start?.value && typeof matches?.args?.start?.value === 'string') {
        const value = matches.args.start.value
        doConnect(value)
      }
    })
  }, [])

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

        startString = urlArg
      }

      doConnect(startString)
    })

    return () => {
      unlisten.then((f) => f())
    }
  }, [])
}
