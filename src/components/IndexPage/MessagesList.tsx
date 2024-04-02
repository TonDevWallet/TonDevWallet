import { useMessagesState } from '@/store/connectMessages'
import { MessageRow } from './MessageRow'

export function MessagesList() {
  // const sessions = useTonConnectSessions()
  const messages = useMessagesState()

  return (
    <div className="overflow-x-hidden mb-8 flex flex-col gap-4 mx-auto">
      {messages.map((s) => {
        return <MessageRow s={s} key={s.id.get()} />
      })}
    </div>
  )
}
