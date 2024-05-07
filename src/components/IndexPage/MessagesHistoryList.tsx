import { TonConnectMessageTransaction } from '@/store/connectMessages'
import { MessageHistoryRow } from './MessageHistoryRow'
import { useDatabase } from '@/db'
import { useEffect, useState } from 'react'
import { ConnectMessageTransaction } from '@/types/connect'

export function MessagesHistoryList() {
  const db = useDatabase()
  const [messages, setMessages] = useState<TonConnectMessageTransaction[]>([])
  useEffect(() => {
    const f = async () => {
      const dbMessages = await db<ConnectMessageTransaction>('connect_message_transactions')
        .where({
          status: 1,
        })
        .orderBy('id', 'desc')
        .select('*')

      const messages: TonConnectMessageTransaction[] = dbMessages.map((m) => {
        return {
          id: m.id,
          // saved_wallet_id: m.saved_wallet_id,
          connect_session_id: m.connect_session_id,
          connect_event_id: m.connect_event_id,
          status: m.status,
          key_id: m.key_id,
          wallet_id: m.wallet_id,
          payload: JSON.parse(m.payload),
        }
      })

      setMessages(messages)
    }
    f()
  }, [])

  return (
    <div className="overflow-x-hidden mb-8 flex flex-col gap-4 max-w-lg mx-auto">
      {messages.map((s) => {
        return <MessageHistoryRow connectMessage={s} key={s.id} />
      })}
    </div>
  )
}
