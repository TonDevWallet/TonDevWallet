import { useMessagesState } from '@/store/connectMessages'
import { MessageRow } from './MessageRow'
import { useWalletListState } from '@/store/walletsListState'
import { useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { Button } from '../ui/button'
import { RejectTonConnectMessageSign, RejectTonConnectMessageTransaction } from '@/utils/tonConnect'

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

  const rejectAllInvalidMessages = () => {
    messages.forEach((msg) => {
      const s = msg.get({ noproxy: true })
      if (s.message_type === 'tx') {
        RejectTonConnectMessageTransaction({
          message: s,
        })
      } else if (s.message_type === 'sign') {
        RejectTonConnectMessageSign({
          message: s,
        })
      }
    })
  }

  return (
    <div className="overflow-x-hidden mb-8 flex flex-col gap-4 mx-auto">
      {validMessagesCount > 0 ? (
        messages.map((s) => {
          return <MessageRow s={s} key={s.id.get()} />
        })
      ) : messages.length > 0 ? (
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          <div className="text-sm text-muted-foreground">No valid messages</div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 cursor-pointer"
            onClick={rejectAllInvalidMessages}
          >
            <FontAwesomeIcon icon={faTrash} />
            <span>Reject all invalid messages</span>
          </Button>
        </div>
      ) : (
        <div className="w-full flex items-center justify-center">
          <div className="text-sm text-muted-foreground">No messages</div>
        </div>
      )}
    </div>
  )
}
