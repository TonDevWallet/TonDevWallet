import { MessagesList } from './MessagesList'
import { SessionsList } from './SessionsList'

export function IndexPage() {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2 mr-2">
      <SessionsList />
      <MessagesList />

      {/* <div className="w-1/2">
        <SessionsList />
      </div>
      <div className="w-1/2">
        <MessagesList />
      </div> */}
    </div>
  )
}
