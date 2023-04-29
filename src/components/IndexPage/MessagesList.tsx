import { useMessagesState } from '@/store/connectMessages'
import { MessageRow } from './MessageRow'

export function MessagesList() {
  // const sessions = useTonConnectSessions()
  const messages = useMessagesState()

  return (
    <div className="overflow-x-hidden">
      <h3 className="text-lg mb-2">Messages:</h3>
      {messages.map((s) => {
        return <MessageRow s={s} key={s.id.get()} />
      })}
    </div>
  )
}
