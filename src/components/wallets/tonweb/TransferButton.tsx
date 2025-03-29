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

export default function TransferButton({ wallet }: { wallet: IWallet }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline" size="sm">
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer TON</DialogTitle>
        </DialogHeader>
        <SendTon wallet={wallet} />
      </DialogContent>
    </Dialog>
  )
}
