import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { IWallet } from '@/types'
import { FindActiveWalletsContent } from './FindActiveWalletsContent'

interface FindActiveWalletsModalProps {
  keyName: string
  keyId: number
  existingWallets: Array<{ wallet: IWallet; keyName: string; keyId: number }>
}

export function FindActiveWalletsModal({
  keyName,
  keyId,
  existingWallets,
}: FindActiveWalletsModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FontAwesomeIcon icon={faSearch} className="mr-2" />
          Find Active Wallets
        </Button>
      </DialogTrigger>

      {open && (
        <FindActiveWalletsContent
          keyName={keyName}
          keyId={keyId}
          existingWallets={existingWallets}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  )
}
