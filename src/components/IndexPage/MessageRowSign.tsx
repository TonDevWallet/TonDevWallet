import { TonConnectMessageTransaction } from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
import { useDecryptWalletData, usePassword } from '@/store/passwordManager'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import {
  ApproveTonConnectMessageTransaction,
  RejectTonConnectMessageTransaction,
} from '@/utils/tonConnect'
import { ImmutableObject, State } from '@hookstate/core'
import { memo, useMemo } from 'react'
import { LiteClient } from 'ton-lite-client'
import { Block } from '../ui/Block'
import { secretKeyToED25519 } from '@/utils/ed25519'

export const MessageRowSign = memo(function MessageRowSign({
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

  return <Block className="">Sign Block</Block>
})
