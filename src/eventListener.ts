import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTonConnectState } from './store/tonConnect'
import { getPasswordInteractive } from './store/passwordManager'
import { getMatches } from '@tauri-apps/plugin-cli'
import { getWallets } from './store/walletsListState'
import { getWalletFromKey } from './utils/wallets'
import { LiteClientState } from './store/liteClient'
import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification'
import { addConnectMessage } from './store/connectMessages'
import { Address } from '@ton/core'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'

const appWindow = getCurrentWebviewWindow()

export function useTauriEventListener() {
  const navigate = useNavigate()
  const tonConnectState = useTonConnectState()

  const doConnect = async (arg: string) => {
    console.log('doConnect', arg)
    if (arg.startsWith('--url=')) {
      arg.replace('--url=', '')
    }

    if (arg.startsWith('tondevwallet://trace/')) {
      console.log('trace', arg)
      // const traceId = arg.replace('tondevwallet://trace/', '')
      // navigate('/app/tracer', { state: { traceId } })
      return
    }

    if (!arg.startsWith('tondevwallet://connect/')) {
      return
    }

    const startString = arg.replace('--url=', '')

    if (startString === 'tondevwallet://connect/?ret=back') {
      navigate('/app')
      appWindow.unminimize()
      appWindow.setFocus()
      return
    }

    appWindow.unminimize()
    appWindow.setFocus()

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
    const unlisten = onOpenUrl(async (urls: string[]) => {
      console.log('deep link:', urls)

      if (!urls || urls.length === 0) {
        return
      }

      const payload = urls[0]

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

  useEffect(() => {
    const unlisten = listen('proxy_transaction', async ({ payload }) => {
      const liteClient = LiteClientState.liteClient.get({ noproxy: true })
      if (!payload) {
        return
      }

      const data = payload as any
      if (data.msg_type !== 'proxy_transaction') {
        return
      }

      if (data?.data?.method !== 'sendTransaction') {
        return
      }

      const info = JSON.parse(data.data.params[0]) as {
        messages: {
          address: string
          amount: string
          payload?: string // boc
          stateInit?: string
        }[]
        valid_until: number // date now
        from: string
      }

      const fromAddress = Address.parse(info.from).toRawString()
      const keys = await getWallets()

      let keyId: number | undefined
      let walletId: number | undefined

      for (const key of keys) {
        for (const wallet of key.wallets || []) {
          if (typeof walletId !== 'undefined') {
            break
          }
          const tonWallet = getWalletFromKey(liteClient, key, wallet)
          if (tonWallet?.address.toRawString() === fromAddress) {
            keyId = key.id
            walletId = wallet.id
            break
          }
        }
      }

      if (typeof keyId === 'undefined' || typeof walletId === 'undefined') {
        console.log('no key or wallet found')
        return
      }

      await addConnectMessage({
        connect_event_id: 0,
        connect_session_id: 0,
        payload: info,
        key_id: keyId,
        wallet_id: walletId,
        status: 0,
        wallet_address: fromAddress,
      })
      appWindow.unminimize()
      appWindow.setFocus()

      let permissionGranted = await isPermissionGranted()
      if (!permissionGranted) {
        const permission = await requestPermission()
        permissionGranted = permission === 'granted'
      }
      if (permissionGranted) {
        sendNotification({ title: 'New message', body: `From Extension` })
      }
    })

    return () => {
      unlisten.then((f) => f())
    }
  }, [])
}
