import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { Button } from '../ui/button'
import { useMessagesState } from '@/store/connectMessages'
import { RejectTonConnectMessageSign, RejectTonConnectMessageTransaction } from '@/utils/tonConnect'

interface RejectMessagesProps {
  label?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function RejectMessages({
  label = 'Reject all messages',
  variant = 'outline',
  size = 'sm',
}: RejectMessagesProps) {
  const messages = useMessagesState()

  const rejectAllMessages = () => {
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
    <Button
      variant={variant}
      size={size}
      className="gap-2 cursor-pointer"
      onClick={rejectAllMessages}
    >
      <FontAwesomeIcon icon={faTrash} />
      <span>{label}</span>
    </Button>
  )
}
