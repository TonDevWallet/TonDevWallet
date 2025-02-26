import { saveKeyFromData } from '@/store/walletsListState'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Copier from '../copier'
import { KeyPair } from '@ton/crypto'
import { cn } from '@/utils/cn'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'

export function FromSeed() {
  const navigate = useNavigate()

  const [seed, setSeed] = useState('')
  const [keyPair, setParsedSeed] = useState<KeyPair | undefined>(undefined)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onWordsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const data = e.target.value
      setSeed(data)
      setParsedSeed(undefined)
      setError(null)

      // Only attempt to parse if we have a 64-character hex string
      if (data.length === 64 && /^[0-9a-fA-F]+$/.test(data)) {
        try {
          const parsed = secretKeyToED25519(Buffer.from(data, 'hex'))
          if (parsed) {
            setParsedSeed(parsed)
          }
        } catch (e) {
          setError('Invalid seed format')
        }
      } else if (data.length > 0 && (data.length !== 64 || !/^[0-9a-fA-F]+$/.test(data))) {
        setError('Seed must be a 64-character hex string')
      }
    } catch (e) {
      console.log('onWordsChange error', e)
      setError('Error processing seed')
    }
  }

  const saveSeed = async () => {
    if (!name) {
      setError('Please enter a wallet name')
      return
    }
    if (seed.length !== 64) {
      setError('Seed must be 64 characters')
      return
    }

    try {
      setIsLoading(true)
      await saveKeyFromData(name || '', navigate, Buffer.from(seed, 'hex'))
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
        <AlertTitle>Import from Seed</AlertTitle>
        <AlertDescription>
          Enter your 64-character hexadecimal seed to import your wallet.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="seedInput">
          Seed (64 hex characters):
        </label>
        <Input
          className="font-mono text-sm"
          id="seedInput"
          onChange={onWordsChange}
          value={seed}
          autoFocus
          placeholder="Enter your 64-character hexadecimal seed..."
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        <p className="text-xs text-muted-foreground">
          The seed should be a 64-character hexadecimal string. Only enter this if you know what
          you're doing.
        </p>
      </div>

      {keyPair && (
        <div className="space-y-6">
          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FontAwesomeIcon icon={faKey} className="text-primary" />
                Seed:
              </label>
              <div className="flex items-center p-2 bg-muted rounded-md">
                <code className="text-xs overflow-hidden text-ellipsis font-mono break-all">
                  {seed}
                </code>
                <Copier className="w-5 h-5 ml-2 shrink-0" text={seed || ''} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FontAwesomeIcon icon={faKey} className="text-primary" />
                Public Key:
              </label>
              <div className="flex items-center p-2 bg-muted rounded-md">
                <code className="text-xs overflow-hidden text-ellipsis font-mono break-all">
                  {Buffer.from(keyPair?.publicKey || []).toString('hex')}
                </code>
                <Copier
                  className="w-5 h-5 ml-2 shrink-0"
                  text={Buffer.from(keyPair?.publicKey || []).toString('hex')}
                />
              </div>
            </div>
          </div>

          <Separator />

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
                placeholder="My TON Wallet"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Give your wallet a name to easily identify it later
              </p>
            </div>

            <Button
              onClick={saveSeed}
              className={cn('', !name && 'opacity-50')}
              disabled={!name || isLoading}
              size="lg"
            >
              {isLoading ? 'Saving...' : 'Import Wallet'}
            </Button>
          </div>

          <div className="h-10"></div>
        </div>
      )}
    </div>
  )
}
