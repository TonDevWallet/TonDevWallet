import { Address } from '@ton/core'
import { useState, useEffect } from 'react'
import { useLiteclient } from '@/store/liteClient'
// eslint-disable-next-line camelcase
import DataLoader from 'dataloader'
import { LiteClient } from 'ton-lite-client'
import { LRUMap } from 'lru_map'
import { JettonInfo } from '@/types/jetton'
import { fetchJettonInfo } from '@/utils/jettons'

type loaderKey = {
  address: Address
  liteClient: LiteClient
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
      const keyStr = key.address.toString() + '/' + (key.liteClient as any).configUrl
      return keyStr
    },
  }
)

/**
 * Hook to fetch jetton contract information from the blockchain
 * @param address Jetton master contract address
 * @returns Jetton information including metadata and supply
 */
export function useJettonInfo(address: Address | null) {
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

      setLoading(true)
      setError(null)

      try {
        const info = await jettonInfoDataLoader.load({
          address,
          liteClient: liteClient as LiteClient,
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
  }, [address?.toRawString(), liteClient])

  return {
    jettonInfo,
    loading,
    error,
  }
}
