import { TonConnectMessageSignMessage } from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
import { openPasswordPopup, useDecryptWalletData, usePassword } from '@/store/passwordManager'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import {
  ApproveTonConnectMessageSignMessage,
  GetTransfersFromTCMessage,
  RejectTonConnectMessageSignMessage,
} from '@/utils/tonConnect'
import {
  getWalletFromKey,
  SIGN_MODE_EMULATION_VALUE,
  useWalletSignedInternalCell,
  wrapInternalForSignEmulation,
} from '@/utils/wallets'
import { ImmutableObject, State } from '@hookstate/core'
import { memo, useEffect, useMemo, useState } from 'react'
import { KeyPair } from '@ton/crypto'
import { LiteClient } from 'ton-lite-client'
import { Address, SendMode } from '@ton/core'
import { AddressRow } from '../AddressRow'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'
import { Input } from '../ui/input'
import { cn } from '@/utils/cn'
import { useEmulatedTxInfo } from '@/hooks/useEmulatedTxInfo'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { bigIntToBuffer } from '@/utils/ton'
import { formatUnits, parseUnits } from '@/utils/units'
import { MessageEmulationResult } from './MessageRow/MessageEmulationResult'
import { JettonFlow } from './MessageRow/JettonFlow'
import { Key } from '@/types/Key'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import type { MoneyFlow } from '@/utils/toncenterEmulation'

const emptyKeyPair: KeyPair = {
  publicKey: Buffer.alloc(32),
  secretKey: Buffer.alloc(64),
}

export const MessageRowSignMessage = memo(function MessageRowSignMessage({
  s,
}: {
  s: State<ImmutableObject<TonConnectMessageSignMessage>>
}) {
  const keys = useWalletListState()
  const liteClient = useLiteclient() as unknown as LiteClient
  const sessions = useTonConnectSessions()
  const password = usePassword().password.get()
  const [isSigning, setIsSigning] = useState(false)
  const [relayGasInput, setRelayGasInput] = useState(formatUnits(SIGN_MODE_EMULATION_VALUE, 9))

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
      return GetTransfersFromTCMessage(
        s.payload.messages.get(),
        SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS
      )
    } catch (e) {
      console.error(e)
      return []
    }
  }, [s.payload.messages])

  const validUntil = useMemo(() => {
    if (!s.payload?.valid_until?.get()) {
      return undefined
    }
    return new Date(s.payload?.valid_until?.get() * 1000)
  }, [s.payload])

  const validUntilCorrect = useMemo(() => {
    if (!validUntil) {
      return false
    }
    return validUntil > new Date() && validUntil < new Date(Date.now() + 5 * 60 * 1000)
  }, [validUntil])

  const relayGas = useMemo(() => {
    try {
      const parsed = parseUnits(relayGasInput || '0', 9)
      return parsed > 0n ? parsed : SIGN_MODE_EMULATION_VALUE
    } catch (e) {
      return SIGN_MODE_EMULATION_VALUE
    }
  }, [relayGasInput])

  // Signed internal (relaxed) message that will be returned to the dApp
  const signedInternalCell = useWalletSignedInternalCell(
    tonWallet,
    password && walletKeyPair ? walletKeyPair : emptyKeyPair,
    transfers,
    s.payload?.valid_until?.get()
  )

  // For emulation, wrap into a full internal message as if a relayer delivered it with gas
  const emulationCell = useMemo(() => {
    if (!signedInternalCell) {
      return undefined
    }
    try {
      console.log('Wrapping internal for sign emulation', relayGas)
      return wrapInternalForSignEmulation(signedInternalCell, relayGas)
    } catch (e) {
      console.error('error wrapping internal for sign emulation', e)
      return undefined
    }
  }, [signedInternalCell, relayGas])

  const { response: txInfo, isLoading } = useEmulatedTxInfo(emulationCell, !walletKeyPair)

  const [moneyFlow, setMoneyFlow] = useState<MoneyFlow>({
    outputs: 0n,
    inputs: 0n,
    jettonTransfers: [],
    ourAddress: null,
  })
  useEffect(() => {
    async function getMoneyFlow() {
      if (!txInfo || !txInfo.transactions || txInfo.transactions.length === 0) {
        setMoneyFlow({
          outputs: 0n,
          inputs: 0n,
          jettonTransfers: [],
          ourAddress: null,
        })
        return
      }

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
        const jettonAddress = t.jettonData?.jettonAddress || null

        jettonTransfers.push({
          from,
          to,
          jetton: jettonAddress,
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

  const rejectConnectMessage = () => {
    RejectTonConnectMessageSignMessage({
      message: s.get(),
      session: session?.get(),
    })
  }

  const approveConnectMessage = async () => {
    if (!tonWallet?.getSignedInternalCell || !walletKeyPair) {
      return
    }

    try {
      setIsSigning(true)
      const signedCell = await tonWallet.getSignedInternalCell(
        walletKeyPair,
        transfers,
        s.payload?.valid_until?.get()
      )
      await ApproveTonConnectMessageSignMessage({
        signedCell,
        connectMessage: s.get(),
        session: session?.get(),
      })
    } finally {
      setIsSigning(false)
    }
  }

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

      <div className="flex items-center gap-2 font-medium text-amber-500">
        <div>Sign Message Request (signed, but not sent)</div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-pointer">
              <FontAwesomeIcon icon={faInfoCircle} />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                The wallet only signs this message and returns it to the application. The
                application may broadcast it to the network later, which can transfer your assets.
                Your wallet will not pay gas for this request.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="break-keep">
        <AddressRow
          text={<div className="w-40 shrink-0">{`Wallet (${wallet.type}): `}</div>}
          address={tonWallet?.address}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <div>Messages count:</div>
          <div className="break-words break-all">{s?.payload?.get()?.messages?.length}</div>
        </div>
      </div>

      <div className={cn('flex gap-4', validUntilCorrect ? 'text-green-500' : 'text-red-500')}>
        <div className="flex items-center gap-2">
          <div>Valid until:</div>
          <div className="break-words break-all">{validUntil?.toLocaleString()}</div>

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

      <div className="flex items-center gap-2 my-2">
        <div className="flex items-center gap-1 shrink-0">
          <div>Relay gas (TON):</div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-pointer">
                <FontAwesomeIcon icon={faInfoCircle} />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Amount of TON the relayer is assumed to attach when delivering this message to
                  your wallet. Used only for the emulation preview below, it does not affect the
                  signed message.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          className="w-32"
          value={relayGasInput}
          onChange={(e) => setRelayGasInput(e.target.value)}
        />
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

      {tonWallet && !tonWallet.getSignedInternalCell && (
        <div className="text-red-500">
          signMessage is not supported for {wallet.type} wallets, only v5R1.
        </div>
      )}

      {password ? (
        <>
          <div className="flex items-center gap-2 my-2">
            <BlueButton variant={'outline'} onClick={rejectConnectMessage}>
              Reject
            </BlueButton>
            <BlueButton
              onClick={approveConnectMessage}
              className={cn('bg-green-500', 'disabled:bg-gray-400')}
              disabled={!walletKeyPair || !tonWallet?.getSignedInternalCell || isSigning}
            >
              {isSigning ? 'Signing...' : 'Sign'}
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
        unsignedExternal={undefined}
        signedExternal={undefined}
      />
    </Block>
  )
})
