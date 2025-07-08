import { saveKeyFromData } from '@/store/walletsListState'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyPair } from '@ton/crypto'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { ActiveWalletsSelector } from './ActiveWalletsSelector'
import { WalletNameInput, ImportButton, useWalletSelection, KeyInfoDisplay } from './shared'
import { Checkbox } from '../ui/checkbox'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'

export function FromSeed() {
  const navigate = useNavigate()

  const [seed, setSeed] = useState('')
  const [keyPair, setParsedSeed] = useState<KeyPair | undefined>(undefined)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usePublicKeyOverride, setUsePublicKeyOverride] = useState(false)
  const [publicKeyOverride, setPublicKeyOverride] = useState('')
  const [derivedKeyPair, setDerivedKeyPair] = useState<KeyPair | undefined>(undefined)
  const [signType, setSignType] = useState<'ton' | 'fireblocks'>('ton')

  const onWordsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const data = e.target.value
      setSeed(data)
      setParsedSeed(undefined)
      setDerivedKeyPair(undefined)
      setError(null)

      // Only attempt to parse if we have a 64-character hex string
      if (data.length === 64 && /^[0-9a-fA-F]+$/.test(data)) {
        try {
          const parsed = secretKeyToED25519(Buffer.from(data, 'hex'))
          if (parsed) {
            setDerivedKeyPair(parsed)
            // If not using override, use the derived keypair
            if (!usePublicKeyOverride) {
              setParsedSeed(parsed)
            }
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

  const onPublicKeyOverrideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPublicKeyOverride(value)
    setError(null)

    if (usePublicKeyOverride && seed.length === 64) {
      // Validate and create keypair with override
      if (value.length === 64 && /^[0-9a-fA-F]+$/.test(value)) {
        try {
          const privateKey = Buffer.from(seed, 'hex')
          const publicKey = Buffer.from(value, 'hex')
          const customKeyPair: KeyPair = {
            publicKey,
            secretKey: privateKey,
          }
          setParsedSeed(customKeyPair)
        } catch (e) {
          setError('Invalid public key format')
          setParsedSeed(undefined)
        }
      } else if (value.length > 0) {
        setError('Public key must be a 64-character hex string')
        setParsedSeed(undefined)
      } else {
        setParsedSeed(undefined)
      }
    }
  }

  const onUseOverrideChange = (checked: boolean) => {
    setUsePublicKeyOverride(checked)
    setError(null)

    if (checked) {
      // Clear the current keypair when enabling override
      setParsedSeed(undefined)
    } else {
      // Restore derived keypair when disabling override
      if (derivedKeyPair) {
        setParsedSeed(derivedKeyPair)
      }
      setPublicKeyOverride('')
    }
  }

  const publicKey = useMemo(() => {
    if (usePublicKeyOverride) {
      return Buffer.from(publicKeyOverride, 'hex')
    }
    return keyPair?.publicKey
  }, [usePublicKeyOverride, publicKeyOverride, keyPair])

  // Use the wallet selection hook
  const {
    selectedWallets,
    activeWallets,
    totalWallets,
    isSearching,
    findActiveWallets,
    handleSelectWallet,
    getSelectedWalletsArray,
  } = useWalletSelection(publicKey ?? Buffer.from([]))

  const saveSeed = async () => {
    if (!name) {
      setError('Please enter a wallet name')
      return
    }
    if (seed.length !== 64) {
      setError('Seed must be 64 characters')
      return
    }
    if (usePublicKeyOverride && publicKeyOverride.length !== 64) {
      setError('Public key override must be 64 characters')
      return
    }

    try {
      setIsLoading(true)
      await saveKeyFromData(
        name || '',
        navigate,
        Buffer.from(seed, 'hex'),
        usePublicKeyOverride ? Buffer.from(publicKeyOverride, 'hex') : undefined,
        undefined,
        getSelectedWalletsArray(),
        signType
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

      <div className="space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-medium">Signature Type:</label>
          <RadioGroup
            value={signType}
            onValueChange={(value: 'ton' | 'fireblocks') => setSignType(value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ton" id="signTypeTon" />
              <Label htmlFor="signTypeTon" className="cursor-pointer">
                TON (Default)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fireblocks" id="signTypeFireblocks" />
              <Label htmlFor="signTypeFireblocks" className="cursor-pointer">
                Fireblocks
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Select the signature type for this wallet. Use TON for standard wallets or Fireblocks
            for enterprise custody solutions.
          </p>
        </div>
      </div>

      {derivedKeyPair && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="usePublicKeyOverride"
              checked={usePublicKeyOverride}
              onCheckedChange={onUseOverrideChange}
            />
            <label htmlFor="usePublicKeyOverride" className="text-sm font-medium cursor-pointer">
              Override public key
            </label>
          </div>

          {usePublicKeyOverride && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="publicKeyInput">
                Public Key Override (64 hex characters):
              </label>
              <Input
                className="font-mono text-sm"
                id="publicKeyInput"
                onChange={onPublicKeyOverrideChange}
                value={publicKeyOverride}
                placeholder="Enter your 64-character hexadecimal public key..."
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Override the automatically derived public key with a custom one.
              </p>
              {derivedKeyPair && (
                <p className="text-xs text-muted-foreground">
                  Derived public key:{' '}
                  <span className="font-mono">{derivedKeyPair.publicKey.toString('hex')}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {keyPair && (
        <div className="space-y-6">
          <Separator />

          <KeyInfoDisplay seed={seed} publicKey={publicKey} />

          {usePublicKeyOverride && derivedKeyPair && (
            <Alert>
              <InfoCircledIcon className="h-4 w-4" />
              <AlertTitle>Public Key Override Active</AlertTitle>
              <AlertDescription>
                You are using a custom public key instead of the derived one. Make sure this is
                correct.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="space-y-4">
            <WalletNameInput name={name} onNameChange={setName} placeholder="My TON Wallet" />

            {publicKey && (
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
