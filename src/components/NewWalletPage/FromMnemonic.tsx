import { useSeed } from '@/hooks/useKeyPair'
import { saveKeyFromData } from '@/store/walletsListState'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mnemonicValidate, mnemonicToSeed, keyPairFromSeed, deriveEd25519Path } from '@ton/crypto'
import { Textarea } from '../ui/textarea'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { ActiveWalletsSelector } from './ActiveWalletsSelector'
import { WalletNameInput, ImportButton, useWalletSelection, KeyInfoDisplay } from './shared'
import Copier from '../copier'
import { cn } from '@/utils/cn'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
  mnemonicToSeed as bip39MnemonicToSeed,
  validateMnemonic as validBip39Mnemonic,
} from 'bip39'

async function bip39ToPrivateKey(mnemonic: string[]) {
  const seed = await bip39MnemonicToSeed(mnemonic.join(' '))
  const TON_DERIVATION_PATH = [44, 607, 0]
  const seedContainer = await deriveEd25519Path(seed, TON_DERIVATION_PATH)
  return keyPairFromSeed(seedContainer.subarray(0, 32))
}

export function FromMnemonic() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [words, setWords] = useState('')
  const [seed, setSeed] = useState<Buffer | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mnemonicType, setMnemonicType] = useState<'bip39' | 'ton'>('ton')

  const onWordsChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      setWords(e.target.value)
      setError(null)
      setSeed(undefined)

      const mnemonic = e.target.value.split(' ')
      console.log('checking mnemonic', mnemonicType, mnemonic)

      if (mnemonic.length !== 24 && mnemonic.length !== 12) {
        console.log('not enough words', mnemonic.length)
        return // Not enough words yet
      }

      if (mnemonicType === 'bip39') {
        try {
          const ls = await bip39ToPrivateKey(mnemonic)
          setSeed(ls.secretKey.subarray(0, 32))
          return
        } catch (e) {
          console.log('invalid bip39 mnemonic', e)
          setError('Invalid bip39 mnemonic phrase. Please check for typos.')
          return
        }
      }

      if (await mnemonicValidate(mnemonic)) {
        const ls = (await mnemonicToSeed(mnemonic, 'TON default seed')).subarray(0, 32)
        setSeed(ls)
      } else {
        console.log('invalid ton mnemonic')
        setError('Invalid ton mnemonic phrase. Please check for typos.')
      }
    } catch (e) {
      console.log('onWordsChange error', e)
      setError('Error validating mnemonic phrase')
    }
  }

  const walletKeyPair = useSeed(seed)

  // Use the wallet selection hook
  const {
    selectedWallets,
    activeWallets,
    totalWallets,
    isSearching,
    findActiveWallets,
    handleSelectWallet,
    getSelectedWalletsArray,
  } = useWalletSelection(walletKeyPair?.publicKey ? walletKeyPair.publicKey : Buffer.from([]))

  const saveSeed = async () => {
    if (!seed || seed.length !== 32) {
      setError('Seed must be 64 characters')
      return
    }

    try {
      setIsLoading(true)
      await saveKeyFromData(name || '', navigate, seed, words, getSelectedWalletsArray())
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
        <AlertTitle>Enter Your Recovery Phrase</AlertTitle>
        <AlertDescription>
          Enter your 24-word recovery phrase to restore access to your wallet.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium">Mnemonic Type:</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mnemonicType"
                value="ton"
                checked={mnemonicType === 'ton'}
                onChange={(e) => setMnemonicType(e.target.value as 'ton' | 'bip39')}
              />
              TON
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mnemonicType"
                value="bip39"
                checked={mnemonicType === 'bip39'}
                onChange={(e) => setMnemonicType(e.target.value as 'ton' | 'bip39')}
              />
              BIP39
            </label>
          </div>
        </div>

        <Textarea
          className="font-mono text-sm min-h-[100px]"
          id="mnemonicInput"
          onChange={onWordsChange}
          value={words}
          spellCheck={false}
          autoFocus
          placeholder="Enter your 24-word mnemonic phrase separated by spaces..."
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Words should be separated by spaces. The phrase is case-sensitive.
        </p>
      </div>

      {seed && (
        <div className="space-y-6">
          <Separator />

          <KeyInfoDisplay
            seed={seed.toString('hex')}
            publicKey={walletKeyPair?.publicKey ? walletKeyPair.publicKey : new Uint8Array(0)}
          />

          <Separator />

          <div className="space-y-4">
            <WalletNameInput name={name} onNameChange={setName} placeholder="My TON Wallet" />

            {walletKeyPair?.publicKey && (
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
              defaultText="Restore Wallet"
              name={name}
            />
          </div>

          <div className="h-10"></div>
        </div>
      )}
    </div>
  )
}
