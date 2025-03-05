import { useState, useEffect } from 'react'
import { Address } from '@ton/core'
import useAddressBook from './useAddressBook'
import { useLiteclientState, useLiteclient } from '@/store/liteClient'
import { useWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'
import { IWallet } from '@/types'

interface AddressInfo {
  title: string
  description: string | null
}

// Define address formatting options
const optionsMatrix = {
  bounceable: [true, false],
  urlSafe: [true, false],
  testOnly: [true, false],
}

// Generate all permutations of address formatting options
const allOptionsPermutations = Object.keys(optionsMatrix).reduce(
  (acc, key) => {
    return acc.flatMap((a) => optionsMatrix[key].map((b) => ({ ...a, [key]: b })))
  },
  [{}]
)

/**
 * Helper function to check if a wallet address matches the query string
 * Similar to the implementation in TonConnectPopup
 */
function isWalletMatch(wallet: IWallet, query: string) {
  const addressStringifiers = [
    ...allOptionsPermutations.map((options) => (a: Address) => a.toString(options)),
    (a: Address) => a.toRawString(),
  ]
  return (
    wallet.type.toLowerCase().includes(query.toLowerCase()) ||
    wallet.name?.toLowerCase().includes(query.toLowerCase()) ||
    addressStringifiers.some((stringify) =>
      stringify(wallet.address).toLowerCase().includes(query.toLowerCase())
    )
  )
}

/**
 * Hook to fetch address information from the address book
 * If not found in address book, it will search in user's wallets
 * @param address TON address to look up
 * @returns Address information if found, null otherwise
 */
export function useAddressInfo(address: Address | null) {
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null)

  const liteClientState = useLiteclientState()
  const selectedNetwork = liteClientState.selectedNetwork.get()
  const liteClient = useLiteclient()
  const addressBook = useAddressBook()
  const keys = useWalletListState().get()

  useEffect(
    () => {
      const fetchAddressInfo = async () => {
        console.log('fetchAddressInfo', selectedNetwork, address)
        if (!selectedNetwork || !address) return

        // Determine if we're on mainnet or testnet
        const networkId = selectedNetwork.is_testnet ? -3 : -239

        try {
          // Search for this address in the address book
          const formattedAddress = address.toString()
          const result = await addressBook.searchAddresses(networkId, formattedAddress, 1, 1)

          if (result.entries.length > 0) {
            const entry = result.entries[0]
            setAddressInfo({
              title: entry.title,
              description: entry.description,
            })
          } else {
            // Not found in address book, look in wallet list
            let foundWallet = false

            // Search through all keys and their wallets
            for (const key of keys) {
              const keyWallets = key.wallets || []

              for (const savedWallet of keyWallets) {
                const wallet = getWalletFromKey(liteClient, key, savedWallet)

                if (wallet && isWalletMatch(wallet, formattedAddress)) {
                  const name = key.name + ' - ' + wallet.name

                  setAddressInfo({
                    title: name,
                    description: 'Wallet from your collection',
                  })
                  foundWallet = true
                  break
                }
              }

              if (foundWallet) break
            }

            // If not found in wallets either, return null
            if (!foundWallet) {
              setAddressInfo(null)
            }
          }
        } catch (error) {
          console.error('Error fetching address info:', error)
          setAddressInfo(null)
        }
      }

      fetchAddressInfo()
    },
    [
      // address, selectedNetwork, addressBook, keys, liteClient
    ]
  )

  return addressInfo
}
