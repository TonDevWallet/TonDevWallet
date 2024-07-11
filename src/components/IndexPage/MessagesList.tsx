import { useMessagesState } from '@/store/connectMessages'
import { MessageRow } from './MessageRow'

export function MessagesList() {
  const messages = useMessagesState()

  return (
    <div className="overflow-x-hidden mb-8 flex flex-col gap-4 mx-auto p-4 bg-gray-100 dark:bg-gray-900 rounded-lg shadow-md">
      {messages.map((s) => {
        return <MessageRow s={s} key={s.id.get()} />
      })}
    </div>
  )
}
