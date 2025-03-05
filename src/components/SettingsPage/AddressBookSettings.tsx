import { memo, useState, useCallback, useEffect } from 'react'
import { useLiteclientState } from '@/store/liteClient'
import useAddressBook from '@/hooks/useAddressBook'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAddressBook } from '@fortawesome/free-solid-svg-icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import AddressesList from './AddressesList'
import AddAddressForm from './AddAddressForm'

// Fixed network IDs for mainnet and testnet
const MAINNET_ID = -239
const TESTNET_ID = -3

const AddressBookSettings = memo(() => {
  const liteClientState = useLiteclientState()
  const selectedAppNetwork = liteClientState.selectedNetwork.get()
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(null)
  const addressBook = useAddressBook()

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

  const handleAddAddress = useCallback(
    async (address: string, title: string, description: string) => {
      if (!selectedNetworkId) return 0
      return await addressBook.addAddress(selectedNetworkId, address, title, description)
    },
    [selectedNetworkId, addressBook]
  )

  return (
    <div className="space-y-6">
      <Card className="border shadow overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pt-6 pb-6">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faAddressBook} className="text-primary" />
            <div>
              <CardTitle className="text-lg">Address Book</CardTitle>
              <CardDescription>Save and manage addresses for different networks</CardDescription>
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
                addressBook={addressBook}
                onAddAddress={handleAddAddress}
              />
            </TabsContent>

            <TabsContent value={TESTNET_ID.toString()} className="mt-0 space-y-6">
              <NetworkContent
                networkId={TESTNET_ID}
                networkName="Testnet"
                addressBook={addressBook}
                onAddAddress={handleAddAddress}
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
  addressBook: ReturnType<typeof useAddressBook>
  onAddAddress: (address: string, title: string, description: string) => Promise<number>
}

const NetworkContent = memo(
  ({ networkId, networkName, addressBook, onAddAddress }: NetworkContentProps) => {
    const networkIndicatorClass = networkId === MAINNET_ID ? 'bg-green-500' : 'bg-blue-500'
    const [addressCount, setAddressCount] = useState(0)

    // Load address count
    useEffect(() => {
      const fetchAddressCount = async () => {
        const result = await addressBook.getAddressesPaginated(networkId, 1, 1)
        setAddressCount(result.totalCount)
      }

      fetchAddressCount()
    }, [networkId, addressBook])

    return (
      <>
        {/* Network Info Card */}
        <Card className="border shadow-sm">
          <CardHeader className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${networkIndicatorClass} inline-block`}
                ></span>
                <CardTitle className="text-lg">{networkName}</CardTitle>
              </div>
              <CardDescription>
                {addressCount
                  ? `${addressCount} ${addressCount === 1 ? 'address' : 'addresses'} saved`
                  : 'No addresses saved yet'}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Addresses List */}
        <AddressesList networkId={networkId} networkName={networkName} addressBook={addressBook} />

        {/* Add Address Form */}
        <Card className="border shadow-sm">
          <CardHeader className="pt-4 pb-4">
            <CardTitle className="text-lg">Add New Address</CardTitle>
            <CardDescription>Save a new address for {networkName}</CardDescription>
          </CardHeader>
          <CardContent>
            <AddAddressForm onAddAddress={onAddAddress} />
          </CardContent>
        </Card>
      </>
    )
  }
)

NetworkContent.displayName = 'NetworkContent'

AddressBookSettings.displayName = 'AddressBookSettings'

export default AddressBookSettings
