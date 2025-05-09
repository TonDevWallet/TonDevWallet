import { TonConnectMessageTransaction } from '@/store/connectMessages'
import { useLiteclient, useLiteclientState } from '@/store/liteClient'
import { openPasswordPopup, useDecryptWalletData, usePassword } from '@/store/passwordManager'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import {
  ApproveTonConnectMessageTransaction,
  GetTransfersFromTCMessage,
  RejectTonConnectMessageTransaction,
} from '@/utils/tonConnect'
import { getWalletFromKey, useWalletExternalMessageCell } from '@/utils/wallets'
import { ImmutableObject, State } from '@hookstate/core'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
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
import { faDownload, faExpand } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { ManagedSendMessageResult } from '@/utils/ManagedBlockchain'
// import { DeserializeTransactionsList, SerializeTransactionsList } from '@/utils/txSerializer'
import { Address } from '@ton/ton'
import { bigIntToBuffer } from '@/utils/ton'
import { JettonAmountDisplay, JettonNameDisplay } from '../Jettons/Jettons'
import { formatUnits } from '@/utils/units'
// For Tauri filesystem access
import { downloadGraph } from '@/utils/graphDownloader'
const emptyKeyPair: KeyPair = {
  publicKey: Buffer.from([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]),
  secretKey: Buffer.from([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]),
}

