import { useState, useCallback, useEffect } from 'react'
import { IWallet } from '@/types'
import { Address } from '@ton/core'
import { LiteClient } from 'ton-lite-client'
import { useLiteclient } from '@/store/liteClient'
import { WalletFactories } from '@/components/WalletsListPage/WalletFactories'

export interface ActiveWallet {
  wallet: IWallet
  balance: bigint
}

export interface UseFindActiveWalletsResult {
  activeWallets: ActiveWallet[]
  totalWallets: number
  isSearching: boolean
  findActiveWallets: () => Promise<void>
}

export function useFindActiveWallets(publicKey: Buffer): UseFindActiveWalletsResult {
  const [activeWallets, setActiveWallets] = useState<ActiveWallet[]>([])
  const [totalWallets, setTotalWallets] = useState<number>(0)
  const [isSearching, setIsSearching] = useState(false)
  const liteClient = useLiteclient() as LiteClient

  // Generate wallet addresses from the public key
  const wallets = useCallback(() => {
    const walletsList: IWallet[] = []

    for (const factory of Object.values(WalletFactories)) {
      walletsList.push(...factory(publicKey))
    }
    return walletsList
  }, [publicKey])

  const getWalletBalance = useCallback(
    async (address: Address) => {
      const master = await liteClient.getMasterchainInfo()
      const state = await liteClient.getAccountState(address, master.last)
      return state?.balance?.coins || 0n
    },
    [liteClient]
  )

  // Main function to find active wallets
  const findActiveWallets = useCallback(async () => {
    setIsSearching(true)
    const walletsList = wallets()
    setTotalWallets(walletsList.length)

    try {
      const balances = await Promise.all(
        walletsList.map(async (item) => {
          const balance = await getWalletBalance(item.address)
          return { address: item.address, balance }
        })
      )

      const goodWallets: ActiveWallet[] = []
      for (let i = 0; i < balances.length; i++) {
        const balance = balances[i]
        if (balance.balance > 0n) {
          goodWallets.push({ wallet: walletsList[i], balance: balance.balance })
        }
      }

      setActiveWallets(goodWallets)
      setIsSearching(false)
    } catch (error) {
      console.error('Error finding active wallets:', error)
      setIsSearching(false)
    }
  }, [wallets, getWalletBalance])

  // Automatically search when hook is first used
  useEffect(() => {
    findActiveWallets()
  }, [findActiveWallets])

  return {
    activeWallets,
    totalWallets,
    isSearching,
    findActiveWallets,
  }
}
