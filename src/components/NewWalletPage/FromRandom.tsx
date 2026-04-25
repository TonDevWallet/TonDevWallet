import { useSeed } from '@/hooks/useKeyPair'
import { saveKeyFromData } from '@/store/walletsListState'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mnemonicToSeed, mnemonicNew } from '@ton/crypto'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRefresh } from '@fortawesome/free-solid-svg-icons'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { WalletNameInput, ImportButton, KeyInfoDisplay, HiddenSecretValue } from './shared'
import { generateFireblocksPrivateKey } from '@/utils/fireblocks'
import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
ed.etc.sha512Sync = sha512

export function FromRandom() {
  const navigate = useNavigate()

  const [words, setWords] = useState('')
  const [seed, setSeed] = useState<Buffer | undefined>()
  const [fireblocksPrivateKey, setFireblocksPrivateKey] = useState<string | undefined>()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const generateNewMnemonic = async () => {
    try {
      setIsLoading(true)
      try {
        const mnemonic = await mnemonicNew()
        // Directly set words without calling onWordsChange to avoid clearing seed temporarily
        setWords(mnemonic.join(' '))

        // Process seed from mnemonic
        const ls = (await mnemonicToSeed(mnemonic, 'TON default seed')).subarray(0, 32)

        const fireblocksPrivateKey = generateFireblocksPrivateKey(ls)

        setFireblocksPrivateKey(fireblocksPrivateKey.toString('hex'))
        setSeed(ls)
        return
      } catch (error) {
        console.error('Error generating mnemonic:', error)
      }
      throw new Error('Failed to generate mnemonic')
    } catch (error) {
      console.error('Error generating mnemonic:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (words === '') {
      generateNewMnemonic()
    }
  }, [])

  const walletKeyPair = useSeed(seed)

  const saveSeed = async () => {
    if (!seed || seed.length !== 32) {
      throw new Error('Seed must be 64 characters')
    }

    try {
      setIsLoading(true)
      await saveKeyFromData(name || '', navigate, seed, undefined, words)
    } catch (error) {
      console.error('Error saving wallet:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <InfoCircledIcon className="h-4 w-4" />
        <AlertTitle>Important Security Information</AlertTitle>
        <AlertDescription>
          Save your mnemonic phrase in a secure location. Anyone with access to this phrase can
          control your wallet.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Generate New Wallet</h3>
        <Button
          onClick={generateNewMnemonic}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faRefresh} className={isLoading ? 'animate-spin' : ''} />
          Regenerate
        </Button>
      </div>

      {seed && (
        <div className="space-y-6">
          <HiddenSecretValue
            label="Mnemonic Phrase"
            value={words}
            multiline
            description="This is your 24-word recovery phrase. Hidden by default; reveal only in a private environment."
          />

          <Separator />

          <KeyInfoDisplay
            seed={seed.toString('hex')}
            publicKey={walletKeyPair?.publicKey ? walletKeyPair.publicKey : new Uint8Array(0)}
            fireblocksPrivateKey={fireblocksPrivateKey}
          />

          <Separator />

          <div className="space-y-4">
            <WalletNameInput
              name={name}
              onNameChange={setName}
              placeholder="My TON Wallet"
              autoComplete={false}
            />

            <ImportButton
              onClick={saveSeed}
              isLoading={isLoading}
              selectedWalletsCount={0}
              defaultText="Save Wallet"
              name={name}
            />
          </div>

          <div className="h-10"></div>
        </div>
      )}
    </div>
  )
}
