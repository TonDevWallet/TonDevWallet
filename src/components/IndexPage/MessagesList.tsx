import { useMessagesState } from '@/store/connectMessages'
import { MessageRow } from './MessageRow'
import { useWalletListState } from '@/store/walletsListState'
import { useMemo } from 'react'
import { RejectMessages } from './RejectMessages'
import { ErrorBoundary } from 'react-error-boundary'

export function MessagesList() {
  // const sessions = useTonConnectSessions()
  const messages = useMessagesState()
  const keys = useWalletListState()

  const validMessages = useMemo(() => {
    return messages.filter((s) => {
      const key = keys.find((k) => k.id.get() === s.key_id.get())
      if (!key) {
        return false
      }
      const wallet = key.wallets.get()?.find((w) => w.id === s.wallet_id.get())
      if (!wallet) {
        return false
      }
      return true
    })
  }, [messages, keys])
  const validMessagesCount = useMemo(() => {
    return validMessages.length
  }, [validMessages])

  return (
    <div className="overflow-x-hidden mb-8 flex flex-col gap-4 mx-auto">
      {validMessagesCount > 0 ? (
        <>
          <div>
            <div>
              {messages.map((s) => {
                return (
                  <ErrorBoundary fallbackRender={() => <div>Could not display message</div>}>
                    <MessageRow s={s} key={s.id.get()} />
                  </ErrorBoundary>
                )
              })}
            </div>
          </div>
        </>
      ) : messages.length > 0 ? (
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          <div className="text-sm text-muted-foreground">No valid messages</div>
          <RejectMessages label="Reject all invalid messages" />
        </div>
      ) : (
        <div className="w-full flex items-center justify-center">
          <div className="text-sm text-muted-foreground">No messages</div>
        </div>
      )}
    </div>
  )
}
