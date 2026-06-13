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
import { getWalletFromKey } from '@/utils/wallets'
import { ImmutableObject, State } from '@hookstate/core'
import { memo, useMemo, useState } from 'react'
import { LiteClient } from 'ton-lite-client'
import { SendMode } from '@ton/core'
import { AddressRow } from '../AddressRow'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'
import { cn } from '@/utils/cn'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { formatUnits } from '@/utils/units'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'

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

  const totalAmount = useMemo(() => {
    return transfers.reduce((acc, t) => acc + t.amount, 0n)
  }, [transfers])

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

      <div className="flex flex-col gap-1 my-2">
        {transfers.map((t, i) => (
          <div className="flex items-center gap-2" key={i}>
            <div className="w-40 shrink-0">Send {formatUnits(t.amount, 9)} TON to:</div>
            <AddressRow address={t.destination} />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div>Total:</div>
          <div className="break-words break-all">{formatUnits(totalAmount, 9)} TON</div>
        </div>
      </div>

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
    </Block>
  )
})
