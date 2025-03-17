import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { savePublicKeyOnly } from '@/store/walletsListState'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'

export function FromPublicKey() {
  const navigate = useNavigate()

  const [publicKey, setPublicKey] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        <p className="text-xs text-muted-foreground">
          This creates a view-only wallet. You won't be able to sign transactions.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="nameRef">
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
          />
          <p className="text-xs text-muted-foreground">
            Give your wallet a name to easily identify it later
          </p>
        </div>

        <Button onClick={savePublicKey} disabled={!name || !publicKey || isLoading} size="lg">
          {isLoading ? 'Saving...' : 'Add View-Only Wallet'}
        </Button>
      </div>
    </div>
  )
}
