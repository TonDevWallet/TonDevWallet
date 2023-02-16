import { WalletTransfer } from '@/contracts/utils/HighloadWalletTypes'
import { TonConnectMessageTransaction, changeConnectMessageStatus } from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
import { openPasswordPopup, useDecryptWalletData, usePassword } from '@/store/passwordManager'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { IWallet } from '@/types'
import { ConnectMessageStatus } from '@/types/connect'
import { formatTon } from '@/utils/formatNumbers'
import { sendTonConnectMessage } from '@/utils/tonConnect'
import { getWalletFromKey, useWalletExternalMessageCell, useTonapiTxInfo } from '@/utils/wallets'
import { State, ImmutableObject } from '@hookstate/core'
import {
  SendTransactionRpcResponseSuccess,
  SendTransactionRpcResponseError,
  SEND_TRANSACTION_ERROR_CODES,
} from '@tonconnect/protocol'
import { useMemo } from 'react'
import { Address, Cell } from 'ton-core'
import { KeyPair, keyPairFromSeed } from 'ton-crypto'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'
import { BlockchainTransaction } from '../../utils/ManagedBlockchain'
import { cn } from '@/utils/cn'

const emptyKeyPair: KeyPair = {
  publicKey: Buffer.from([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]),
  secretKey: Buffer.from([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]),
}

export function MessageRow({ s }: { s: State<ImmutableObject<TonConnectMessageTransaction>> }) {
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient
  const sessions = useTonConnectSessions()
  const password = usePassword().password.get()

  const amountOut =
    Number(s.payload.get().messages.reduce((acc, c) => acc + BigInt(c.amount), 0n)) / 10 ** 9

  const key = keys.find((k) => k.id.get() === s.key_id.get())
  if (!key) {
    return <></>
  }

  const wallet = key.wallets.get()?.find((w) => w.id === s.wallet_id.get())
  if (!wallet) {
    return <></>
  }

  const session = useMemo(
    () => sessions.find((session) => session.id.get() === s.connect_session_id.get()),
    [sessions]
  )

  const { decryptedData } = useDecryptWalletData(password, key.encrypted.get())

  const walletKeyPair = useMemo(() => {
    if (!decryptedData) {
      return undefined
    }
    const keyPair = keyPairFromSeed(decryptedData?.seed || Buffer.from([]))
    return keyPair
  }, [key.encrypted, decryptedData])
  const tonWallet = useMemo(() => getWalletFromKey(liteClient, key, wallet), [liteClient, wallet])

  const transfers = useMemo(
    () =>
      s.payload.messages
        .map((m) => {
          if (!m.address.get() || !m.amount.get()) {
            return undefined
          }

          let bounce: boolean | undefined

          let destination

          try {
            if (Address.isFriendly(m.address.get() || '')) {
              const { isBounceable, address } = Address.parseFriendly(m.address.get() || '')
              destination = address
              bounce = isBounceable
            } else {
              destination = Address.parseRaw(m.address.get() || '')
            }
          } catch (e) {
            throw new Error('Wrong address')
          }

          const p = m.payload.get()
          const payload = p ? Cell.fromBase64(p) : undefined

          const stateInitData = m.stateInit.get()
          const state = stateInitData ? Cell.fromBase64(stateInitData) : undefined

          return {
            body: payload,
            destination,
            amount: BigInt(m.amount.get()),
            mode: 3,
            state,
            bounce: bounce ?? true,
          }
        })
        .filter((m) => m) as WalletTransfer[],
    [s.payload.messages]
  )

  console.log('walletk', walletKeyPair)
  const messageCell = useWalletExternalMessageCell(tonWallet, walletKeyPair, transfers)
  const testMessageCell = useWalletExternalMessageCell(tonWallet, emptyKeyPair, transfers)

  const approveMessage = async () => {
    console.log('do approve', messageCell)
    const msg: SendTransactionRpcResponseSuccess = {
      id: s.connect_event_id.get().toString(),
      result: messageCell?.toBoc().toString('base64') || '',
    }

    await sendTonConnectMessage(
      msg,
      session?.secretKey.get() || Buffer.from(''),
      session?.userId?.get() || ''
    )

    await liteClient.sendMessage(messageCell?.toBoc() || Buffer.from(''))

    changeConnectMessageStatus(s.id.get(), ConnectMessageStatus.REJECTED)
  }

  const rejectMessage = async () => {
    console.log('do reject')
    changeConnectMessageStatus(s.id.get(), ConnectMessageStatus.REJECTED)

    const msg: SendTransactionRpcResponseError = {
      id: s.connect_event_id.get().toString(),
      error: {
        code: SEND_TRANSACTION_ERROR_CODES.USER_REJECTS_ERROR,
        message: 'User rejected',
      },
    }

    await sendTonConnectMessage(
      msg,
      session?.secretKey.get() || Buffer.from(''),
      session?.userId?.get() || ''
    )
  }

  return (
    <Block className="mt-2">
      <div className="flex items-center">
        <img src={session?.iconUrl.get()} alt="icon" className="w-8 h-8 rounded-full" />
        <div className="ml-2">{session?.name.get()}</div>
        <a href={session?.url.get()} target="_blank" className="ml-2" rel="noopener noreferrer">
          {session?.url.get()}
        </a>
      </div>

      <div className="break-keep">
        {
          <AddressRow
            text={<div className="w-40 flex-shrink-0">{`Wallet (${wallet.type}): `}</div>}
            address={tonWallet?.address}
          />
        }
      </div>
      <div className="flex">
        <div>Messages count:&nbsp;</div>
        <div className="break-words break-all">
          {s.payload.get().messages.length} ({amountOut.toString()} TON)
        </div>
      </div>

      {password ? (
        <>
          <div className="flex items-center gap-2 my-2">
            <BlueButton
              onClick={() => {
                rejectMessage()
              }}
            >
              Reject
            </BlueButton>
            <BlueButton
              onClick={() => {
                approveMessage()
              }}
              className={cn('bg-green-500', 'disabled:bg-gray-400')}
              disabled={!messageCell}
            >
              Approve
            </BlueButton>
          </div>
        </>
      ) : (
        <>
          <BlueButton
            onClick={() => {
              rejectMessage()
            }}
          >
            Reject
          </BlueButton>
          <BlueButton onClick={openPasswordPopup} className="ml-2 mt-2 bg-green-500">
            Unlock wallet
          </BlueButton>
        </>
      )}

      <MessageEmulationResult messageCell={testMessageCell} tonWallet={tonWallet} />
    </Block>
  )
}

