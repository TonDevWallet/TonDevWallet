import { useState, useEffect, useMemo, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faSave } from '@fortawesome/free-solid-svg-icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { IWallet, WalletType } from '@/types'
import { CreateNewKeyWallet, useWalletListState } from '@/store/walletsListState'
import { Address } from '@ton/core'
import { LiteClient } from 'ton-lite-client'
import { useLiteclient } from '@/store/liteClient'
import { WalletFactories } from './WalletFactories'
import { formatTon } from '@/utils/units'
import { AddressRow } from '../AddressRow'

interface FindActiveWalletsContentProps {
  keyName: string
  keyId: number
  existingWallets: Array<{ wallet: IWallet; keyName: string; keyId: number }>
  onClose: () => void
}

interface ActiveWallet {
  wallet: IWallet
  balance: bigint
}

export function FindActiveWalletsContent({
  keyName,
  keyId,
  existingWallets,
  onClose,
}: FindActiveWalletsContentProps) {
  const [activeWallets, setActiveWallets] = useState<ActiveWallet[]>([])
  const [totalWallets, setTotalWallets] = useState<number>(0)
  const [isSearching, setIsSearching] = useState(false)
  const keys = useWalletListState()
  const liteClient = useLiteclient() as LiteClient

  const key = useMemo(() => {
    return keys.get().find((item) => item.id === keyId)
  }, [keys, keyId])

  const wallets = useMemo(() => {
    if (!key) {
      return []
    }
    const wallets: IWallet[] = []
    const publicKey = Buffer.from(key.public_key, 'base64')

    for (const factory of Object.values(WalletFactories)) {
      wallets.push(...factory(publicKey))
    }
    return wallets
  }, [key])

  const getWalletBalance = useCallback(
    async (address: Address) => {
      const master = await liteClient.getMasterchainInfo()
      const state = await liteClient.getAccountState(address, master.last)
      return state?.balance?.coins || 0n
    },
    [liteClient]
  )

  // Handler to find active wallets
  const handleFindActiveWallets = async () => {
    setIsSearching(true)
    setTotalWallets(wallets.length)
    try {
      setTimeout(async () => {
        const balances = await Promise.all(
          wallets.map(async (item) => {
            const balance = await getWalletBalance(item.address)
            return { address: item.address, balance }
          })
        )

        const goodWallets: ActiveWallet[] = []
        for (let i = 0; i < balances.length; i++) {
          const balance = balances[i]
          if (balance.balance > 0n) {
            goodWallets.push({ wallet: wallets[i], balance: balance.balance })
          }
        }

        setActiveWallets(goodWallets)
        setIsSearching(false)
      }, 2000)
    } catch (error) {
      console.error('Error finding active wallets:', error)
      setIsSearching(false)
    }
  }

  const handleSaveWallet = useCallback(
    async (wallet: IWallet) => {
      const addressStr = wallet.address.toString()

      // Check if this wallet is already in existingWallets
      const isAlreadySaved = existingWallets.some((w) => w.wallet.address.toString() === addressStr)
      if (isAlreadySaved) {
        return
      }

      const workchain = wallet.workchainId || 0
      let subwalletId = BigInt(0)
      if ((wallet as Record<string, any>).subwalletId) {
        subwalletId = BigInt((wallet as Record<string, any>).subwalletId)
      }

      const defaultName = wallet.type
      await CreateNewKeyWallet({
        type: wallet.type as WalletType,
        subwalletId,
        keyId,
        walletAddress: addressStr,
        extraData: '',
        name: defaultName,
        workchainId: workchain,
      })
    },
    [existingWallets, keyId]
  )

  // Automatically search when component mounts
  useEffect(() => {
    console.log('content component mounted')
    handleFindActiveWallets()
  }, [])

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Active Wallets for {keyName}</DialogTitle>
        <DialogDescription>
          Wallets associated with this key that have a balance on the blockchain.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 w-full overflow-hidden">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-8">
            <FontAwesomeIcon icon={faSearch} spin className="text-2xl text-primary mb-4" />
            <p>Searching for active wallets on the blockchain...</p>
            <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
          </div>
        ) : activeWallets.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden">
            <div className="flex justify-between mb-3 px-1 text-sm text-muted-foreground">
              <div className="flex gap-2 items-center">
                <span className="font-semibold">Checked:</span>
                <span className="bg-secondary px-2 py-0.5 rounded-md">{totalWallets}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="font-semibold">Found:</span>
                <span className="bg-secondary px-2 py-0.5 rounded-md">{activeWallets.length}</span>
              </div>
            </div>
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Version</TableHead>
                  <TableHead className="w-[30%]">Wallet Address</TableHead>
                  <TableHead className="w-[20%]">Balance</TableHead>
                  <TableHead className="w-[20%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeWallets.map((wallet) => (
                  <TableRow key={wallet.wallet.id}>
                    <TableCell className="truncate">{wallet.wallet.type}</TableCell>
                    <TableCell className="font-mono text-xs truncate">
                      <div className="truncate">
                        <AddressRow address={wallet.wallet.address} />
                      </div>
                    </TableCell>
                    <TableCell className="truncate">
                      {formatTon(wallet.balance).slice(0, 4)} TON
                    </TableCell>
                    <TableCell className="">
                      {!existingWallets.some(
                        (w) => w.wallet.address.toString() === wallet.wallet.address.toString()
                      ) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveWallet(wallet.wallet)}
                        >
                          <FontAwesomeIcon icon={faSave} className="mr-2" />
                          Save
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p>No active wallets found for this key.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try creating a new wallet and sending some TON to it.
            </p>
          </div>
        )}
      </div>

      <DialogFooter className="sm:justify-between">
        <Button variant="outline" disabled={isSearching} onClick={handleFindActiveWallets}>
          <FontAwesomeIcon icon={faSearch} className={'mr-2'} />
          Refresh
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  )
}
