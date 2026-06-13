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
  SEND_TRANSACTION_ERROR_CODES,
  SendTransactionRpcRequest,
  SendTransactionRpcResponseError,
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
  bridgeUrl,
  GetTransfersFromTCMessage,
  sendTonConnectMessage,
} from '@/utils/tonConnect'
import { ConnectMessageTransactionMessage } from '@/types/connect'
import { secretKeyToED25519, secretKeyToX25519 } from '@/utils/ed25519'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { detectW5PluginInstallation } from '@/utils/detectW5Plugin'
const appWindow = getCurrentWebviewWindow()

// TonConnect v3 signMessage request (not present in @tonconnect/protocol 2.x typings)
interface SignMessageRpcRequest {
  method: 'signMessage'
  params: [string] // JSON string of the same shape as sendTransaction
  id: string
}

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

      const sseUrl = new URL(`${bridgeUrl}/events`)
      sseUrl.searchParams.append('client_id', Buffer.from(keyPair.publicKey).toString('hex'))
      const lastEventId = s.lastEventId.get().toString()
      if (lastEventId && lastEventId !== '0') {
        sseUrl.searchParams.append('last_event_id', lastEventId)
      }
      // url.searchParams.append('to', clientId)
      // url.searchParams.append('ttl', '300')
      const sse = new EventSource(sseUrl)

      sse.addEventListener('message', async (e) => {
        const bridgeIncomingMessage = JSON.parse(e.data)
        const walletMessage:
          | SendTransactionRpcRequest
          | DisconnectRpcRequest
          | SignDataRpcRequest
          | SignMessageRpcRequest = JSON.parse(
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
          return
        }

        if (walletMessage.method === 'signMessage') {
          await handleSignMessageRequest({
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

async function handleSignMessageRequest({
  walletMessage,
  session,
  eventData,
  liteClient,
}: {
  walletMessage: SignMessageRpcRequest
  session: TonConnectSession
  eventData: { lastEventId: string }
  liteClient: LiteClient
}) {
  try {
    const info = JSON.parse(walletMessage.params[0]) as {
      messages?: ConnectMessageTransactionMessage[]
      items?: unknown[]
      valid_until: number
    }

    await updateSessionEventId(session.id, parseInt(eventData.lastEventId))

    // Structured items are not supported, only raw messages
    if (!info.messages || info.items) {
      const msg: SendTransactionRpcResponseError = {
        id: walletMessage.id,
        error: {
          code: SEND_TRANSACTION_ERROR_CODES.BAD_REQUEST_ERROR,
          message: 'Only raw messages are supported',
        },
      }
      await sendTonConnectMessage(msg, session.secretKey, session.userId)
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

        // signMessage requires building a signed internal message, which is wallet specific
        if (!tonWallet?.getSignedInternalCell) {
          const msg: SendTransactionRpcResponseError = {
            id: walletMessage.id,
            error: {
              code: SEND_TRANSACTION_ERROR_CODES.METHOD_NOT_SUPPORTED,
              message: `signMessage is not supported for ${wallet.type} wallets`,
            },
          }
          await sendTonConnectMessage(msg, session.secretKey, session.userId)
          return
        }
      }
    }

    await addConnectMessage({
      message_type: 'signMessage',
      connect_event_id: parseInt(walletMessage.id),
      connect_session_id: session.id,
      payload: {
        messages: info.messages,
        valid_until: info.valid_until,
      },
      key_id: session.keyId,
      wallet_id: session.walletId,
      status: 0,
      wallet_address: walletAddress,
    })
    appWindow.unminimize()
    appWindow.setFocus()
  } catch (e) {
    console.log('Error during handling of sign message request', e)
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
  let walletType: string | undefined
  const keys = getWalletListState()

  const key = keys.find((k) => k.id.get() === session.keyId)
  if (key) {
    const wallet = key.wallets.get()?.find((w) => w.id === session.walletId)
    if (wallet) {
      walletType = wallet.type
      const tonWallet = getWalletFromKey(liteClient, key.get(), wallet)
      walletAddress = tonWallet?.address.toRawString()
    }
  }

  await updateSessionEventId(session.id, parseInt(eventData.lastEventId))

  // Detect W5R1 plugin installation
  if (walletType) {
    const pluginDetection = detectW5PluginInstallation(info.messages, walletType)
    if (pluginDetection.isPluginInstall) {
      await addConnectMessage({
        connect_event_id: parseInt(walletMessage.id),
        connect_session_id: session.id,
        key_id: session.keyId,
        wallet_id: session.walletId,
        status: 0,
        wallet_address: walletAddress,
        message_type: 'addW5R1Plugin',
        plugin_address: pluginDetection.pluginAddress?.toString() ?? undefined,
        plugins_to_remove: pluginDetection.pluginsToRemove.map((addr) => addr.toString()),
      })
      appWindow.unminimize()
      appWindow.setFocus()
      return
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

  const blockchainClient = LiteClientState.liteClient.get() ?? LiteClientState.tonapiAdapter.get()
  if (!blockchainClient) return false
  const keyPair = secretKeyToED25519(decryptedData?.seed || Buffer.from([]))
  const sendWallet = getWalletFromKey(blockchainClient, key, wallet)
  if (!sendWallet) {
    return false
  }
  const messageCell = await sendWallet.getExternalMessageCell(keyPair, transfers)
  updateSessionEventId(session.id, parseInt(bridgeEventId))

  await ApproveTonConnectMessageTransaction({
    liteClient: blockchainClient,
    messageCell,
    session,
    eventId,
  })
  return true
}
