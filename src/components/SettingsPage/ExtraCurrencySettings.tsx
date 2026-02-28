import { memo, useState, useCallback, useEffect } from 'react'
import { useLiteclientState } from '@/store/liteClient'
import {
  ExtraCurrencyMeta,
  getNetworkChainId,
  MAINNET_CHAIN_ID,
  TESTNET_CHAIN_ID,
} from '@/types/network'
import useExtraCurrencies from '@/hooks/useExtraCurrencies'
import CurrenciesList from './CurrenciesList'
import AddCurrencyForm from './AddCurrencyForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDollarSign } from '@fortawesome/free-solid-svg-icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

const ExtraCurrencySettings = memo(() => {
  const liteClientState = useLiteclientState()
  const selectedAppNetwork = liteClientState.selectedNetwork.get()
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(null)
  const { getNetworkCurrencies, addCurrency, updateCurrencyMeta, removeCurrency } =
    useExtraCurrencies()

  // Initialize with the app's currently selected network
  useEffect(() => {
    if (selectedAppNetwork && !selectedNetworkId) {
      const networkId = getNetworkChainId(selectedAppNetwork)
      setSelectedNetworkId(networkId)
    } else if (!selectedNetworkId) {
      setSelectedNetworkId(MAINNET_CHAIN_ID)
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

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pt-6 pb-6">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faDollarSign} className="text-primary" />
            <div>
              <CardTitle className="text-lg">Extra Currency Configuration</CardTitle>
              <CardDescription>
                Configure additional currencies to use across different networks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Network Selection as Tabs */}
          <NetworkTabs
            selectedNetworkId={selectedNetworkId}
            selectedAppNetwork={selectedAppNetwork}
            onNetworkChange={handleNetworkChange}
            currencies={currencies}
            onUpdateMeta={handleUpdateMeta}
            onRemoveCurrency={handleRemoveCurrency}
            onAddCurrency={handleAddCurrency}
          />
        </CardContent>
      </Card>
    </div>
  )
})

interface NetworkTabsProps {
  selectedNetworkId: number | null
  selectedAppNetwork: { chain_id?: number | null } | null
  onNetworkChange: (value: string) => void
  currencies: Record<string, ExtraCurrencyMeta>
  onUpdateMeta: (currencyId: string, field: keyof ExtraCurrencyMeta, value: string | number) => void
  onRemoveCurrency: (currencyId: string) => void
  onAddCurrency: (currencyId: string) => Promise<boolean>
}

const NetworkTabs = memo(
  ({
    selectedNetworkId,
    selectedAppNetwork,
    onNetworkChange,
    currencies,
    onUpdateMeta,
    onRemoveCurrency,
    onAddCurrency,
  }: NetworkTabsProps) => {
    const customChainId =
      selectedAppNetwork &&
      selectedAppNetwork.chain_id != null &&
      selectedAppNetwork.chain_id !== MAINNET_CHAIN_ID &&
      selectedAppNetwork.chain_id !== TESTNET_CHAIN_ID
        ? selectedAppNetwork.chain_id
        : null

    const defaultValue = selectedNetworkId?.toString() || MAINNET_CHAIN_ID.toString()

    return (
      <Tabs defaultValue={defaultValue} onValueChange={onNetworkChange} className="w-full">
        <TabsList className={`mb-6 ${customChainId != null ? 'grid-cols-3' : 'grid-cols-2'} grid`}>
          <TabsTrigger value={MAINNET_CHAIN_ID.toString()} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block"></span>
            Mainnet
          </TabsTrigger>
          <TabsTrigger value={TESTNET_CHAIN_ID.toString()} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block"></span>
            Testnet
          </TabsTrigger>
          {customChainId != null && (
            <TabsTrigger value={customChainId.toString()} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block"></span>
              Custom ({customChainId})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={MAINNET_CHAIN_ID.toString()} className="mt-0 space-y-6">
          <NetworkContent
            networkId={MAINNET_CHAIN_ID}
            networkName="Mainnet"
            currencies={selectedNetworkId === MAINNET_CHAIN_ID ? currencies : {}}
            onUpdateMeta={onUpdateMeta}
            onRemoveCurrency={onRemoveCurrency}
            onAddCurrency={onAddCurrency}
          />
        </TabsContent>

        <TabsContent value={TESTNET_CHAIN_ID.toString()} className="mt-0 space-y-6">
          <NetworkContent
            networkId={TESTNET_CHAIN_ID}
            networkName="Testnet"
            currencies={selectedNetworkId === TESTNET_CHAIN_ID ? currencies : {}}
            onUpdateMeta={onUpdateMeta}
            onRemoveCurrency={onRemoveCurrency}
            onAddCurrency={onAddCurrency}
          />
        </TabsContent>

        {customChainId != null && (
          <TabsContent value={customChainId.toString()} className="mt-0 space-y-6">
            <NetworkContent
              networkId={customChainId}
              networkName={`Custom (${customChainId})`}
              currencies={selectedNetworkId === customChainId ? currencies : {}}
              onUpdateMeta={onUpdateMeta}
              onRemoveCurrency={onRemoveCurrency}
              onAddCurrency={onAddCurrency}
            />
          </TabsContent>
        )}
      </Tabs>
    )
  }
)

NetworkTabs.displayName = 'NetworkTabs'

// Network Content Component
interface NetworkContentProps {
  networkId: number
  networkName: string
  currencies: Record<string, ExtraCurrencyMeta>
  onUpdateMeta: (currencyId: string, field: keyof ExtraCurrencyMeta, value: string | number) => void
  onRemoveCurrency: (currencyId: string) => void
  onAddCurrency: (currencyId: string) => Promise<boolean>
}

const NetworkContent = memo(
  ({
    networkId,
    networkName,
    currencies,
    onUpdateMeta,
    onRemoveCurrency,
    onAddCurrency,
  }: NetworkContentProps) => {
    const networkIndicatorClass =
      networkId === MAINNET_CHAIN_ID
        ? 'bg-green-500'
        : networkId === TESTNET_CHAIN_ID
          ? 'bg-blue-500'
          : 'bg-amber-500'

    const currencyCount = Object.keys(currencies).length

    return (
      <>
        {/* Network Info Card */}
        <Card className="border shadow-xs">
          <CardHeader className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${networkIndicatorClass} inline-block`}
                ></span>
                <CardTitle className="text-lg">{networkName}</CardTitle>
              </div>
              <CardDescription>
                {currencyCount
                  ? `${currencyCount} ${currencyCount === 1 ? 'currency' : 'currencies'} configured`
                  : 'No currencies configured yet'}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Currencies List */}
        <CurrenciesList
          networkName={networkName}
          currencies={currencies}
          onUpdateMeta={onUpdateMeta}
          onRemoveCurrency={onRemoveCurrency}
        />

        {/* Add Currency Form */}
        <Card className="border shadow-xs">
          <CardHeader className="pt-4 pb-4">
            <CardTitle className="text-lg">Add New Currency</CardTitle>
            <CardDescription>Define a new currency for {networkName}</CardDescription>
          </CardHeader>
          <CardContent>
            <AddCurrencyForm onAddCurrency={onAddCurrency} />
          </CardContent>
        </Card>
      </>
    )
  }
)

NetworkContent.displayName = 'NetworkContent'

ExtraCurrencySettings.displayName = 'ExtraCurrencySettings'

export default ExtraCurrencySettings
