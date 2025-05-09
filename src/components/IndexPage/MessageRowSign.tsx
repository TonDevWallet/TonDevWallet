import { TonConnectMessageSign } from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
import { openPasswordPopup, useDecryptWalletData, usePassword } from '@/store/passwordManager'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { ApproveTonConnectMessageSign, RejectTonConnectMessageSign } from '@/utils/tonConnect'
import { ImmutableObject, State } from '@hookstate/core'
import { memo, useMemo } from 'react'
import { LiteClient } from 'ton-lite-client'
import { Block } from '@/components/ui/Block'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { TextPayloadView, BinaryPayloadView, CellPayloadView } from './SignPayloads'
import { BlueButton } from '../ui/BlueButton'
import { cn } from '@/utils/cn'

export const MessageRowSign = memo(function MessageRowSign({
  s,
}: {
  s: State<ImmutableObject<TonConnectMessageSign>>
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

  const signPayload = s.sign_payload.get()

  const rejectConnectMessage = () => {
    RejectTonConnectMessageSign({
      message: s.get(),
      session: session?.get(),
    })
  }

  const approveConnectMessage = async () => {
    await ApproveTonConnectMessageSign({
      message: s.get(),
      session: session?.get(),
      key: key?.get(),
      liteClient,
      walletKeyPair: walletKeyPair || { secretKey: Buffer.from([]) },
    })
  }

  const renderPayload = () => {
    if (!signPayload) return null

    switch (signPayload.type) {
      case 'text':
        return <TextPayloadView payload={signPayload} />
      case 'binary':
        return <BinaryPayloadView payload={signPayload} />
      case 'cell':
        return <CellPayloadView payload={signPayload} />
      default:
        return <div>Unknown payload type</div>
    }
  }

  return (
    <Block className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Signature Request</h3>
        <div className="text-sm text-gray-500 mb-1">From: {session?.url.get()}</div>
        <div className="text-sm text-gray-500">Wallet: {wallet.name}</div>
      </div>

      {renderPayload()}

      {password ? (
        <>
          <div className="flex items-center gap-2 my-2">
            <BlueButton variant={'outline'} onClick={rejectConnectMessage}>
              Reject
            </BlueButton>
            <BlueButton
              onClick={approveConnectMessage}
              className={cn('bg-green-500', 'disabled:bg-gray-400')}
              disabled={!walletKeyPair}
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
    </Block>
  )
})
