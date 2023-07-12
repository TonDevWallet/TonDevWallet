import { addConnectMessage } from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
import {
  deleteTonConnectSession,
  updateSessionEventId,
  useTonConnectSessions,
  useTonConnectState,
} from '@/store/tonConnect'
import {
  Base64,
  DisconnectRpcRequest,
  hexToByteArray,
  SendTransactionRpcRequest,
  SessionCrypto,
} from '@tonconnect/protocol'
import { useEffect } from 'react'
import { LiteClient } from 'ton-lite-client'
import nacl from 'tweetnacl'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/api/notification'
import { appWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api'
import { getPasswordInteractive } from '@/store/passwordManager'

export function TonConnectListener() {
  const sessions = useTonConnectSessions()
  const liteClient = useLiteclient() as unknown as LiteClient
  const tonConnectState = useTonConnectState()

  useEffect(() => {
    const listener = (event) => {
      const items = event?.clipboardData?.items
      for (const index in items) {
        const item = items[index]
        if (item.kind === 'file') {
          const blob = item.getAsFile()
          const reader = new FileReader()
          reader.onload = async function (event) {
            if (!event.target?.result) {
              return
            }
            const result = event?.target?.result as string
            const res = (await invoke('detect_qr_code_from_image', {
              data: result.split(',')[1],
            })) as string[]

            if (res.length > 0) {
              console.log('Found QR code', res)

              const password = await getPasswordInteractive()
              if (password) {
                tonConnectState.connectArg.set(res[0])
                tonConnectState.popupOpen.set(true)
              }
            }
          }
          reader.readAsDataURL(blob)
        }
      }
    }
    window.addEventListener('paste', listener)
    return () => {
      window.removeEventListener('paste', listener)
    }
  }, [])

  useEffect(() => {
    const bridgeUrl = 'https://bridge.tonapi.io/bridge'
    const listeners: EventSource[] = []

    sessions.map((s) => {
      const keyPair = nacl.box.keyPair.fromSecretKey(s.secretKey.get())
      const session = new SessionCrypto({
        publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
        secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
      })

      const sseUrl = new URL(`${bridgeUrl}/events`)
      sseUrl.searchParams.append('client_id', Buffer.from(keyPair.publicKey).toString('hex'))
      sseUrl.searchParams.append('last_event_id', s.lastEventId.get().toString())
      // url.searchParams.append('to', clientId)
      // url.searchParams.append('ttl', '300')
      const sse = new EventSource(sseUrl)

      sse.addEventListener('message', async (e) => {
        console.log('sse message', e.data)

        const bridgeIncomingMessage = JSON.parse(e.data)
        const walletMessage: SendTransactionRpcRequest | DisconnectRpcRequest = JSON.parse(
          session.decrypt(
            Base64.decode(bridgeIncomingMessage.message).toUint8Array(),
            hexToByteArray(bridgeIncomingMessage.from)
          )
        )
        console.log('wallet message', walletMessage)

        if (walletMessage.method === 'disconnect') {
          console.log('delete session', s)
          // disconnect
          await deleteTonConnectSession(s)
          return
        }

        if (walletMessage.method !== 'sendTransaction') {
          return
        }

        const info = JSON.parse(walletMessage.params[0]) as {
          messages: {
            address: string
            amount: string
            payload?: string // boc
            stateInit?: string
          }[]
          valid_until: number // date now
        }

        await addConnectMessage({
          connect_event_id: parseInt(walletMessage.id),
          connect_session_id: s.id.get(),
          payload: info,
          key_id: s.keyId.get(),
          wallet_id: s.walletId.get(),
          status: 0,
        })
        let permissionGranted = await isPermissionGranted()
        if (!permissionGranted) {
          const permission = await requestPermission()
          permissionGranted = permission === 'granted'
        }
        if (permissionGranted) {
          sendNotification({ title: 'New message', body: `From ${s.name.get()}` })
          appWindow.setFocus()
        }

        console.log('update before', e)
        updateSessionEventId(s.id.get(), parseInt(e.lastEventId))
      })

      listeners.push(sse)

      return null
    })

    // setListeners(listeners)

    return () => {
      for (const listener of listeners) {
        listener.close()
      }
    }
  }, [liteClient, sessions])
  return <></>
}
