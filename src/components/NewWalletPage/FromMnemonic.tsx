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
import { mnemonicToSeed as bip39MnemonicToSeed } from 'bip39'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'

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

  const newWords = async (words: string, _mnemonicType: 'bip39' | 'ton' | null = null) => {
    try {
      setWords(words)
      setError(null)
      setSeed(undefined)

      const useMnemonicType = _mnemonicType || mnemonicType

      const mnemonic = words.split(' ')

      if (mnemonic.length !== 24 && mnemonic.length !== 12) {
        console.log('not enough words', mnemonic.length)
        return
      }

      if (useMnemonicType === 'bip39') {
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

  const onWordsChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    await newWords(e.target.value)
  }

  const handleMnemonicTypeChange = (value: string) => {
    const newType = value as 'ton' | 'bip39'
    setMnemonicType(newType)
    // setWords('')
    setSeed(undefined)
    setError(null)
    newWords(words, newType)
  }

  const walletKeyPair = useSeed(seed)

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
      await saveKeyFromData(name || '', navigate, seed, undefined, words, getSelectedWalletsArray())
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
          Enter your 12 or 24-word recovery phrase to restore access to your wallet. Make sure to
          select the correct format (TON or BIP39).
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2 flex gap-2 items-center">
          <Label className="text-sm font-medium mb-0">Mnemonic Type: </Label>
          <RadioGroup
            defaultValue="ton"
            value={mnemonicType}
            onValueChange={handleMnemonicTypeChange}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ton" id="r-ton" className="cursor-pointer" />
              <Label htmlFor="r-ton" className="font-normal cursor-pointer">
                TON default
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bip39" id="r-bip39" className="cursor-pointer" />
              <Label htmlFor="r-bip39" className="font-normal cursor-pointer">
                BIP39 standard
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mnemonicInput" className="text-sm font-medium">
            Recovery Phrase ({mnemonicType === 'ton' ? 'TON' : 'BIP39'})
          </Label>
          <Textarea
            className="font-mono text-sm min-h-[100px]"
            id="mnemonicInput"
            onChange={onWordsChange}
            value={words}
            spellCheck={false}
            autoFocus
            placeholder={`Enter your ${mnemonicType === 'ton' ? '24' : '12 or 24'}-word mnemonic phrase separated by spaces...`}
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Words should be separated by single spaces. The phrase is case-sensitive.
          </p>
        </div>
      </div>

      {seed && walletKeyPair && (
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
