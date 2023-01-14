import { addConnectMessage } from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
import { updateSessionEventId, useTonConnectSessions } from '@/store/tonConnect'
import {
  Base64,
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

export function TonConnectListener() {
  const sessions = useTonConnectSessions()
  const liteClient = useLiteclient() as unknown as LiteClient

  useEffect(() => {
    const bridgeUrl = 'https://bridge.tonapi.io/bridge'
    const listeners: EventSource[] = []

    // sessions.map
    for (const s of sessions.get()) {
      console.log('listen to s', s)
      const keyPair = nacl.box.keyPair.fromSecretKey(s.secretKey)
      const session = new SessionCrypto({
        publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
        secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
      })

      const sseUrl = new URL(`${bridgeUrl}/events`)
      sseUrl.searchParams.append('client_id', Buffer.from(keyPair.publicKey).toString('hex'))
      sseUrl.searchParams.append('last_event_id', s.lastEventId.toString())
      // url.searchParams.append('to', clientId)
      // url.searchParams.append('ttl', '300')
      const sse = new EventSource(sseUrl)

      sse.addEventListener('message', async (e) => {
        console.log('sse message2', e.data)

        const bridgeIncomingMessage = JSON.parse(e.data)
        const walletMessage: SendTransactionRpcRequest = JSON.parse(
          session.decrypt(
            Base64.decode(bridgeIncomingMessage.message).toUint8Array(),
            hexToByteArray(bridgeIncomingMessage.from)
          )
        )
        console.log('wallet message', walletMessage)

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
          connect_session_id: s.id,
          payload: info,
          key_id: s.keyId,
          wallet_id: s.walletId,
          status: 0,
        })
        let permissionGranted = await isPermissionGranted()
        if (!permissionGranted) {
          const permission = await requestPermission()
          permissionGranted = permission === 'granted'
        }
        if (permissionGranted) {
          sendNotification({ title: 'New message', body: `From ${s.name}` })
        }

        console.log('update before', e)
        updateSessionEventId(s.id, parseInt(e.lastEventId))
      })

      listeners.push(sse)
    }

    // setListeners(listeners)

    return () => {
      for (const listener of listeners) {
        listener.close()
      }
    }
  }, [liteClient, sessions])
  return <></>
}
