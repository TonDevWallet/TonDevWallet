import { useSeed } from '@/hooks/useKeyPair'
import { saveKeyFromData } from '@/store/walletsListState'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mnemonicValidate, mnemonicToSeed } from '@ton/crypto'
import Copier from '../copier'
import { cn } from '@/utils/cn'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'

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

  const saveSeed = async () => {
    if (!seed || seed.length !== 32) {
      setError('Seed must be 64 characters')
      return
    }

    try {
      setIsLoading(true)
      await saveKeyFromData(name || '', navigate, seed, words)
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FontAwesomeIcon icon={faKey} className="text-primary" />
                Seed:
              </label>
              <div className="flex items-center p-2 bg-muted rounded-md">
                <code className="text-xs overflow-hidden text-ellipsis font-mono break-all">
                  {seed.toString('hex')}
                </code>
                <Copier className="w-5 h-5 ml-2 shrink-0" text={seed.toString('hex') || ''} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FontAwesomeIcon icon={faKey} className="text-primary" />
                Public Key:
              </label>
              <div className="flex items-center p-2 bg-muted rounded-md">
                <code className="text-xs overflow-hidden text-ellipsis font-mono break-all">
                  {Buffer.from(walletKeyPair?.publicKey || []).toString('hex')}
                </code>
                <Copier
                  className="w-5 h-5 ml-2 shrink-0"
                  text={Buffer.from(walletKeyPair?.publicKey || []).toString('hex')}
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
              {isLoading ? 'Saving...' : 'Restore Wallet'}
            </Button>
          </div>

          <div className="h-10"></div>
        </div>
      )}
    </div>
  )
}
