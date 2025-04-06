import { saveKeyFromData } from '@/store/walletsListState'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyPair } from '@ton/crypto'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { ActiveWalletsSelector } from './ActiveWalletsSelector'
import { WalletNameInput, ImportButton, useWalletSelection, KeyInfoDisplay } from './shared'

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

  // Use the wallet selection hook
  const {
    selectedWallets,
    activeWallets,
    totalWallets,
    isSearching,
    findActiveWallets,
    handleSelectWallet,
    getSelectedWalletsArray,
  } = useWalletSelection(keyPair?.publicKey ? keyPair.publicKey : Buffer.from([]))

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
      await saveKeyFromData(
        name || '',
        navigate,
        Buffer.from(seed, 'hex'),
        undefined,
        getSelectedWalletsArray()
      )
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
          autoComplete="off"
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

          <KeyInfoDisplay seed={seed} publicKey={keyPair.publicKey} />

          <Separator />

          <div className="space-y-4">
            <WalletNameInput name={name} onNameChange={setName} placeholder="My TON Wallet" />

            {keyPair?.publicKey && (
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

            <ImportButton
              onClick={saveSeed}
              isLoading={isLoading}
              selectedWalletsCount={selectedWallets.length}
              defaultText="Import Wallet"
              name={name}
            />
          </div>

          <div className="h-10"></div>
        </div>
      )}
    </div>
  )
}
