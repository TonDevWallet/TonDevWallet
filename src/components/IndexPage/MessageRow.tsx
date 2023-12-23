import { TonConnectMessageTransaction } from '@/store/connectMessages'
import { useLiteclient, useLiteclientState } from '@/store/liteClient'
import { openPasswordPopup, useDecryptWalletData, usePassword } from '@/store/passwordManager'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import {
  ApproveTonConnectMessage,
  GetTransfersFromTCMessage,
  RejectTonConnectMessage,
} from '@/utils/tonConnect'
import { getWalletFromKey, useWalletExternalMessageCell } from '@/utils/wallets'
import { State, ImmutableObject } from '@hookstate/core'
import { useMemo, useState } from 'react'
import { Cell } from 'ton-core'
import { KeyPair, keyPairFromSeed } from 'ton-crypto'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'
import { cn } from '@/utils/cn'
import { useTonapiTxInfo } from '@/hooks/useTonapiTxInfo'
import { MessageFlow } from './MessageFlow'

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
    Number(s?.payload?.get()?.messages?.reduce((acc, c) => acc + BigInt(c.amount), 0n)) / 10 ** 9

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
  const tonWallet = useMemo(
    () => getWalletFromKey(liteClient, key.get(), wallet),
    [liteClient, wallet, key]
  )

  const transfers = useMemo(
    () => GetTransfersFromTCMessage(s.payload.messages.get()),
    [s.payload.messages]
  )

  const messageCell = useWalletExternalMessageCell(tonWallet, walletKeyPair, transfers)
  const testMessageCell = useWalletExternalMessageCell(tonWallet, emptyKeyPair, transfers)

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
          {s?.payload?.get()?.messages?.length} ({amountOut.toString()} TON)
        </div>
      </div>

      {password ? (
        <>
          <div className="flex items-center gap-2 my-2">
            <BlueButton
              onClick={() => {
                if (!session) {
                  return
                }
                RejectTonConnectMessage({
                  s: s.get(),
                  session: session.get(),
                })
              }}
            >
              Reject
            </BlueButton>
            <BlueButton
              onClick={() => {
                if (!messageCell || !session) {
                  return
                }
                ApproveTonConnectMessage({
                  liteClient,
                  messageCell,
                  s: s.get(),
                  session: session.get(),
                  eventId: s.connect_event_id.get().toString(),
                })
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
              if (!session) {
                return
              }
              RejectTonConnectMessage({
                s: s.get(),
                session: session.get(),
              })
            }}
          >
            Reject
          </BlueButton>
          <BlueButton onClick={openPasswordPopup} className="ml-2 mt-2 bg-green-500">
            Unlock wallet
          </BlueButton>
        </>
      )}

      <MessageEmulationResult
        messageCell={walletKeyPair ? messageCell : testMessageCell}
        ignoreChecksig={!walletKeyPair} // do not ignore checksig if we use real keypair
      />
    </Block>
  )
}

export function MessageEmulationResult({
  messageCell,
  ignoreChecksig,
}: {
  messageCell?: Cell
  ignoreChecksig?: boolean
}) {
  const isTestnet = useLiteclientState().testnet.get()
  const { response: txInfo, progress, isLoading } = useTonapiTxInfo(messageCell, ignoreChecksig)
  const [max, setMax] = useState(false)

  return (
    <>
      <div className="flex flex-col">
        <div className="break-words break-all flex flex-col gap-2">
          <div>
            <div>
              Progress: {progress.done} / {progress.total}
            </div>
            <div>
              <button className="text-accent" onClick={() => setMax((v) => !v)}>
                Toggle Preview Size
              </button>
            </div>
          </div>

          <Block
            className={cn('h-[50vh]', max && 'h-[90vh]', 'p-0')}
            bg={isTestnet ? 'bg-[#22351f]' : 'bg-transparent'}
          >
            {!isLoading && <MessageFlow transactions={txInfo?.transactions} />}
          </Block>
        </div>
      </div>
    </>
  )
}
