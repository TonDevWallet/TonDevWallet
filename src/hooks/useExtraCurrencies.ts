import { useEffect, useState, useCallback, useMemo } from 'react'
import { ExtraCurrencyConfig, ExtraCurrencyMeta } from '@/types/network'
import { getDatabase } from '@/db'
import { Setting } from '@/types/settings'
import { useLiteclientState } from '@/store/liteClient'

export function useExtraCurrencies() {
  const liteClientState = useLiteclientState()
  const selectedNetwork = liteClientState.selectedNetwork.get()
  const [config, setConfig] = useState<ExtraCurrencyConfig>({})
  const [loading, setLoading] = useState(true)

  // Load extra currency config from settings
  const loadConfig = useCallback(async () => {
    setLoading(true)
    const db = await getDatabase()
    const configSetting = await db<Setting>('settings')
      .where('name', 'extra_currency_config')
      .first()

    if (configSetting) {
      try {
        const parsedConfig = JSON.parse(configSetting.value) as ExtraCurrencyConfig
        setConfig(parsedConfig)
      } catch (e) {
        console.error('Failed to parse extra currency config', e)
        setConfig({})
      }
    } else {
      setConfig({})
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Save config to database
  const saveConfig = useCallback(async (newConfig: ExtraCurrencyConfig) => {
    const db = await getDatabase()
    const configSetting = await db<Setting>('settings')
      .where('name', 'extra_currency_config')
      .first()

    if (configSetting) {
      await db<Setting>('settings')
        .where('name', 'extra_currency_config')
        .update({ value: JSON.stringify(newConfig) })
    } else {
      await db<Setting>('settings').insert({
        name: 'extra_currency_config',
        value: JSON.stringify(newConfig),
      })
    }

    setConfig(newConfig)
  }, [])

  // Add a new currency
  const addCurrency = useCallback(
    async (networkId: number, currencyId: string) => {
      if (!currencyId.trim()) return false

      const trimmedCurrencyId = currencyId.trim()
      const newConfig = { ...config }

      if (!newConfig[networkId]) {
        newConfig[networkId] = {}
      }

      if (newConfig[networkId][trimmedCurrencyId]) {
        return false // Currency ID already exists
      }

      newConfig[networkId][trimmedCurrencyId] = {
        symbol: '',
        decimals: 9,
      }

      await saveConfig(newConfig)
      return true
    },
    [config, saveConfig]
  )

  // Update currency meta
  const updateCurrencyMeta = useCallback(
    async (
      networkId: number,
      currencyId: string,
      field: keyof ExtraCurrencyMeta,
      value: string | number
    ) => {
      const newConfig = { ...config }

      if (!newConfig[networkId]) {
        newConfig[networkId] = {}
      }

      if (!newConfig[networkId][currencyId]) {
        newConfig[networkId][currencyId] = { symbol: '', decimals: 9 }
      }

      newConfig[networkId][currencyId] = {
        ...newConfig[networkId][currencyId],
        [field]: field === 'decimals' ? Number(value) : value,
      }

      await saveConfig(newConfig)
    },
    [config, saveConfig]
  )

  // Remove currency
  const removeCurrency = useCallback(
    async (networkId: number, currencyId: string) => {
      const newConfig = { ...config }

      if (newConfig[networkId] && newConfig[networkId][currencyId]) {
        delete newConfig[networkId][currencyId]

        // Clean up empty network entries
        if (Object.keys(newConfig[networkId]).length === 0) {
          delete newConfig[networkId]
        }

        await saveConfig(newConfig)
        return true
      }

      return false
    },
    [config, saveConfig]
  )

  // Get all currencies for the currently selected network
  const getCurrentNetworkCurrencies = useCallback((): Record<string, ExtraCurrencyMeta> => {
    if (!selectedNetwork || loading) return {}
    return config[selectedNetwork.is_testnet ? -3 : -239] || {}
  }, [selectedNetwork, loading, config])

  const currentNetworkCurrencies = useMemo(() => {
    return getCurrentNetworkCurrencies()
  }, [getCurrentNetworkCurrencies])

  // Get a specific currency by ID for the current network
  const getCurrency = useCallback(
    (currencyId: string): ExtraCurrencyMeta | null => {
      if (!selectedNetwork || loading) return null
      const networkCurrencies = config[selectedNetwork.network_id]
      if (!networkCurrencies) return null
      return networkCurrencies[currencyId] || null
    },
    [selectedNetwork, loading, config]
  )

  // Get currencies for a specific network
  const getNetworkCurrencies = useCallback(
    (networkId: number): Record<string, ExtraCurrencyMeta> => {
      if (loading) return {}
      return config[networkId] || {}
    },
    [loading, config]
  )

  return {
    loading,
    config,
    currentNetworkCurrencies,
    getCurrentNetworkCurrencies,
    getCurrency,
    getNetworkCurrencies,
    addCurrency,
    updateCurrencyMeta,
    removeCurrency,
    refreshConfig: loadConfig,
  }
}

export default useExtraCurrencies
