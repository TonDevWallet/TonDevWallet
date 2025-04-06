import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { savePublicKeyOnly } from '@/store/walletsListState'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'
import { useFindActiveWallets } from '@/hooks/useFindActiveWallets'
import { ActiveWalletsSelector } from './ActiveWalletsSelector'
import { Separator } from '../ui/separator'

export function FromPublicKey() {
  const navigate = useNavigate()

  const [publicKey, setPublicKey] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWallets, setSelectedWallets] = useState<string[]>([])

  // Function to decode public key (handles both hex and base64)
  const publicKeyBuffer = useMemo(() => {
    if (!publicKey) return Buffer.from([])

    const normalizedPublicKey = publicKey.replace(/^0x/i, '')

    try {
      // Try base64 first
      const base64Key = Buffer.from(normalizedPublicKey, 'base64')
      if (base64Key.length === 32) {
        return base64Key
      }

      // Try hex
      const hexKey = Buffer.from(normalizedPublicKey, 'hex')
      if (hexKey.length === 32) {
        return hexKey
      }

      return Buffer.from([])
    } catch (e) {
      return Buffer.from([])
    }
  }, [publicKey])

  // Validate if the public key is valid
  const isValidPublicKey = useMemo(() => {
    return publicKeyBuffer.length === 32
  }, [publicKeyBuffer])

  // Use the hook if we have a valid public key
  const { activeWallets, totalWallets, isSearching, findActiveWallets } = useFindActiveWallets(
    isValidPublicKey ? publicKeyBuffer : Buffer.from([])
  )

  // Reset selected wallets when public key changes
  useEffect(() => {
    setSelectedWallets([])
  }, [publicKey])

  // Toggle wallet selection
  const handleSelectWallet = (walletId: string, selected: boolean) => {
    if (selected) {
      setSelectedWallets((prev) => [...prev, walletId])
    } else {
      setSelectedWallets((prev) => prev.filter((id) => id !== walletId))
    }
  }

  const onPublicKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPublicKey(e.target.value)
    setError(null)
  }

  const savePublicKey = async () => {
    if (!publicKey) {
      setError('Please enter a public key')
      return
    }

    if (!name) {
      setError('Please enter a wallet name')
      return
    }

    if (!isValidPublicKey) {
      setError('Invalid public key format. Public key should be 32 bytes')
      return
    }

    try {
      setIsLoading(true)
      await savePublicKeyOnly(name, navigate, publicKey)
    } catch (error: any) {
      console.error('Error saving wallet:', error)
      setError(error.message || 'Error saving wallet')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <InfoCircledIcon className="h-4 w-4" />
        <AlertTitle>Add View-Only Wallet</AlertTitle>
        <AlertDescription>
          Enter a wallet public key to create a view-only wallet. You won't be able to sign
          transactions.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2" htmlFor="publicKeyInput">
          <FontAwesomeIcon icon={faKey} className="text-primary" />
          Public Key (base64 or hex):
        </label>
        <Input
          className="font-mono text-sm"
          id="publicKeyInput"
          onChange={onPublicKeyChange}
          value={publicKey}
          autoFocus
          placeholder="Enter the public key..."
          autoComplete="off"
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        <p className="text-xs text-muted-foreground">
          This creates a view-only wallet. You won't be able to sign transactions.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="nameRef" aria-autocomplete="none">
            Wallet Name:
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            id="nameRef"
            className="max-w-md"
            placeholder="My View-Only Wallet"
            autoComplete="off"
            aria-autocomplete="none"
          />
          <p className="text-xs text-muted-foreground">
            Give your wallet a name to easily identify it later
          </p>
        </div>

        {isValidPublicKey && (
          <ActiveWalletsSelector
            activeWallets={activeWallets}
            totalWallets={totalWallets}
            isSearching={isSearching}
            selectedWallets={selectedWallets}
            onSelectWallet={handleSelectWallet}
            onRefresh={findActiveWallets}
          />
        )}

        <Separator className="my-6" />

        <Button
          onClick={savePublicKey}
          disabled={!name || !publicKey || !isValidPublicKey || isLoading}
          size="lg"
        >
          {isLoading
            ? 'Saving...'
            : selectedWallets.length > 0
              ? `Import ${selectedWallets.length} Selected Wallet${selectedWallets.length > 1 ? 's' : ''}`
              : 'Add View-Only Wallet'}
        </Button>

        <div className="my-6" />
      </div>
    </div>
  )
}
