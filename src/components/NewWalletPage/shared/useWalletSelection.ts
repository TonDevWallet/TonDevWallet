import { useState, useEffect } from 'react'
import { useFindActiveWallets } from '@/hooks/useFindActiveWallets'
import { IWallet } from '@/types'

export function useWalletSelection(publicKey: Buffer) {
  const [selectedWallets, setSelectedWallets] = useState<string[]>([])

  // Use the hook if we have a valid public key
  const { activeWallets, totalWallets, isSearching, findActiveWallets } = useFindActiveWallets(
    publicKey && publicKey.length === 32 ? publicKey : Buffer.from([])
  )

  // Auto-select all wallets when active wallets are found
  useEffect(() => {
    if (activeWallets && Object.keys(activeWallets).length > 0) {
      setSelectedWallets(Object.keys(activeWallets))
    }
  }, [activeWallets])

  // Toggle wallet selection
  const handleSelectWallet = (walletId: string, selected: boolean) => {
    if (selected) {
      setSelectedWallets((prev) => [...prev, walletId])
    } else {
      setSelectedWallets((prev) => prev.filter((id) => id !== walletId))
    }
  }

  // Get selected wallets as an array of IWallet objects
  const getSelectedWalletsArray = (): IWallet[] => {
    const walletsArray: IWallet[] = []
    for (const walletId of selectedWallets) {
      const wallet = activeWallets[parseInt(walletId)]
      if (wallet) {
        walletsArray.push(wallet.wallet)
      }
    }
    return walletsArray
  }

  return {
    selectedWallets,
    setSelectedWallets,
    activeWallets,
    totalWallets,
    isSearching,
    findActiveWallets,
    handleSelectWallet,
    getSelectedWalletsArray,
  }
}
