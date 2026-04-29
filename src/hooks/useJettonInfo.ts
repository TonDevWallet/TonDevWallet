import { Address } from '@ton/core'
import { useState, useEffect } from 'react'
import { useLiteclient, type ApiClient, LiteClientPrimaryAdapter } from '@/store/liteClient'
// eslint-disable-next-line camelcase
import DataLoader from 'dataloader'
import { LRUMap } from 'lru_map'
import { JettonInfo } from '@/types/jetton'
import { fetchJettonInfo } from '@/utils/jettons'

type loaderKey = {
  address: Address
  liteClient: ApiClient
}

const jettonInfoDataLoader = new DataLoader(
  async (keys: readonly loaderKey[]) => {
    const jettonInfos = await Promise.all(
      keys.map(async (key) => {
        return fetchJettonInfo(key.address, key.liteClient)
      })
    )

    return jettonInfos
  },
  {
    cacheMap: new LRUMap(1000),
    cacheKeyFn(key) {
      const clientId =
        key.liteClient instanceof LiteClientPrimaryAdapter
          ? String((key.liteClient.unwrap() as { configUrl?: string }).configUrl ?? 'lite')
          : key.liteClient.constructor.name
      return key.address.toString() + '/' + clientId
    },
  }
)

/**
 * Hook to fetch jetton contract information from the blockchain
 * @param address Jetton master contract address
 * @returns Jetton information including metadata and supply
 */
export function useJettonInfo(address: Address | string | null) {
  const [jettonInfo, setJettonInfo] = useState<JettonInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const liteClient = useLiteclient()

  useEffect(() => {
    async function loadJettonInfo() {
      if (!address || !liteClient) {
        setJettonInfo(null)
        setError(null)
        return
      }

      if (address === 'TON') {
        setJettonInfo({
          metadata: {
            name: 'TON',
            symbol: 'TON',
            image: 'https://ton.space/images/ton.png',
            decimals: '9',
          },
          totalSupply: 1000000000000000000n,
          mintable: false,
          adminAddress: null,
        })
        return
      }

      setLoading(true)
      setError(null)

      try {
        const info = await jettonInfoDataLoader.load({
          address: address as Address,
          liteClient,
        })
        setJettonInfo(info)
      } catch (e) {
        console.error('Error fetching jetton info:', e)
        setError(e instanceof Error ? e.message : 'Unknown error occurred')
        setJettonInfo(null)
      } finally {
        setLoading(false)
      }
    }

    loadJettonInfo()
  }, [(address as Address)?.toString(), liteClient])

  return {
    jettonInfo,
    loading,
    error,
  }
}