export function MessageEmulationResult({
  messageCell,
  tonWallet,
}: {
  messageCell?: Cell
  tonWallet?: IWallet
}) {
  const { response: txInfo, progress, isLoading } = useTonapiTxInfo(messageCell)

  return (
    <>
      <div className="flex flex-col">
        <div>Tx Actions:</div>
        <div className="break-words break-all flex flex-col gap-2">
          {/* {isLoading ? (
            <>
              Progress: {progress.done} / {progress.total}
            </>
          ) : ( */}
          <div>
            Progress: {progress.done} / {progress.total}
          </div>
          {isLoading && <div>Emulating...</div>}

          {txInfo?.transactions.map((tx, i) => {
            return !tx.parent && <TxRow key={i} tx={tx} />
          })}

          {txInfo?.events?.map((action, i) => {
            return (
              <Block key={i} className="flex flex-col">
                <div>Name: {action.type}</div>
                {action.type === 'message_sent' && (
                  <>
                    <div>Amount: {Number(action.value) / 10 ** 9} TON</div>
                    <AddressRow
                      text={<span className="w-16 flex-shrink-0">From:</span>}
                      address={action.from}
                      addressClassName={
                        tonWallet?.address.equals(action.from) ? 'text-red-500' : undefined
                      }
                    />
                    <AddressRow
                      text={<span className="w-16 flex-shrink-0">To:</span>}
                      address={action.to}
                      addressClassName={
                        tonWallet?.address.equals(action.to) ? 'text-green-500' : undefined
                      }
                    />
                  </>
                )}
              </Block>
            )
          })}
        </div>
      </div>
    </>
  )
}

function TxRow({ tx }: { tx: BlockchainTransaction }) {
  return (
    <Block className="flex flex-col">
      TxInfo
      <div>Fee: {formatTon(tx.gasSelf)}</div>
      <div>Total Fee: {formatTon(tx.gasFull)}</div>
      <div>
        Children:
        {tx.children.map((c, i) => (
          <TxRow key={i} tx={c} />
        ))}
      </div>
    </Block>
  )
}
