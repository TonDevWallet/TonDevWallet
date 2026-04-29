import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'
import { Api } from 'tonapi-sdk-js'
import { savePublicKeyOnly } from '@/store/walletsListState'
import { ActiveWalletsSelector } from './ActiveWalletsSelector'
import { WalletNameInput, ImportButton, useWalletSelection } from './shared'
import { useLiteClientRequired, useTonapiClient } from '@/store/liteClient'
import { LiteClient } from 'ton-lite-client'
import { Address, Cell, parseTuple, TupleItemInt } from '@ton/core'
import { bigIntToBuffer } from '@/utils/ton'

const WATCH_ONLY_EXAMPLES = [
  'truecarry.ton',
  'UQDu6s_r9_wmgWm5QgZuIeLep2fiSg4ijxGcJ0Sw8g4_9lvI',
  '59089418492249048961399143694722107829232040459458677613496856076828826723430',
  '0x82a36cf91eb3e20c8bbe70ac9e488243e07eb9ab52d0abb91fef752c0e88e466',
]

async function getPublicKeyFromAddress(liteClient: LiteClient, addressValue: string) {
  const walletAddress = Address.parse(addressValue)
  const master = await liteClient.getMasterchainInfo()
  const result = await liteClient.runMethod(
    walletAddress,
    'get_public_key',
    Buffer.from([]),
    master.last
  )

  if (result.exitCode !== 0) {
    return Buffer.from([])
  }

  const resultCell = Cell.fromBase64(result.result as string)
  const resultTuple = parseTuple(resultCell)
  if (resultTuple.length !== 1) {
    return Buffer.from([])
  }

  const key = resultTuple[0] as TupleItemInt
  return bigIntToBuffer(key.value)
}

// Custom hook to process public key, wallet address, or TON DNS name
function usePublicKeyFromRaw(
  rawPublicKey: string,
  liteClient: LiteClient,
  tonapiClient?: Api<unknown>
) {
  const [publicKeyBuffer, setPublicKeyBuffer] = useState<Buffer>(Buffer.from([]))

  useEffect(() => {
    let isMounted = true

    const processPublicKey = async () => {
      const input = rawPublicKey.trim()
      if (!input) {
        setPublicKeyBuffer(Buffer.from([]))
        return
      }

      try {
        if (/^\d+$/.test(input)) {
          const decimalKey = bigIntToBuffer(BigInt(input))
          if (decimalKey.length === 32) {
            if (isMounted) setPublicKeyBuffer(decimalKey)
            return
          }
        }

        const normalizedPublicKey = input.replace(/^0x/i, '')

        const base64Key = Buffer.from(normalizedPublicKey, 'base64')
        if (base64Key.length === 32) {
          if (isMounted) setPublicKeyBuffer(base64Key)
          return
        }

        const hexKey = Buffer.from(normalizedPublicKey, 'hex')
        if (hexKey.length === 32) {
          if (isMounted) setPublicKeyBuffer(hexKey)
          return
        }
      } catch (e) {
        // Continue with address/DNS resolution.
      }

      try {
        if (/\.ton$/i.test(input) && tonapiClient) {
          const dnsRecord = await tonapiClient.dns.dnsResolve(input, { filter: true })
          const resolvedAddress = dnsRecord.wallet?.address || dnsRecord.wallet?.account?.address
          if (resolvedAddress) {
            const resolvedPublicKey = await getPublicKeyFromAddress(liteClient, resolvedAddress)
            if (resolvedPublicKey.length === 32) {
              if (isMounted) setPublicKeyBuffer(resolvedPublicKey)
              return
            }
          }
        }

        const resolvedPublicKey = await getPublicKeyFromAddress(liteClient, input)
        if (isMounted) {
          setPublicKeyBuffer(resolvedPublicKey.length === 32 ? resolvedPublicKey : Buffer.from([]))
        }
      } catch (e) {
        console.log('error', e)
        if (isMounted) setPublicKeyBuffer(Buffer.from([]))
      }
    }

    processPublicKey()

    return () => {
      isMounted = false
    }
  }, [rawPublicKey, liteClient, tonapiClient])

  const isValidPublicKey = useMemo(() => {
    return publicKeyBuffer.length === 32
  }, [publicKeyBuffer])

  return { publicKeyBuffer, isValidPublicKey }
}

export function FromPublicKey() {
  const navigate = useNavigate()

  const [publicKey, setPublicKey] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const liteClient = useLiteClientRequired()
  const tonapiClient = useTonapiClient() as unknown as Api<unknown> | undefined

  // Use the custom hook for public key processing
  const { publicKeyBuffer, isValidPublicKey } = usePublicKeyFromRaw(
    publicKey,
    liteClient,
    tonapiClient
  )

  // Use the wallet selection hook
  const {
    selectedWallets,
    activeWallets,
    totalWallets,
    isSearching,
    findActiveWallets,
    handleSelectWallet,
    getSelectedWalletsArray,
  } = useWalletSelection(isValidPublicKey ? publicKeyBuffer : Buffer.from([]))

  // Reset selected wallets when public key changes
  useEffect(() => {
    setError(null)
  }, [publicKey])

  const onPublicKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPublicKey(e.target.value)
    setError(null)
  }

  const savePublicKey = async () => {
    if (!publicKey) {
      setError('Please enter a TON DNS name, wallet address, or public key')
      return
    }

    if (!name) {
      setError('Please enter a wallet name')
      return
    }

    if (!isValidPublicKey) {
      setError('Could not resolve a 32-byte public key from this value')
      return
    }

    try {
      setIsLoading(true)
      await savePublicKeyOnly(name, navigate, publicKeyBuffer, getSelectedWalletsArray())
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
        <AlertTitle>Add Watch only wallet</AlertTitle>
        <AlertDescription>
          Add a wallet without storing a secret key. You can view balances/assets, but this wallet
          cannot sign transactions.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium" htmlFor="publicKeyInput">
          <FontAwesomeIcon icon={faKey} className="text-primary" />
          TON DNS, wallet address, or public key
        </label>
        <Input
          className="font-mono text-sm"
          id="publicKeyInput"
          onChange={onPublicKeyChange}
          value={publicKey}
          autoFocus
          placeholder="truecarry.ton, UQ..., 5908..., or 0x82..."
          autoComplete="off"
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        <div className="space-y-1 rounded-2xl bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
          <p>
            Accepted: TON DNS, deployed wallet address, base64/hex public key, decimal public key,
            or 0x-prefixed hex public key.
          </p>
          <div className="space-y-1">
            {WATCH_ONLY_EXAMPLES.map((example) => (
              <code key={example} className="block break-all font-mono text-foreground/75">
                {example}
              </code>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <WalletNameInput name={name} onNameChange={setName} placeholder="My Watch only wallet" />

        {isValidPublicKey && (
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
          onClick={savePublicKey}
          isLoading={isLoading}
          selectedWalletsCount={selectedWallets.length}
          defaultText="Add Watch only wallet"
          name={name}
          disabled={!name || !publicKey || !isValidPublicKey}
        />

        <div className="my-6" />
      </div>
    </div>
  )
}
