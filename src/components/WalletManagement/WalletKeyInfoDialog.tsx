import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faKey, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import Copier from '@/components/copier'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { getDatabase } from '@/db'
import { decryptWalletData, getPasswordInteractive } from '@/store/passwordManager'
import { deleteWallet as deleteKey } from '@/store/walletsListState'
import { WalletGroup } from './walletDisplay'

type SecretInfo = {
  seedHex?: string
  seedBase64?: string
  mnemonic?: string
}

function CopyableValue({
  label,
  value,
  secret = false,
}: {
  label: string
  value?: string
  secret?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-muted/45 px-3 py-2.5">
        <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed">
          {value || '—'}
        </code>
        {value && <Copier text={value} className="h-5 w-5 shrink-0" />}
      </div>
      {secret && <div className="text-[11px] text-muted-foreground">Keep this private.</div>}
    </div>
  )
}

export function WalletKeyInfoDialog({ group }: { group: WalletGroup }) {
  const [open, setOpen] = useState(false)
  const [secrets, setSecrets] = useState<SecretInfo | null>(null)
  const [secretError, setSecretError] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const publicKeyBase64 = group.key.public_key || ''
  const publicKeyHex = useMemo(() => {
    try {
      return publicKeyBase64 ? Buffer.from(publicKeyBase64, 'base64').toString('hex') : ''
    } catch {
      return ''
    }
  }, [publicKeyBase64])

  const resetPrivateState = () => {
    setSecrets(null)
    setSecretError('')
    setDeleteConfirmation('')
    setIsDeleting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetPrivateState()
  }

  const revealSecrets = async () => {
    setSecretError('')
    try {
      const password = await getPasswordInteractive()
      const decrypted = await decryptWalletData(password, group.key.encrypted)
      if (!decrypted?.seed && !decrypted?.mnemonic) {
        setSecretError('No encrypted secret data is stored for this key.')
        return
      }

      const seed = decrypted.seed ? Buffer.from(decrypted.seed) : undefined
      setSecrets({
        seedHex: seed?.toString('hex'),
        seedBase64: seed?.toString('base64'),
        mnemonic: decrypted.mnemonic,
      })
    } catch (error) {
      console.error('Failed to reveal key secrets:', error)
      setSecretError('Could not decrypt this key. Check the wallet password and try again.')
    }
  }

  const handleDeleteKey = async () => {
    if (deleteConfirmation !== group.keyName) return

    setIsDeleting(true)
    try {
      const db = await getDatabase()
      await deleteKey(db, group.keyId)
      toast({ title: 'Key deleted', description: `${group.keyName} was removed.` })
      setOpen(false)
    } catch (error) {
      console.error('Failed to delete key:', error)
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete this key.',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  const canDelete = deleteConfirmation === group.keyName && !isDeleting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-full">
          <FontAwesomeIcon icon={faKey} className="mr-2" />
          Key info
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl rounded-[28px] p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FontAwesomeIcon icon={faKey} className="text-muted-foreground" />
            {group.keyName}
          </DialogTitle>
          <DialogDescription>
            Key metadata, secret recovery data, and destructive key actions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 rounded-[24px] bg-muted/30 p-3 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">Key ID</span>
            <span className="font-mono">#{group.keyId}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">Mode</span>
            <span>{group.key.sign_type || 'ton'}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">Wallets</span>
            <span>{group.items.length}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">Secret</span>
            <span>{group.hasSecret ? 'Encrypted locally' : 'Watch-only'}</span>
          </div>
        </div>

        <div className="space-y-3">
          <CopyableValue label="Public key · base64" value={publicKeyBase64} />
          <CopyableValue label="Public key · hex" value={publicKeyHex} />
        </div>

        {secrets && (
          <div className="space-y-3 rounded-[24px] border border-destructive/20 bg-destructive/5 p-3">
            <div className="text-sm font-medium text-destructive">Secret key information</div>
            <CopyableValue label="Secret key · hex" value={secrets.seedHex} secret />
            <CopyableValue label="Secret key · base64" value={secrets.seedBase64} secret />
            {secrets.mnemonic && <CopyableValue label="Mnemonic" value={secrets.mnemonic} secret />}
          </div>
        )}

        {secretError && <div className="text-sm text-destructive">{secretError}</div>}

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={!group.hasSecret} className="rounded-full">
                <FontAwesomeIcon icon={faEye} className="mr-2" />
                Show secret key
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[24px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Reveal private key material?</AlertDialogTitle>
                <AlertDialogDescription>
                  Anyone with this secret key or mnemonic can control the funds. Continue only in a
                  private environment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => revealSecrets().catch(console.error)}>
                  Reveal secrets
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full text-destructive hover:text-destructive"
              >
                <FontAwesomeIcon icon={faTrashCan} className="mr-2" />
                Delete key
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[24px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this key and all its wallets?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the key, wallet contracts, TonConnect sessions, and pending local
                  wallet records. Type the key name to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={group.keyName}
                autoComplete="off"
              />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!canDelete}
                  onClick={() => handleDeleteKey().catch(console.error)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete key'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  )
}
