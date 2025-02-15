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
import { ImmutableObject, State } from '@hookstate/core'
import { memo, useMemo, useState } from 'react'
import { KeyPair } from '@ton/crypto'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'
import { cn } from '@/utils/cn'
import { useEmulatedTxInfo } from '@/hooks/useEmulatedTxInfo'
import { MessageFlow } from './MessageFlow'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { Button } from '@/components/ui/button'
import { faExpand } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { ManagedSendMessageResult } from '@/utils/ManagedBlockchain'

const emptyKeyPair: KeyPair = {
  publicKey: Buffer.from([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]),
  secretKey: Buffer.from([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]),
}

export const MessageRow = memo(function MessageRow({
  s,
}: {
  s: State<ImmutableObject<TonConnectMessageTransaction>>
}) {
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient
  const sessions = useTonConnectSessions()
  const password = usePassword().password.get()

  const key = useMemo(() => {
    return keys.find((k) => k.id.get() === s.key_id.get())
  }, [keys])
  if (!key) {
    return <></>
  }

  const wallet = useMemo(() => key.wallets.get()?.find((w) => w.id === s.wallet_id.get()), [key])
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
    return secretKeyToED25519(decryptedData?.seed || Buffer.from([]))
  }, [key.encrypted, decryptedData])
  const tonWallet = useMemo(
    () => getWalletFromKey(liteClient, key.get(), wallet),
    [liteClient, wallet, key]
  )

  const transfers = useMemo(() => {
    try {
      return GetTransfersFromTCMessage(s.payload.messages.get())
    } catch (e) {
      console.error(e)
      return []
    }
  }, [s.payload.messages])

  const messageCell = useWalletExternalMessageCell(
    tonWallet,
    password ? walletKeyPair : emptyKeyPair,
    transfers
  )

  const rejectConnectMessage = () => {
    RejectTonConnectMessage({
      message: s.get(),
      session: session?.get(),
    })
  }

  const approveConnectMessage = () => {
    if (!messageCell) {
      return
    }
    ApproveTonConnectMessage({
      liteClient,
      messageCell,
      connectMessage: s.get(),
      session: session?.get(),
      eventId: s.connect_event_id?.get()?.toString(),
    }).then()
  }

  const { response: txInfo, isLoading } = useEmulatedTxInfo(messageCell, !walletKeyPair)
  const tonFlow = useMemo(() => {
    if (!txInfo || !txInfo.transactions) {
      return {
        outputs: 0n,
        inputs: 0n,
      }
    }

    const ourTxes = txInfo.transactions.filter((t) => t.address === txInfo.transactions[0].address)

    const messagesFrom = ourTxes.flatMap((t) => t.outMessages.values())
    const messagesTo = ourTxes.flatMap((t) => t.inMessage)

    const outputs = messagesFrom.reduce((acc, m) => {
      if (m.info.type === 'internal') {
        return acc + m.info.value.coins
      }
      return acc + 0n
    }, 0n)

    const inputs = messagesTo.reduce((acc, m) => {
      if (m?.info?.type === 'internal') {
        return acc + m?.info?.value.coins
      }
      return acc + 0n
    }, 0n)

    return {
      outputs,
      inputs,
    }
  }, [txInfo])

  return (
    <Block className="">
      {session?.url.get() && (
        <div className="flex items-center">
          <Avatar className="w-8 h-8">
            <AvatarImage src={session?.iconUrl.get()} />
            <AvatarFallback>C</AvatarFallback>
          </Avatar>

          <div className="ml-2">{session?.name.get()}</div>
          <a href={session?.url.get()} target="_blank" className="ml-2" rel="noopener noreferrer">
            {session?.url.get()}
          </a>
        </div>
      )}

      <div className="break-keep">
        {
          <AddressRow
            text={<div className="w-40 flex-shrink-0">{`Wallet (${wallet.type}): `}</div>}
            address={tonWallet?.address}
          />
        }
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <div>Messages count:</div>
          <div className="break-words break-all">{s?.payload?.get()?.messages?.length}</div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <div>Ton Flow:</div>
          <div className="break-words break-all">
            {Number(tonFlow.outputs.toString()) / 10 ** 9} TON →{' '}
            {Number(tonFlow.inputs.toString()) / 10 ** 9} TON
          </div>
          <div>
            Diff:{' '}
            {Number(tonFlow.inputs.toString()) / 10 ** 9 -
              Number(tonFlow.outputs.toString()) / 10 ** 9}{' '}
            TON
          </div>
        </div>
      </div>
      {password ? (
        <>
          <div className="flex items-center gap-2 my-2">
            <BlueButton variant={'outline'} onClick={rejectConnectMessage}>
              Reject
            </BlueButton>
            <BlueButton
              onClick={approveConnectMessage}
              className={cn('bg-green-500', 'disabled:bg-gray-400')}
              disabled={!messageCell || !walletKeyPair}
            >
              Approve
            </BlueButton>
          </div>
        </>
      ) : (
        <>
          <BlueButton onClick={rejectConnectMessage}>Reject</BlueButton>
          <BlueButton onClick={openPasswordPopup} className="ml-2 mt-2 bg-green-500">
            Unlock wallet
          </BlueButton>
        </>
      )}

      <MessageEmulationResult txInfo={txInfo} isLoading={isLoading} />
    </Block>
  )
})

export function MessageEmulationResult({
  txInfo,
  isLoading,
}: {
  txInfo: ManagedSendMessageResult | undefined
  isLoading: boolean
}) {
  const isTestnet = useLiteclientState().selectedNetwork.is_testnet.get()
  const [max, setMax] = useState(false)

  return (
    <>
      <div className="flex flex-col">
        <div className="break-words break-all flex flex-col gap-2">
          <div>
            <Button variant={'outline'} className={'mt-4'} onClick={() => setMax((v) => !v)}>
              <FontAwesomeIcon icon={faExpand} className={'mr-2'} />
              Toggle Preview Size
            </Button>
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
