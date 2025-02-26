import { useSeed } from '@/hooks/useKeyPair'
import { saveKeyFromData } from '@/store/walletsListState'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mnemonicToSeed, mnemonicNew } from '@ton/crypto'
import Copier from '../copier'
import { cn } from '@/utils/cn'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRefresh, faKey, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import clipboard from 'clipboardy'

export function FromRandom() {
  const navigate = useNavigate()

  const [words, setWords] = useState('')
  const [seed, setSeed] = useState<Buffer | undefined>()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const generateNewMnemonic = async () => {
    try {
      setIsLoading(true)
      const mnemonic = await mnemonicNew()
      // Directly set words without calling onWordsChange to avoid clearing seed temporarily
      setWords(mnemonic.join(' '))

      // Process seed from mnemonic
      const ls = (await mnemonicToSeed(mnemonic, 'TON default seed')).subarray(0, 32)
      setSeed(ls)
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
      await saveKeyFromData(name || '', navigate, seed, words)
    } catch (error) {
      console.error('Error saving wallet:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyMnemonicToClipboard = () => {
    clipboard.write(words)
    setCopySuccess(true)

    // Reset copy success state after animation duration
    setTimeout(() => {
      setCopySuccess(false)
    }, 1500)
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="mnemonicInput">
                Mnemonic Phrase:
              </label>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 text-xs flex items-center gap-1 transition-colors duration-300',
                  copySuccess
                    ? 'text-green-600 bg-green-50 border border-green-200'
                    : 'text-primary hover:bg-primary/5'
                )}
                onClick={copyMnemonicToClipboard}
              >
                {copySuccess ? (
                  <>
                    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-30"></span>
                      <FontAwesomeIcon icon={faCheck} className="relative text-green-600" />
                    </span>
                    <span className="animate-pulse">Copied!</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" />
                    Copy phrase
                  </>
                )}
              </Button>
            </div>
            <Textarea
              className="font-mono text-sm min-h-[100px] bg-muted/30"
              id="mnemonicInput"
              value={words}
              readOnly
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              This is your 24-word recovery phrase. Write it down and keep it safe.
            </p>
          </div>

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
                autoFocus
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
              {'Save Wallet'}
            </Button>
          </div>

          <div className="h-10"></div>
        </div>
      )}
    </div>
  )
}
