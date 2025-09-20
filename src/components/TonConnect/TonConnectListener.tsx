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
  SignDataPayload,
  SignDataRpcRequest,
} from '@tonconnect/protocol'
import { useEffect } from 'react'
import { LiteClient } from 'ton-lite-client'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { invoke } from '@tauri-apps/api/core'
import { decryptWalletData, getPassword, getPasswordInteractive } from '@/store/passwordManager'
import { getWalletListState } from '@/store/walletsListState'
import { ImmutableObject } from '@hookstate/core'
import { getWalletFromKey } from '@/utils/wallets'
import {
  ApproveTonConnectMessageTransaction,
  GetTransfersFromTCMessage,
  TonConnectBridgeUrl,
} from '@/utils/tonConnect'
import { ConnectMessageTransactionMessage } from '@/types/connect'
import { secretKeyToED25519, secretKeyToX25519, decodeRequestSource } from '@/utils/ed25519'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
const appWindow = getCurrentWebviewWindow()

export const RequestInfoMap = new Map<string, any>()

export function TonConnectListener() {
  const sessions = useTonConnectSessions()
  const liteClient = useLiteclient() as unknown as LiteClient
  const tonConnectState = useTonConnectState()
  const navigate = useNavigate()

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
            // debugger
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
            if (pastedString.includes('tondevwallet://trace/')) {
              const traceId = pastedString.split('tondevwallet://trace/')[1]
              console.log('traceId', pastedString, traceId)
              if (traceId) {
                navigate('/app/tracer', { state: { traceId } })
              }
              return
            }
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
  }, [navigate])

  useEffect(() => {
    const unlisten = listen('tonconnect_svg', async ({ payload }) => {
      const imageBase64 = (payload as any).data.image as string
      const res = (await invoke('detect_qr_code_from_image', {
        data: imageBase64,
      })) as string[]

      if (res.length > 0) {
        console.log('Found QR code', res)

        const password = await getPasswordInteractive()
        if (password) {
          tonConnectState.connectArg.set(res[0])
          tonConnectState.popupOpen.set(true)
        }
      }
    })

    return () => {
      unlisten.then((f) => f())
    }
  }, [])

  useEffect(() => {
    const listeners: EventSource[] = []

    sessions.map((s) => {
      const keyPair = secretKeyToX25519(s.secretKey.get())
      const session = new SessionCrypto({
        publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
        secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
      })

      const sseUrl = new URL(`${TonConnectBridgeUrl}/events`)
      sseUrl.searchParams.append('client_id', Buffer.from(keyPair.publicKey).toString('hex'))
      const lastEventId = s.lastEventId.get().toString()
      if (lastEventId && lastEventId !== '0') {
        sseUrl.searchParams.append('last_event_id', lastEventId)
      }
      // url.searchParams.append('to', clientId)
      // url.searchParams.append('ttl', '300')
      const sse = new EventSource(sseUrl)

      sse.addEventListener('message', async (e) => {
        let bridgeIncomingMessage
        try {
          bridgeIncomingMessage = JSON.parse(e.data)
        } catch (e) {
          console.log('Error parsing bridge incoming message', e)
          return
        }
        const walletMessage: SendTransactionRpcRequest | DisconnectRpcRequest | SignDataRpcRequest =
          JSON.parse(
            session.decrypt(
              Base64.decode(bridgeIncomingMessage.message).toUint8Array(),
              hexToByteArray(bridgeIncomingMessage.from)
            )
          )
        console.log('wallet message', walletMessage)

        // base64 of sealed box
        const source = bridgeIncomingMessage.request_source as string

        // Example usage of decoding the request source
        // You'll need the appropriate private key for decryption
        const decryptedSource = decodeRequestSource(
          source,
          Buffer.from(keyPair.publicKey),
          Buffer.from(keyPair.secretKey)
        )
        ;(e as any).decryptedSource = decryptedSource
        RequestInfoMap.set('1', e)

        if (walletMessage.method === 'disconnect') {
          console.log('delete session', s)
          // disconnect
          await deleteTonConnectSession(s)
          return
        }

        if (walletMessage.method === 'sendTransaction') {
          await handleRequestTransactionRequest({
            walletMessage,
            session: s.get({ noproxy: true }),
            eventData: e,
            liteClient,
          })
          return
        }

        if (walletMessage.method === 'signData') {
          await handleSignDataRequest({
            walletMessage,
            session: s.get({ noproxy: true }),
            eventData: e,
            liteClient,
          })
        }
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

async function handleSignDataRequest({
  walletMessage,
  session,
  eventData,
  liteClient,
}: {
  walletMessage: SignDataRpcRequest
  session: TonConnectSession
  eventData: { lastEventId: string }
  liteClient: LiteClient
}) {
  try {
    const payload: SignDataPayload = JSON.parse(walletMessage.params[0])

    const keys = getWalletListState()

    let walletAddress: string | undefined
    const key = keys.find((k) => k.id.get() === session.keyId)
    if (key) {
      const wallet = key.wallets.get()?.find((w) => w.id === session.walletId)
      if (wallet) {
        const tonWallet = getWalletFromKey(liteClient, key.get(), wallet)
        walletAddress = tonWallet?.address.toRawString()
      }
    }

    await addConnectMessage({
      message_type: 'sign',
      connect_event_id: parseInt(walletMessage.id),
      connect_session_id: session.id,
      sign_payload: payload,
      key_id: session.keyId,
      wallet_id: session.walletId,
      status: 0,
      wallet_address: walletAddress,
    })
    appWindow.unminimize()
    appWindow.setFocus()

    updateSessionEventId(session.id, parseInt(eventData.lastEventId))
  } catch (e) {
    console.log('Error during handling of sign data request', e)
  }
}

async function handleRequestTransactionRequest({
  walletMessage,
  session,
  eventData,
  liteClient,
}: {
  walletMessage: SendTransactionRpcRequest
  session: TonConnectSession // Using any for now to accommodate the State wrapper
  eventData: { lastEventId: string }
  liteClient: LiteClient
}) {
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
    session,
    messages: info.messages,
    eventId: walletMessage.id,
    bridgeEventId: eventData.lastEventId,
  })

  if (isAutoSend) {
    return
  }

  let walletAddress: string | undefined
  const keys = getWalletListState()

  const key = keys.find((k) => k.id.get() === session.keyId)
  if (key) {
    const wallet = key.wallets.get()?.find((w) => w.id === session.walletId)
    if (wallet) {
      const tonWallet = getWalletFromKey(liteClient, key.get(), wallet)
      walletAddress = tonWallet?.address.toRawString()
    }
  }

  await addConnectMessage({
    connect_event_id: parseInt(walletMessage.id),
    connect_session_id: session.id,
    payload: info,
    key_id: session.keyId,
    wallet_id: session.walletId,
    status: 0,
    wallet_address: walletAddress,
    message_type: 'tx',
  })
  appWindow.unminimize()
  appWindow.setFocus()

  updateSessionEventId(session.id, parseInt(eventData.lastEventId))
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

  await ApproveTonConnectMessageTransaction({ liteClient, messageCell, session, eventId })
  return true
}
