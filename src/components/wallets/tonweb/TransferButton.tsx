import { useState } from 'react'
import { IWallet } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import SendTon from './SendTon'
import { Key } from '@/types/Key'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'

export default function TransferButton({
  wallet,
  selectedKey,
}: {
  wallet: IWallet
  selectedKey: Key
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer TON</DialogTitle>
        </DialogHeader>
        <SendTon wallet={wallet} selectedKey={selectedKey} />
      </DialogContent>
    </Dialog>
  )
}
