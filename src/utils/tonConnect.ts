import { WalletTransfer } from '@/contracts/utils/HighloadWalletTypes'
import {
  TonConnectMessageSign,
  TonConnectMessageTransaction,
  changeConnectMessageStatus,
} from '@/store/connectMessages'
import { TonConnectSession } from '@/store/tonConnect'
import { ConnectMessageStatus, ConnectMessageTransactionMessage } from '@/types/connect'
import { ImmutableArray, ImmutableObject } from '@hookstate/core'
import {
  Base64,
  hexToByteArray,
  SEND_TRANSACTION_ERROR_CODES,
  SendTransactionRpcResponseError,
  SendTransactionRpcResponseSuccess,
  SessionCrypto,
  WalletMessage,
  SignDataRpcResponseSuccess,
} from '@tonconnect/protocol'
import { Address, Cell } from '@ton/core'
import { LiteClient } from 'ton-lite-client'
import { secretKeyToX25519 } from './ed25519'
import { getWalletFromKey } from '@/utils/wallets'
import { SignTonConnectData } from '@/utils/signData/sign'

export const TonConnectBridgeUrl = 'https://bridge.tonapi.io/bridge'
// export const TonConnectBridgeUrl = 'https://local.dev/bridge'

export async function sendTonConnectMessage(
  msg: WalletMessage,
  secretKey: Buffer | Uint8Array,
  clientPublicKey: string
) {
  const sessionKeypair = secretKeyToX25519(secretKey)

  const url = new URL(`${TonConnectBridgeUrl}/message`)
  url.searchParams.append('client_id', Buffer.from(sessionKeypair.publicKey).toString('hex'))
  url.searchParams.append('to', clientPublicKey)
  url.searchParams.append('ttl', '300')

  const sessionCrypto = new SessionCrypto({
    publicKey: Buffer.from(sessionKeypair.publicKey).toString('hex'),
    secretKey: Buffer.from(sessionKeypair.secretKey).toString('hex'),
  })

  const message = sessionCrypto.encrypt(JSON.stringify(msg), hexToByteArray(clientPublicKey))
  await fetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: Base64.encode(message),
  })
}

export async function ApproveTonConnectMessageTransaction({
  messageCell,
  connectMessage,
  session,
  liteClient,
  eventId,
}: {
  messageCell: Cell
  connectMessage?: TonConnectMessageTransaction | ImmutableObject<TonConnectMessageTransaction>
  session?: TonConnectSession | ImmutableObject<TonConnectSession>
  liteClient: LiteClient | ImmutableObject<LiteClient>
  eventId: string
}) {
  await liteClient.sendMessage(messageCell?.toBoc() || Buffer.from(''))

  if (session) {
    const msg: SendTransactionRpcResponseSuccess = {
      id: eventId, // s.connect_event_id.toString(),
      result: messageCell?.toBoc().toString('base64') || '',
    }

    await sendTonConnectMessage(msg, session?.secretKey || Buffer.from(''), session?.userId || '')
  }

  if (connectMessage) {
    await changeConnectMessageStatus(connectMessage.id, ConnectMessageStatus.APPROVED, messageCell)
  }
}

export async function RejectTonConnectMessageTransaction({
  message,
  session,
}: {
  message: TonConnectMessageTransaction | ImmutableObject<TonConnectMessageTransaction>
  session?: TonConnectSession | ImmutableObject<TonConnectSession>
}) {
  if (session) {
    const msg: SendTransactionRpcResponseError = {
      id: message.connect_event_id.toString(),
      error: {
        code: SEND_TRANSACTION_ERROR_CODES.USER_REJECTS_ERROR,
        message: 'User rejected',
      },
    }

    await sendTonConnectMessage(msg, session?.secretKey || Buffer.from(''), session?.userId || '')
  }

  await changeConnectMessageStatus(message.id, ConnectMessageStatus.REJECTED)
}

export async function RejectTonConnectMessageSign({
  message,
  session,
}: {
  message: TonConnectMessageSign | ImmutableObject<TonConnectMessageSign>
  session?: TonConnectSession | ImmutableObject<TonConnectSession>
}) {
  if (session) {
    const msg: SendTransactionRpcResponseError = {
      id: message.connect_event_id.toString(),
      error: {
        code: SEND_TRANSACTION_ERROR_CODES.USER_REJECTS_ERROR,
        message: 'User rejected',
      },
    }

    await sendTonConnectMessage(msg, session?.secretKey || Buffer.from(''), session?.userId || '')
  }

  await changeConnectMessageStatus(message.id, ConnectMessageStatus.REJECTED)
}

export async function ApproveTonConnectMessageSign({
  message,
  session,
  key,
  liteClient,
  walletKeyPair,
}: {
  message: TonConnectMessageSign | ImmutableObject<TonConnectMessageSign>
  session?: TonConnectSession | ImmutableObject<TonConnectSession>
  key: any
  liteClient: LiteClient | ImmutableObject<LiteClient>
  walletKeyPair: { secretKey: Uint8Array | Buffer }
}) {
  let walletAddress: string | undefined
  if (key) {
    const wallet = key.wallets?.find((w: any) => w.id === session?.walletId)
    if (wallet) {
      const tonWallet = getWalletFromKey(liteClient, key, wallet)
      walletAddress = tonWallet?.address.toRawString()
    }
  }

  const signPayload = message.sign_payload

  const sessionUrl = session?.url ?? ''
  const sessionDomain = new URL(sessionUrl).hostname

  const signedData = SignTonConnectData({
    address: walletAddress ?? '',
    domain: sessionDomain,
    payload: signPayload,
    privateKey: Buffer.from(walletKeyPair?.secretKey || Buffer.from([])),
  })

  if (session) {
    const msg: SignDataRpcResponseSuccess = {
      result: {
        ...signedData,
      },
      id: message.connect_event_id.toString(),
    }
    await sendTonConnectMessage(msg, session?.secretKey || Buffer.from(''), session?.userId || '')
  }

  if (message) {
    await changeConnectMessageStatus(message.id, ConnectMessageStatus.APPROVED)
  }
}

export function GetTransfersFromTCMessage(
  messages: ImmutableArray<ConnectMessageTransactionMessage> | ConnectMessageTransactionMessage[],
  messageMode: number = 3
): WalletTransfer[] {
  return messages
    .map((m: ConnectMessageTransactionMessage) => {
      if (!m.address || !m.amount) {
        return undefined
      }

      let bounce: boolean | undefined

      let destination: Address | undefined

      try {
        if (Address.isFriendly(m.address || '')) {
          const { isBounceable, address } = Address.parseFriendly(m.address || '')
          destination = address
          bounce = isBounceable
        } else {
          destination = Address.parseRaw(m.address || '')
        }
      } catch (e) {
        return undefined
        // throw new Error('Wrong address')
      }

      const p = m?.payload
      let payload
      try {
        if (p) {
          payload = Cell.fromBase64(p)
        }
      } catch (e) {
        //
      }

      const stateInitData = m.stateInit
      const state = stateInitData ? Cell.fromBase64(stateInitData) : undefined

      const extraCurrency = m.extra_currency

      return {
        body: payload,
        destination,
        amount: BigInt(m.amount),
        mode: messageMode,
        state,
        bounce: bounce ?? true,
        extraCurrency,
      }
    })
    .filter((m) => m) as WalletTransfer[]
}
