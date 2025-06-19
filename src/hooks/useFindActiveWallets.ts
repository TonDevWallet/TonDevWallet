import { useState, useCallback, useEffect, useMemo } from 'react'
import { IWallet } from '@/types'
import { Address } from '@ton/core'
import { LiteClient } from 'ton-lite-client'
import { useLiteclient, useTonapiClient } from '@/store/liteClient'
import {
  createWalletFromTonapiData,
  WalletFactories,
} from '@/components/WalletsListPage/WalletFactories'

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
  const tonapiClient = useTonapiClient()

  // Generate wallet addresses from the public key
  const wallets = useMemo(() => {
    if (!publicKey || publicKey.length !== 32) {
      return []
    }

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
    const walletsList = wallets
    if (walletsList.length === 0) {
      return
    }
    setTotalWallets(walletsList.length)

    const goodWallets: ActiveWallet[] = []

    try {
      const balances = await Promise.all(
        walletsList.map(async (item) => {
          const balance = await getWalletBalance(item.address)
          return { address: item.address, balance }
        })
      )

      for (let i = 0; i < balances.length; i++) {
        const balance = balances[i]
        if (balance.balance > 0n) {
          goodWallets.push({ wallet: walletsList[i], balance: balance.balance })
        }
      }

      // tonapi wallets
      try {
        const tonapiWallets = await tonapiClient?.wallet?.getWalletsByPublicKey(
          publicKey.toString('hex').replace(/\+/g, '-').replace(/\//g, '_')
        )

        if (tonapiWallets?.accounts) {
          for (const tonapiWallet of tonapiWallets.accounts) {
            // Check if wallet has positive balance
            const balance = BigInt(tonapiWallet.balance || '0')
            if (balance > 0n) {
              // Create IWallet from tonapi data
              const wallet = await createWalletFromTonapiData(publicKey, tonapiWallet, liteClient)
              if (wallet) {
                // Check if wallet is already in goodWallets by address
                const existingWallet = goodWallets.find((gw) =>
                  gw.wallet.address.equals(wallet.address)
                )

                if (!existingWallet) {
                  const balance = await getWalletBalance(wallet.address)
                  if (balance > 0n) {
                    goodWallets.push({
                      wallet,
                      balance,
                    })
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error finding active wallets:', e)
      }

      setActiveWallets(goodWallets)
      setIsSearching(false)
    } catch (error) {
      console.error('Error finding active wallets:', error)
      setIsSearching(false)
    }
  }, [wallets, getWalletBalance, publicKey, tonapiClient])

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
