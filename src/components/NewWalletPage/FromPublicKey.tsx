import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'
import { savePublicKeyOnly } from '@/store/walletsListState'
import { ActiveWalletsSelector } from './ActiveWalletsSelector'
import { WalletNameInput, ImportButton, useWalletSelection } from './shared'
import { LiteClient } from 'ton-lite-client'
import { useLiteclient } from '@/store/liteClient'
import { Address, Cell, parseTuple, TupleItemInt } from '@ton/core'
import { bigIntToBuffer } from '@/utils/ton'

// Custom hook to process public key
function usePublicKeyFromRaw(rawPublicKey: string, liteClient: LiteClient) {
  const [publicKeyBuffer, setPublicKeyBuffer] = useState<Buffer>(Buffer.from([]))

  useEffect(() => {
    let isMounted = true

    const processPublicKey = async () => {
      if (!rawPublicKey) {
        setPublicKeyBuffer(Buffer.from([]))
        return
      }

      try {
        const normalizedPublicKey = rawPublicKey.replace(/^0x/i, '')
        // Try base64 first
        const base64Key = Buffer.from(normalizedPublicKey, 'base64')
        if (base64Key.length === 32) {
          if (isMounted) setPublicKeyBuffer(base64Key)
          return
        }

        // Try hex
        const hexKey = Buffer.from(normalizedPublicKey, 'hex')
        if (hexKey.length === 32) {
          if (isMounted) setPublicKeyBuffer(hexKey)
          return
        }
      } catch (e) {
        //
      }

      try {
        const walletAddress = Address.parse(rawPublicKey)
        const master = await liteClient.getMasterchainInfo()
        const result = await liteClient.runMethod(
          walletAddress,
          'get_public_key',
          Buffer.from([]),
          master.last
        )

        console.log('result', result)

        if (result.exitCode !== 0) {
          if (isMounted) setPublicKeyBuffer(Buffer.from([]))
          return
        }

        const resultCell = Cell.fromBase64(result.result as string)
        const resultTuple = parseTuple(resultCell)
        console.log('resultTuple', resultTuple)
        if (resultTuple.length !== 1) {
          if (isMounted) setPublicKeyBuffer(Buffer.from([]))
          return
        }

        const key = resultTuple[0] as TupleItemInt
        if (isMounted) setPublicKeyBuffer(Buffer.from(bigIntToBuffer(key.value)))
      } catch (e) {
        //
        console.log('error', e)
        if (isMounted) setPublicKeyBuffer(Buffer.from([]))
      }
    }

    processPublicKey()

    return () => {
      isMounted = false
    }
  }, [rawPublicKey, liteClient])

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
  const liteClient = useLiteclient() as LiteClient

  // Use the custom hook for public key processing
  const { publicKeyBuffer, isValidPublicKey } = usePublicKeyFromRaw(publicKey, liteClient)

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
      setError('Please enter a public key')
      return
    }

    if (!name) {
      setError('Please enter a wallet name')
      return
    }

    if (!isValidPublicKey) {
      setError('Invalid public key format. Public key should be 32 bytes')
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
        <AlertTitle>Add View-Only Wallet</AlertTitle>
        <AlertDescription>
          Enter a wallet public key to create a view-only wallet. You won't be able to sign
          transactions.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2" htmlFor="publicKeyInput">
          <FontAwesomeIcon icon={faKey} className="text-primary" />
          Public Key (base64 or hex) or Address:
        </label>
        <Input
          className="font-mono text-sm"
          id="publicKeyInput"
          onChange={onPublicKeyChange}
          value={publicKey}
          autoFocus
          placeholder="Enter the public key..."
          autoComplete="off"
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        <p className="text-xs text-muted-foreground">
          This creates a view-only wallet. You won't be able to sign transactions.
        </p>
      </div>

      <div className="space-y-4">
        <WalletNameInput name={name} onNameChange={setName} placeholder="My View-Only Wallet" />

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
          defaultText="Add View-Only Wallet"
          name={name}
          disabled={!name || !publicKey || !isValidPublicKey}
        />

        <div className="my-6" />
      </div>
    </div>
  )
}
