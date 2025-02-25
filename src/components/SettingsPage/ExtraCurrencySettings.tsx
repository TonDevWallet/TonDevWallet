import { memo, useState, useCallback, useEffect } from 'react'
import { useLiteclientState } from '@/store/liteClient'
import { ExtraCurrencyMeta } from '@/types/network'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import useExtraCurrencies from '@/hooks/useExtraCurrencies'
import CurrenciesList from './CurrenciesList'
import AddCurrencyForm from './AddCurrencyForm'

// Fixed network IDs for mainnet and testnet
const MAINNET_ID = -239
const TESTNET_ID = -3

const ExtraCurrencySettings = memo(() => {
  const liteClientState = useLiteclientState()
  const selectedAppNetwork = liteClientState.selectedNetwork.get()
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(null)
  const { getNetworkCurrencies, addCurrency, updateCurrencyMeta, removeCurrency } =
    useExtraCurrencies()

  // Initialize with the app's currently selected network
  useEffect(() => {
    if (selectedAppNetwork && !selectedNetworkId) {
      // Check if the app network is mainnet or testnet
      const networkId = selectedAppNetwork.is_testnet ? TESTNET_ID : MAINNET_ID
      setSelectedNetworkId(networkId)
    } else if (!selectedNetworkId) {
      // Default to mainnet if no selection
      setSelectedNetworkId(MAINNET_ID)
    }
  }, [selectedAppNetwork, selectedNetworkId])

  const handleNetworkChange = useCallback((value: string) => {
    setSelectedNetworkId(Number(value))
  }, [])

  const handleAddCurrency = useCallback(
    async (currencyId: string) => {
      if (!selectedNetworkId) return false
      return await addCurrency(selectedNetworkId, currencyId)
    },
    [selectedNetworkId, addCurrency]
  )

  const handleUpdateMeta = useCallback(
    (currencyId: string, field: keyof ExtraCurrencyMeta, value: string | number) => {
      if (!selectedNetworkId) return
      updateCurrencyMeta(selectedNetworkId, currencyId, field, value)
    },
    [selectedNetworkId, updateCurrencyMeta]
  )

  const handleRemoveCurrency = useCallback(
    (currencyId: string) => {
      if (!selectedNetworkId) return
      removeCurrency(selectedNetworkId, currencyId)
    },
    [selectedNetworkId, removeCurrency]
  )

  // Get currencies for the selected network
  const currencies = selectedNetworkId ? getNetworkCurrencies(selectedNetworkId) : {}

  // Get network name based on selected ID
  const getNetworkName = (networkId: number): string => {
    if (networkId === MAINNET_ID) return 'Mainnet'
    if (networkId === TESTNET_ID) return 'Testnet'
    return 'Unknown Network'
  }

  return (
    <div>
      <h2 className="mt-10 scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight transition-colors">
        Extra Currency Configuration
      </h2>

      <p className="text-sm text-muted-foreground mt-2 mb-4">
        Configure additional currencies for each network
      </p>

      <div className="mb-4">
        <Label htmlFor="network-select">Select Network</Label>
        <Select value={selectedNetworkId?.toString() || ''} onValueChange={handleNetworkChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a network" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key={MAINNET_ID} value={MAINNET_ID.toString()}>
              Mainnet
            </SelectItem>
            <SelectItem key={TESTNET_ID} value={TESTNET_ID.toString()}>
              Testnet
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedNetworkId && (
        <>
          <CurrenciesList
            networkName={getNetworkName(selectedNetworkId)}
            currencies={currencies}
            onUpdateMeta={handleUpdateMeta}
            onRemoveCurrency={handleRemoveCurrency}
          />

          <AddCurrencyForm onAddCurrency={handleAddCurrency} />
        </>
      )}
    </div>
  )
})

ExtraCurrencySettings.displayName = 'ExtraCurrencySettings'

export default ExtraCurrencySettings
