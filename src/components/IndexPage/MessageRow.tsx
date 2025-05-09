import { TonConnectMessageRecord } from '@/store/connectMessages'
import { ImmutableObject, State } from '@hookstate/core'
import { memo } from 'react'
import { MessageRowTx } from './MessageRowTx'
import { MessageRowSign } from './MessageRowSign'

export const MessageRow = memo(function MessageRow({
  s,
}: {
  s: State<ImmutableObject<TonConnectMessageRecord>>
}) {
  if (s.message_type.get() === 'tx') {
    return <MessageRowTx s={s as any} />
  }
  if (s.message_type.get() === 'sign') {
    return <MessageRowSign s={s as any} />
  }
  return <div>Unknown type: "{s.message_type.get()}"</div>
})
