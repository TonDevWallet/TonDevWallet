import { useSeed } from '@/hooks/useKeyPair'
import { saveKeyFromData } from '@/store/walletsListState'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mnemonicValidate, mnemonicToSeed } from '@ton/crypto'
import { Textarea } from '../ui/textarea'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { ActiveWalletsSelector } from './ActiveWalletsSelector'
import { WalletNameInput, ImportButton, useWalletSelection, KeyInfoDisplay } from './shared'

export function FromMnemonic() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [words, setWords] = useState('')
  const [seed, setSeed] = useState<Buffer | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onWordsChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      setWords(e.target.value)
      setError(null)
      setSeed(undefined)

      const mnemonic = e.target.value.split(' ')

      if (mnemonic.length !== 24) {
        return // Not enough words yet
      }

      if (await mnemonicValidate(mnemonic)) {
        const ls = (await mnemonicToSeed(mnemonic, 'TON default seed')).subarray(0, 32)
        setSeed(ls)
      } else {
        setError('Invalid mnemonic phrase. Please check for typos.')
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

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="mnemonicInput">
          Mnemonic Phrase (24 words):
        </label>
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