export const MessageRowTx = memo(function MessageRowTx({
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

  const { decryptedData } = useDecryptWalletData(password, key.encrypted?.get() || undefined)

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
      return GetTransfersFromTCMessage(s.payload.messages.get(), s.message_mode?.get() ?? 3)
    } catch (e) {
      console.error(e)
      return []
    }
  }, [s.payload.messages])

  const messageCell = useWalletExternalMessageCell(
    tonWallet,
    password && walletKeyPair ? walletKeyPair : emptyKeyPair,
    transfers
  )

  const rejectConnectMessage = () => {
    RejectTonConnectMessageTransaction({
      message: s.get(),
      session: session?.get(),
    })
  }

  const approveConnectMessage = () => {
    if (!messageCell) {
      return
    }
    ApproveTonConnectMessageTransaction({
      liteClient,
      messageCell,
      connectMessage: s.get(),
      session: session?.get(),
      eventId: s.connect_event_id?.get()?.toString(),
    }).then()
  }

  const { response: txInfo, isLoading, snapshot } = useEmulatedTxInfo(messageCell, !walletKeyPair)
  const [moneyFlow, setMoneyFlow] = useState<{
    outputs: bigint
    inputs: bigint
    jettonTransfers: { from: Address; to: Address; jetton: Address | null; amount: bigint }[]
    ourAddress: Address | null
  }>({
    outputs: 0n,
    inputs: 0n,
    jettonTransfers: [],
    ourAddress: null,
  })
  useEffect(() => {
    async function getMoneyFlow() {
      if (!txInfo || !txInfo.transactions) {
        setMoneyFlow({
          outputs: 0n,
          inputs: 0n,
          jettonTransfers: [],
          ourAddress: null,
        })
        return
      }

      // const ourAddress = txInfo.transactions[0].address
      const ourTxes = txInfo.transactions.filter(
        (t) => t.address === txInfo.transactions[0].address
      )

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

      const jettonTransfers: {
        from: Address
        to: Address
        jetton: Address | null
        amount: bigint
      }[] = []
      for (const t of txInfo.transactions) {
        if (!t.inMessage?.info?.src || !(t.inMessage?.info?.src instanceof Address)) {
          continue
        }

        if (t.parsed?.internal !== 'jetton_transfer') {
          continue
        }

        const from = t.inMessage.info.src
        const to = t.parsed.data.destination instanceof Address ? t.parsed.data.destination : null
        if (!to) {
          continue
        }
        const jettonAmount = t.parsed.data.amount

        if (!snapshot) {
          continue
        }

        const jettonAddress = t.jettonData?.jettonAddress || null

        jettonTransfers.push({
          from,
          to,
          jetton: jettonAddress, // jettonAddress,
          amount: jettonAmount,
        })
      }

      setMoneyFlow({
        outputs,
        inputs,
        jettonTransfers,
        ourAddress: new Address(0, bigIntToBuffer(txInfo.transactions[0].address)),
      })
    }
    getMoneyFlow()
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
            text={<div className="w-40 shrink-0">{`Wallet (${wallet.type}): `}</div>}
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
            {formatUnits(moneyFlow.outputs, 9)} TON → {formatUnits(moneyFlow.inputs, 9)} TON
          </div>
          <div>Diff: {formatUnits(moneyFlow.inputs - moneyFlow.outputs, 9)} TON</div>
        </div>
      </div>
      <JettonFlow
        jettonTransfers={moneyFlow.jettonTransfers}
        ourAddress={moneyFlow.ourAddress}
        tonDifference={moneyFlow.inputs - moneyFlow.outputs}
      />
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

const JettonFlow = memo(function JettonFlow({
  jettonTransfers,
  tonDifference,
  ourAddress,
}: {
  jettonTransfers: { from: Address; to: Address; jetton: Address | null; amount: bigint }[]
  ourAddress: Address | null
  tonDifference: bigint
}) {
  // Group transfers by jetton and calculate net flow
  const jettonFlows = useMemo(() => {
    return jettonTransfers.reduce<Record<string, bigint>>((acc, transfer) => {
      const jettonKey = transfer.jetton?.toString() || 'unknown'
      if (!acc[jettonKey]) {
        acc[jettonKey] = 0n
      }

      // Add to balance if receiving tokens (to our address)
      // Subtract from balance if sending tokens (from our address)
      if (ourAddress && transfer.to.equals(ourAddress)) {
        acc[jettonKey] += transfer.amount
      } else if (ourAddress && transfer.from.equals(ourAddress)) {
        acc[jettonKey] -= transfer.amount
      }

      return acc
    }, {})
  }, [jettonTransfers, ourAddress?.toRawString()])

  return (
    <div className="mt-2">
      <div className="font-semibold mb-1">Money Flow:</div>
      {Object.entries(jettonFlows).length > 0 ? (
        Object.entries(jettonFlows).map(([jettonAddr, amount]) => (
          <JettonFlowItem key={jettonAddr} jettonAddress={jettonAddr} amount={amount} />
        ))
      ) : (
        <></>
      )}
      <JettonFlowItem jettonAddress={'TON'} amount={tonDifference} />
    </div>
  )
})

const JettonFlowItem = memo(function JettonFlowItem({
  jettonAddress,
  amount,
}: {
  jettonAddress: Address | string | undefined
  amount: bigint
}) {
  return (
    <div className="flex items-center">
      <span className="truncate max-w-[200px]">
        <JettonNameDisplay jettonAddress={jettonAddress} />
      </span>
      <div className={`flex ml-2 font-medium ${amount >= 0n ? 'text-green-600' : 'text-red-600'}`}>
        {amount >= 0n ? '+' : ''}
        <JettonAmountDisplay amount={amount} jettonAddress={jettonAddress} />
      </div>
    </div>
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

  const handleDownloadGraph = useCallback(async () => {
    if (txInfo?.transactions) {
      await downloadGraph(txInfo.transactions)
    }
  }, [txInfo])

  // for test purposes, use serdes graph to display it
  // const serdesGraph = DeserializeTransactionsList(
  //   SerializeTransactionsList(txInfo?.transactions || [])
  // )
  const serdesGraph = {
    transactions: txInfo?.transactions,
  }

  return (
    <>
      <div className="flex flex-col">
        <div className="break-words break-all flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant={'outline'} className={'mt-4'} onClick={() => setMax((v) => !v)}>
              <FontAwesomeIcon icon={faExpand} className={'mr-2'} />
              Toggle Preview Size
            </Button>

            <Button variant={'outline'} className={'mt-4'} onClick={handleDownloadGraph}>
              <FontAwesomeIcon icon={faDownload} className={'mr-2'} />
              Download graph
            </Button>
          </div>

          <Block
            className={cn('h-[50vh]', max && 'h-[90vh]', 'p-0')}
            bg={isTestnet ? 'bg-[#22351f]' : 'bg-transparent'}
          >
            {!isLoading && <MessageFlow transactions={serdesGraph.transactions} />}
          </Block>
        </div>
      </div>
    </>
  )
}
