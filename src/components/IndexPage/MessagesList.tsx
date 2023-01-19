import {
  changeConnectMessageStatus,
  TonConnectMessageTransaction,
  useMessagesState,
} from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { getWalletFromKey, useTonapiTxInfo, useWalletExternalMessageCell } from '@/utils/wallets'
import { State, ImmutableObject } from '@hookstate/core'
import { useEffect, useMemo } from 'react'
import { Address, Cell } from 'ton-core'
import { keyPairFromSeed } from 'ton-crypto'
import { LiteClient } from 'ton-lite-client'
import { BlueButton } from '../ui/BlueButton'
import { AddressRow } from '../AddressRow'
import {
  SendTransactionRpcResponseError,
  SendTransactionRpcResponseSuccess,
  SEND_TRANSACTION_ERROR_CODES,
} from '@tonconnect/protocol'
import { ConnectMessageStatus } from '@/types/connect'
import { sendTonConnectMessage } from '@/utils/tonConnect'

export function MessagesList() {
  // const sessions = useTonConnectSessions()
  const messages = useMessagesState()

  return (
    <div className="overflow-x-hidden">
      <h3 className="text-lg mb-2">Messages:</h3>
      {messages.map((s) => {
        return <MessageRow s={s} key={s.id.get()} />
      })}
    </div>
  )
}

export function MessageRow({ s }: { s: State<ImmutableObject<TonConnectMessageTransaction>> }) {
  console.log('messages map')
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient
  const sessions = useTonConnectSessions()

  useEffect(() => {
    console.log('row error 1')
  }, [keys])

  useEffect(() => {
    console.log('row error 2')
  }, [liteClient])

  useEffect(() => {
    console.log('row error 3')
  }, [s])

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
  console.log('get session', sessions, s.connect_session_id.get(), session)

  const walletKeyPair = useMemo(
    () => keyPairFromSeed(Buffer.from(key.seed.get() || '', 'hex')),
    [key.seed]
  )
  const tonWallet = useMemo(
    () => getWalletFromKey(liteClient, key, wallet),
    [liteClient, key, wallet]
  )

  const messageCell = useWalletExternalMessageCell(
    tonWallet,
    walletKeyPair,
    s.payload.messages.map((m) => ({
      body: m.payload.get() ? Cell.fromBase64(m.payload.get()!) : undefined,
      destination: Address.parse(m.address.get()),
      amount: BigInt(m.amount.get()),
      mode: 3,
      state: m.stateInit.get() ? Cell.fromBase64(m.stateInit.get()!) : undefined,
    }))
  )

  const amountOut =
    Number(s.payload.get().messages.reduce((acc, c) => acc + BigInt(c.amount), 0n)) / 10 ** 9

  const txInfo = useTonapiTxInfo(messageCell)

  const approveMessage = async () => {
    console.log('do approve')
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

    changeConnectMessageStatus(s.id.get(), ConnectMessageStatus.REJECTED)
  }

  return (
    <div className="bg-foreground-element/5 rounded shadow p-2">
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
            text={<div className="w-40">{`Wallet (${wallet.type}): `}</div>}
            address={tonWallet!.address}
          />
        }
      </div>

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
            // deleteConnectMessage(s.id.get())
            approveMessage()
          }}
          className="bg-green-500"
        >
          Approve
        </BlueButton>
      </div>

      <div className="flex">
        <div>Messages count:&nbsp;</div>
        <div className="break-words break-all">
          {s.payload.get().messages.length} ({amountOut.toString()})
        </div>
      </div>

      <div className="flex flex-col">
        <div>Tx Actions:</div>
        <div className="break-words break-all flex flex-col gap-2">
          {/* {JSON.stringify(txInfo)} */}
          {txInfo?.actions?.map((action, i) => {
            return (
              <div key={i} className="bg-foreground-element/5 p-1">
                <div>Name: {action.type}</div>
                {/* <div>Description: {action?.simplePreview?.fullDescription}</div>
                <div>Description: {action?.simplePreview?.image}</div> */}
                {/* <div>Description: {action?.simplePreview?.name}</div> */}
                {action.type !== 'JettonTransfer' && (
                  <div>Description: {action?.simplePreview?.shortDescription}</div>
                )}
                {action.type === 'TonTransfer' && (
                  <>
                    <AddressRow text="From:" rawAddress={action?.tonTransfer?.sender.address} />
                    <AddressRow text="To:" rawAddress={action?.tonTransfer?.recipient.address} />
                  </>
                )}
                {action.type === 'JettonTransfer' && (
                  <>
                    <div>
                      Description: Transfer{' '}
                      {Number(action.jettonTransfer?.amount) /
                        10 ** (action.jettonTransfer?.jetton.decimals || 0)}{' '}
                      {action.jettonTransfer?.jetton.symbol} Jettons
                    </div>
                    <AddressRow text="From:" rawAddress={action?.jettonTransfer?.sender?.address} />
                    <AddressRow
                      text="To:"
                      rawAddress={action?.jettonTransfer?.recipient?.address}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* <div className="flex">
        <div>SessionID:&nbsp;</div>
        <div>{s.get()}</div>
      </div>

      <div className="flex">
        <div>Key:&nbsp;</div>
        <div>{JSON.stringify(wallet)}</div>
      </div>

      <div className="flex">
        <div>Address:&nbsp;</div>
        <div>{tonWallet?.address.toString()}</div>
      </div>

      <div className="flex">
        <div>Delete:&nbsp;</div>
        <BlueButton
          onClick={() => {
            deleteTonConnectSession(s.id.get())
          }}
        >
          Delete
        </BlueButton>
      </div> */}
    </div>
  )
}
