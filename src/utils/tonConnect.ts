import { WalletTransfer } from '@/contracts/utils/HighloadWalletTypes'
import {
  TonConnectMessageSign,
  TonConnectMessageTransaction,
  TonConnectMessageAddPlugin,
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
import { Address, beginCell, Cell, external, storeMessage } from '@ton/core'
import type { ApiClient } from '@/store/liteClient'
import { secretKeyToX25519 } from './ed25519'
import { getWalletFromKey } from '@/utils/wallets'
import { SignTonConnectData } from '@/utils/signData/sign'
import { ActionAddExtension, ActionRemoveExtension, packActionsList } from '@/contracts/w5/actions'
import { Opcodes, bufferToBigInt } from '@/contracts/w5/WalletV5R1'
import { SignMessage } from './signer'
import { KeyPair } from '@ton/crypto'
import { Key } from '@/types/Key'
import { SavedWallet } from '@/types'
import { CallForSuccess } from './callForSuccess'

export const bridgeUrl = 'https://bridge.tonapi.io/bridge'
// export const bridgeUrl = 'http://localhost:8081/bridge'
// export const bridgeUrl = 'https://walletbot.me/tonconnect-bridge/bridge'

export async function sendTonConnectMessage(
  msg: WalletMessage,
  secretKey: Buffer | Uint8Array,
  clientPublicKey: string
) {
  const sessionKeypair = secretKeyToX25519(secretKey)

  const url = new URL(`${bridgeUrl}/message`)
  url.searchParams.append('client_id', Buffer.from(sessionKeypair.publicKey).toString('hex'))
  url.searchParams.append('to', clientPublicKey)
  url.searchParams.append('ttl', '300')

  const sessionCrypto = new SessionCrypto({
    publicKey: Buffer.from(sessionKeypair.publicKey).toString('hex'),
    secretKey: Buffer.from(sessionKeypair.secretKey).toString('hex'),
  })

  const message = sessionCrypto.encrypt(JSON.stringify(msg), hexToByteArray(clientPublicKey))
  CallForSuccess(() =>
    fetch(url, {
      method: 'post',
      body: Base64.encode(message),
      signal: AbortSignal.timeout(1000),
    })
  )
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
  liteClient: ApiClient | ImmutableObject<ApiClient>
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
  liteClient: ApiClient | ImmutableObject<ApiClient>
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

// W5R1 Plugin Installation Functions

export async function RejectTonConnectMessageAddPlugin({
  message,
  session,
}: {
  message: TonConnectMessageAddPlugin | ImmutableObject<TonConnectMessageAddPlugin>
  session?: TonConnectSession | ImmutableObject<TonConnectSession>
}) {
  if (session) {
    const msg: SendTransactionRpcResponseError = {
      id: message.connect_event_id.toString(),
      error: {
        code: SEND_TRANSACTION_ERROR_CODES.USER_REJECTS_ERROR,
        message: 'User rejected plugin installation',
      },
    }

    await sendTonConnectMessage(msg, session?.secretKey || Buffer.from(''), session?.userId || '')
  }

  await changeConnectMessageStatus(message.id, ConnectMessageStatus.REJECTED)
}

export async function ApproveTonConnectMessageAddPlugin({
  message,
  session,
  liteClient,
  walletKeyPair,
  pluginAddress,
  pluginsToRemove,
  key,
  wallet,
}: {
  message: TonConnectMessageAddPlugin | ImmutableObject<TonConnectMessageAddPlugin>
  session?: TonConnectSession | ImmutableObject<TonConnectSession>
  liteClient: ApiClient | ImmutableObject<ApiClient>
  walletKeyPair: KeyPair
  pluginAddress: Address | null // null means only removal, no install
  pluginsToRemove: Address[]
  key: any
  wallet: SavedWallet
}) {
  // Get the W5 wallet
  const tonWallet = getWalletFromKey(liteClient, key, wallet)
  if (!tonWallet || tonWallet.type !== 'v5R1') {
    throw new Error('Wallet is not a W5R1 wallet')
  }

  // tonWallet.wallet is already an OpenedContract<WalletV5>
  const w5Wallet = tonWallet.wallet

  // Create actions list: first remove old plugins, then optionally add new one
  const actions = [
    ...pluginsToRemove.map((addr) => new ActionRemoveExtension(addr)),
    ...(pluginAddress ? [new ActionAddExtension(pluginAddress)] : []),
  ]
  const actionsList = packActionsList(actions)

  // Get seqno
  let seqno = 0
  try {
    seqno = await w5Wallet.getSeqno()
  } catch (e) {
    // If getSeqno fails, use 0 (wallet not deployed yet)
  }

  // Create and sign the message body
  const subwalletId = BigInt(wallet.subwallet_id)
  const messageBody = await createAddPluginBodyV5(
    walletKeyPair,
    key as Key,
    seqno,
    subwalletId,
    actionsList
  )

  // Create external message
  const ext = external({
    to: w5Wallet.address,
    init: seqno === 0 ? w5Wallet.init : undefined,
    body: messageBody,
  })
  const messageCell = beginCell().store(storeMessage(ext)).endCell()

  // Send the message
  await liteClient.sendMessage(messageCell.toBoc())

  // Respond to TonConnect
  if (session) {
    const msg: SendTransactionRpcResponseSuccess = {
      id: message.connect_event_id.toString(),
      result: messageCell.toBoc().toString('base64'),
    }

    await sendTonConnectMessage(msg, session?.secretKey || Buffer.from(''), session?.userId || '')
  }

  // Update message status
  await changeConnectMessageStatus(message.id, ConnectMessageStatus.APPROVED, messageCell)
}

async function createAddPluginBodyV5(
  keyPair: KeyPair,
  key: Key,
  seqno: number,
  walletId: bigint,
  actionsList: Cell
) {
  // Ensure secret key is 64 bytes
  let secretKey = keyPair.secretKey
  if (secretKey.length === 32) {
    secretKey = Buffer.concat([Uint8Array.from(secretKey), Uint8Array.from(keyPair.publicKey)])
  }

  const expireAt = Math.floor(Date.now() / 1000) + 60
  const payload = beginCell()
    .storeUint(Opcodes.auth_signed, 32)
    .storeUint(walletId, 32)
    .storeUint(expireAt, 32)
    .storeUint(seqno, 32)
    .storeSlice(actionsList.beginParse())
    .endCell()

  const signature = await SignMessage(secretKey, payload.hash(), key)

  return beginCell()
    .storeSlice(payload.beginParse())
    .storeUint(bufferToBigInt(Buffer.from(signature)), 512)
    .endCell()
}
