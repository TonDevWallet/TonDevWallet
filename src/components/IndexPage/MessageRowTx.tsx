import { TonConnectMessageTransaction } from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
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
import { memo, useEffect, useMemo, useState } from 'react'
import { KeyPair } from '@ton/crypto'
import { LiteClient } from 'ton-lite-client'
import { AddressRow } from '../AddressRow'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'
import { cn } from '@/utils/cn'
import { useEmulatedTxInfo } from '@/hooks/useEmulatedTxInfo'
import { useToncenterEmulation } from '@/hooks/useToncenterEmulation'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Address } from '@ton/ton'
import { bigIntToBuffer } from '@/utils/ton'
import { formatUnits } from '@/utils/units'
import { MessageEmulationResult } from './MessageRow/MessageEmulationResult'
import { JettonFlow } from './MessageRow/JettonFlow'
import { Key } from '@/types/Key'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import type { MoneyFlow } from '@/utils/toncenterEmulation'

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

  const validUntill = useMemo(() => {
    if (!s.payload?.valid_until?.get()) {
      return undefined
    }
    return new Date(s.payload?.valid_until?.get() * 1000)
  }, [s.payload])

  const validUntilCorrect = useMemo(() => {
    if (!validUntill) {
      return false
    }
    // correct if now < validUntill < now + 5 minutes
    return validUntill > new Date() && validUntill < new Date(Date.now() + 5 * 60 * 1000)
  }, [validUntill])

  const unsignedMessageCell = useWalletExternalMessageCell(tonWallet, emptyKeyPair, transfers)

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

  const [moneyFlow, setMoneyFlow] = useState<MoneyFlow>({
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

  const toncenterEmulation = useToncenterEmulation({
    walletAddress: tonWallet?.address?.toString(),
    messages: s.payload.messages,
    localMoneyFlow: moneyFlow,
  })

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

      {/* Valid untill */}
      <div className={cn('flex gap-4', validUntilCorrect ? 'text-green-500' : 'text-red-500')}>
        <div className="flex items-center gap-2">
          <div>Valid until:</div>
          <div className="break-words break-all">{validUntill?.toLocaleString()}</div>

          {/* Tooltip with info about valid until */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-pointer">
                <FontAwesomeIcon icon={faInfoCircle} />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Valid until should be in the future and less than 5 minutes from now. If it is
                  not, the message can be rejected.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

      {toncenterEmulation.isCorrect && (
        <div className="text-green-500">Toncenter emulation money flow is the same as local</div>
      )}
      {toncenterEmulation.error && <div className="text-red-500">{toncenterEmulation.error}</div>}

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

      <MessageEmulationResult
        txInfo={txInfo}
        isLoading={isLoading}
        wallet={tonWallet}
        selectedKey={key.get({ noproxy: true }) as Key}
        unsignedExternal={unsignedMessageCell}
        signedExternal={password && walletKeyPair ? messageCell : undefined}
      />
    </Block>
  )
})
