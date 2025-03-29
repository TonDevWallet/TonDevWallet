import { useMemo } from 'react'
import { useWalletListState } from '@/store/walletsListState'
import { useLiteclient } from '@/store/liteClient'
import { getWalletFromKey } from '@/utils/wallets'
import { IWallet, SavedWallet } from '@/types'
import { Address } from '@ton/core'
import { Key } from '@/types/Key'
import { useSearchQuery } from '@/store/searchState'
import { GlobalSearch } from '../GlobalSearch/GlobalSearch'
import { KeyGroup } from './KeyGroup'

// Options for generating different address formats for search
const optionsMatrix = {
  bounceable: [true, false],
  urlSafe: [true, false],
  testOnly: [true, false],
}
const allOptionsPermutations = Object.keys(optionsMatrix).reduce(
  (acc, key) => {
    return acc.flatMap((a) => optionsMatrix[key].map((b) => ({ ...a, [key]: b })))
  },
  [{}]
)

// Check if a wallet matches the search query
function isWalletMatch(wallet: IWallet, keyName: string, query: string) {
  if (!query) return true

  const addressStringifiers = [
    ...allOptionsPermutations.map((options) => (a: Address) => a.toString(options)),
    (a: Address) => a.toRawString(),
  ]

  return (
    wallet.type.toLowerCase().includes(query.toLowerCase()) ||
    (wallet.name || '').toLowerCase().includes(query.toLowerCase()) ||
    keyName.toLowerCase().includes(query.toLowerCase()) ||
    addressStringifiers.some((stringify) =>
      stringify(wallet.address).toLowerCase().includes(query.toLowerCase())
    )
  )
}

export function WalletsListPage() {
  const walletsList = useWalletListState()
  const liteClient = useLiteclient()
  const searchQuery = useSearchQuery()

  // Process all wallets from all keys
  const processedWallets = useMemo(() => {
    const result: Array<{
      wallet: IWallet
      keyName: string
      keyId: number
    }> = []

    try {
      // Get raw values from state
      const keysArray = walletsList.get()

      for (const keyState of keysArray) {
        try {
          // Extract key data
          const key: Key = {
            id: keyState.id,
            name: keyState.name,
            public_key: keyState.public_key,
            encrypted: keyState.encrypted,
            wallets: keyState.wallets as SavedWallet[],
          }

          if (!key.public_key || !key.wallets || key.wallets.length === 0) {
            console.log('Skipping key due to missing data:', key.id)
            continue
          }

          for (const walletData of key.wallets) {
            try {
              const wallet = getWalletFromKey(liteClient, key, walletData)

              if (wallet) {
                result.push({
                  wallet,
                  keyName: key.name,
                  keyId: key.id,
                })
              } else {
                console.log('Failed to get wallet from key:', walletData)
              }
            } catch (err) {
              console.error('Error processing wallet:', err)
            }
          }
        } catch (err) {
          console.error('Error processing key:', err)
        }
      }
    } catch (err) {
      console.error('Error processing wallet list:', err)
    }

    return result
  }, [walletsList, liteClient])

  // Filter wallets based on search query
  const filteredWallets = useMemo(() => {
    if (!searchQuery) return processedWallets

    return processedWallets.filter((item) =>
      isWalletMatch(item.wallet, item.keyName, searchQuery.get())
    )
  }, [processedWallets, searchQuery])

  // Group by key name
  const groupedWallets = useMemo(() => {
    const grouped: Record<string, Array<{ wallet: IWallet; keyName: string; keyId: number }>> = {}

    for (const item of filteredWallets) {
      if (!grouped[item.keyName]) {
        grouped[item.keyName] = []
      }
      grouped[item.keyName].push(item)
    }

    console.log('Grouped wallet data:', Object.keys(grouped).length, 'key groups')

    return Object.entries(grouped)
  }, [filteredWallets])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Wallets</h1>

      {/* Search input */}
      <div className="mb-6">
        <GlobalSearch placeholder="Search by address, name or type..." />
      </div>

      {groupedWallets.length > 0 ? (
        groupedWallets.map(([keyName, wallets]) => (
          <KeyGroup key={keyName} keyName={keyName} keyId={wallets[0].keyId} wallets={wallets} />
        ))
      ) : (
        <div className="text-center py-10 bg-muted/20 rounded-lg">
          {searchQuery
            ? 'No wallets match your search query.'
            : 'No wallets found. Try creating a wallet first.'}
        </div>
      )}
    </div>
  )
}
