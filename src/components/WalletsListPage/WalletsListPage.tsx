import { useMemo } from 'react'
import { useWalletListState } from '@/store/walletsListState'
import { useLiteclient } from '@/store/liteClient'
import { getWalletFromKey } from '@/utils/wallets'
import { IWallet, SavedWallet } from '@/types'
import { Address } from '@ton/core'
import { Key } from '@/types/Key'
import { useSearchState } from '@/store/searchState'
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

function generateWalletSearchString(wallet: IWallet, keyName: string) {
  const addressStringifiers = [
    ...allOptionsPermutations.map((options) => (a: Address) => a.toString(options)),
    (a: Address) => a.toRawString(),
  ]

  return [
    wallet.type.toLowerCase() +
      (wallet.name || '').toLowerCase() +
      (keyName || '').toLowerCase() +
      addressStringifiers.map((stringify) => stringify(wallet.address).toLowerCase()),
  ]
    .flat()
    .join()
}

export function WalletsListPage() {
  const walletsList = useWalletListState()
  const liteClient = useLiteclient()
  const searchState = useSearchState()

  // Process all wallets from all keys
  const processedWallets = useMemo(() => {
    const result: Array<{
      wallet: IWallet
      keyName: string
      keyId: number
      searchString: string
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
            sign_type: keyState.sign_type || 'ton',
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
                  searchString: generateWalletSearchString(wallet, key.name),
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
    if (!searchState.wallet.get()) return processedWallets

    return processedWallets.filter((item) => item.searchString.includes(searchState.wallet.get()))
  }, [processedWallets, searchState.wallet])

  // Group by key name
  const groupedWallets = useMemo(() => {
    const grouped: Record<string, Array<{ wallet: IWallet; keyName: string; keyId: number }>> = {}

    for (const item of filteredWallets) {
      if (!grouped[item.keyName]) {
        grouped[item.keyName] = []
      }
      grouped[item.keyName].push(item)
    }

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
          {searchState.wallet.get()
            ? 'No wallets match your search query.'
            : 'No wallets found. Try creating a wallet first.'}
        </div>
      )}
    </div>
  )
}
