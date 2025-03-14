import { memo, useState, useCallback, useEffect } from 'react'
import { useLiteclientState } from '@/store/liteClient'
import { ExtraCurrencyMeta } from '@/types/network'
import useExtraCurrencies from '@/hooks/useExtraCurrencies'
import CurrenciesList from './CurrenciesList'
import AddCurrencyForm from './AddCurrencyForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDollarSign } from '@fortawesome/free-solid-svg-icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

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
          <Tabs
            defaultValue={selectedNetworkId?.toString() || MAINNET_ID.toString()}
            onValueChange={handleNetworkChange}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value={MAINNET_ID.toString()} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block"></span>
                Mainnet
              </TabsTrigger>
              <TabsTrigger value={TESTNET_ID.toString()} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 inline-block"></span>
                Testnet
              </TabsTrigger>
            </TabsList>

            {/* Tab Content for each network */}
            <TabsContent value={MAINNET_ID.toString()} className="mt-0 space-y-6">
              <NetworkContent
                networkId={MAINNET_ID}
                networkName="Mainnet"
                currencies={selectedNetworkId === MAINNET_ID ? currencies : {}}
                onUpdateMeta={handleUpdateMeta}
                onRemoveCurrency={handleRemoveCurrency}
                onAddCurrency={handleAddCurrency}
              />
            </TabsContent>

            <TabsContent value={TESTNET_ID.toString()} className="mt-0 space-y-6">
              <NetworkContent
                networkId={TESTNET_ID}
                networkName="Testnet"
                currencies={selectedNetworkId === TESTNET_ID ? currencies : {}}
                onUpdateMeta={handleUpdateMeta}
                onRemoveCurrency={handleRemoveCurrency}
                onAddCurrency={handleAddCurrency}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
})

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
    const networkIndicatorClass = networkId === MAINNET_ID ? 'bg-green-500' : 'bg-blue-500'

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
