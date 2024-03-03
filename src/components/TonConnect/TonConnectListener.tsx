import { addConnectMessage } from '@/store/connectMessages'
import { LiteClientState, useLiteclient } from '@/store/liteClient'
import {
  TonConnectSession,
  deleteTonConnectSession,
  updateSessionEventId,
  useTonConnectSessions,
  useTonConnectState,
} from '@/store/tonConnect'
import {
  Base64,
  ConnectRequest,
  DisconnectRpcRequest,
  hexToByteArray,
  SendTransactionRpcRequest,
  SessionCrypto,
} from '@tonconnect/protocol'
import { useEffect } from 'react'
import { LiteClient } from 'ton-lite-client'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/api/notification'
import { appWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api'
import { decryptWalletData, getPassword, getPasswordInteractive } from '@/store/passwordManager'
import { getWalletListState } from '@/store/walletsListState'
import { ImmutableObject } from '@hookstate/core'
import { getWalletFromKey } from '@/utils/wallets'
import { ApproveTonConnectMessage, GetTransfersFromTCMessage } from '@/utils/tonConnect'
import { ConnectMessageTransactionMessage } from '@/types/connect'
import { secretKeyToED25519, secretKeyToX25519 } from '@/utils/ed25519'

export function TonConnectListener() {
  const sessions = useTonConnectSessions()
  const liteClient = useLiteclient() as unknown as LiteClient
  const tonConnectState = useTonConnectState()

  useEffect(() => {
    const listener = (event: ClipboardEvent) => {
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
        } else if (item.kind === 'string' && item.type === 'text/plain') {
          item.getAsString(async (pastedString: string) => {
            if (
              !pastedString ||
              !pastedString.includes('id') ||
              !pastedString.includes('manifestUrl')
            ) {
              return
            }
            try {
              const input = pastedString
              const parsed = new URL(input)

              const clientId = parsed.searchParams.get('id') || '' // '230f1e4df32364888a5dbd92a410266fcb974b73e30ff3e546a654fc8ee2c953'
              const rString = parsed.searchParams.get('r')
              const r = rString ? (JSON.parse(rString) as ConnectRequest) : undefined
              if (r?.manifestUrl && clientId) {
                const password = await getPasswordInteractive()
                if (password) {
                  tonConnectState.connectArg.set(input)
                  tonConnectState.popupOpen.set(true)
                }
              }
            } catch (e) {
              // it's ok
            }
          })
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
      const keyPair = secretKeyToX25519(s.secretKey.get())
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

        const isAutoSend = await autoSendMessage({
          session: s.get(),
          messages: info.messages,
          eventId: walletMessage.id,
          bridgeEventId: e.lastEventId,
        })

        if (isAutoSend) {
          return
        }

        await addConnectMessage({
          connect_event_id: parseInt(walletMessage.id),
          connect_session_id: s.id.get(),
          payload: info,
          key_id: s.keyId.get(),
          wallet_id: s.walletId.get(),
          status: 0,
        })
        appWindow.unminimize()
        appWindow.setFocus()

        let permissionGranted = await isPermissionGranted()
        if (!permissionGranted) {
          const permission = await requestPermission()
          permissionGranted = permission === 'granted'
        }
        if (permissionGranted) {
          sendNotification({ title: 'New message', body: `From ${s.name.get()}` })
        }

        updateSessionEventId(s.id.get(), parseInt(e.lastEventId))
      })

      listeners.push(sse)

      return null
    })

    return () => {
      for (const listener of listeners) {
        listener.close()
      }
    }
  }, [liteClient, sessions])
  return <></>
}

async function autoSendMessage({
  session,
  messages,
  eventId,
  bridgeEventId,
}: {
  session: ImmutableObject<TonConnectSession>
  messages: ConnectMessageTransactionMessage[]
  eventId: string
  bridgeEventId: string
}): Promise<boolean> {
  const password = getPassword()
  if (!session.autoSend || !password) {
    return false
  }
  const walletsState = getWalletListState()
  const key = walletsState.find((k) => k.id.get() === session.keyId)?.get()
  if (!key) {
    return false
  }

  const wallet = key.wallets?.find((w) => w.id === session.walletId)
  if (!wallet) {
    return false
  }
  const decryptedData = await decryptWalletData(password, key.encrypted)

  const transfers = GetTransfersFromTCMessage(messages)

  const liteClient = LiteClientState.liteClient.get()
  const keyPair = secretKeyToED25519(decryptedData?.seed || Buffer.from([]))
  const sendWallet = getWalletFromKey(liteClient, key, wallet)
  if (!sendWallet) {
    return false
  }
  const messageCell = await sendWallet.getExternalMessageCell(keyPair, transfers)
  updateSessionEventId(session.id, parseInt(bridgeEventId))

  await ApproveTonConnectMessage({ liteClient, messageCell, session, eventId })
  return true
}
