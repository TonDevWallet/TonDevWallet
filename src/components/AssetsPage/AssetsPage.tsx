import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSelectedKey, setWalletKey } from '@/store/walletState'
import { getWalletFromKey } from '@/utils/wallets'
import { useTonapiClient, useLiteclient } from '@/store/liteClient'
import { useWalletListState } from '@/store/walletsListState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatUnits } from '@/utils/units'
import { JettonTransferModal } from './JettonTransferModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

interface JettonBalance {
  balance: string
  jetton: {
    address: string
    name: string
    symbol: string
    decimals: number
    image?: string
  }
  price?: {
    usd: number
  }
  verification?: 'whitelist' | 'blacklist' | 'none'
  usdValue?: number
}

interface NFTItem {
  address: string
  index: number
  collection?: {
    address: string
    name: string
  }
  metadata?: {
    name?: string
    image?: string
    description?: string
  }
}

export function AssetsPage() {
  const { keyId, walletId } = useParams<{ keyId: string; walletId: string }>()
  const walletsList = useWalletListState()
  const liteClient = useLiteclient()
  const selectedKey = useSelectedKey()
  const tonapiClient = useTonapiClient()

  // Find the specific wallet by keyId and walletId
  const [selectedWallet, setSelectedWallet] = useState<any>(null)

  useEffect(() => {
    if (keyId && walletId && walletsList.get().length > 0) {
      const keyData = walletsList.get().find((k) => k.id === parseInt(keyId))
      if (keyData) {
        // Set the key if it's not already selected
        if (selectedKey?.id.get() !== parseInt(keyId)) {
          setWalletKey(parseInt(keyId))
        }

        // Find the specific wallet
        const walletData = keyData.wallets?.find((w) => w.id === parseInt(walletId))
        if (walletData) {
          const wallet = getWalletFromKey(liteClient, keyData, walletData)
          setSelectedWallet(wallet)
        }
      }
    }
  }, [keyId, walletId, walletsList, liteClient, selectedKey])

  const [jettons, setJettons] = useState<JettonBalance[]>([])
  const [nfts, setNfts] = useState<NFTItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJetton, setSelectedJetton] = useState<JettonBalance | null>(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)

  useEffect(() => {
    if (selectedWallet && tonapiClient) {
      loadAssets()
    }
  }, [selectedWallet, tonapiClient])

  const loadAssets = async () => {
    if (!selectedWallet || !tonapiClient) return

    setLoading(true)
    try {
      const walletAddress = selectedWallet.address.toString()

      // Load jetton balances
      const jettonsResponse = await tonapiClient.accounts.getAccountJettonsBalances(walletAddress, {
        currencies: ['usd'],
      })
      const jettonBalances: JettonBalance[] = jettonsResponse.balances.map((balance) => {
        const tokenBalance = parseFloat(
          formatUnits(BigInt(balance.balance), balance.jetton.decimals || 9)
        )
        const usdPrice = balance.price?.prices?.USD || 0
        // const usdPrice = balance.price?.prices || 0
        const usdValue = tokenBalance * usdPrice

        return {
          balance: balance.balance,
          jetton: {
            address: balance.jetton.address,
            name: balance.jetton.name || 'Unknown',
            symbol: balance.jetton.symbol || 'UNKNOWN',
            decimals: balance.jetton.decimals || 9,
            image: balance.jetton.image,
          },
          price: balance.price ? { usd: balance.price?.prices?.USD ?? 0 } : { usd: 0 },
          verification: balance.jetton.verification || 'none',
          usdValue,
        }
      })

      // Sort jettons by USD value (highest first)
      const sortedJettons = jettonBalances.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))

      setJettons(sortedJettons)

      // Load NFTs
      const nftsResponse = await tonapiClient.accounts.getAccountNftItems(walletAddress)
      const nftItems: NFTItem[] = nftsResponse.nft_items.map((nft: any) => ({
        address: nft.address,
        index: nft.index,
        collection: nft.collection
          ? {
              address: nft.collection.address,
              name: nft.collection.name,
            }
          : undefined,
        metadata: nft.metadata
          ? {
              name: nft.metadata.name,
              image: nft.metadata.image,
              description: nft.metadata.description,
            }
          : undefined,
      }))

      setNfts(nftItems)
    } catch (error) {
      console.error('Failed to load assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJettonTransfer = (jetton: JettonBalance) => {
    setSelectedJetton(jetton)
    setTransferModalOpen(true)
  }

  // Convert immutable key to plain object for JettonTransferModal
  const getPlainKey = () => {
    if (!selectedKey) return undefined
    const key = selectedKey.get({ noproxy: true })
    return {
      ...key,
      wallets: key.wallets ? [...key.wallets] : undefined,
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading assets...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Assets</h1>
        <p className="text-muted-foreground">
          Manage your jettons and NFTs for wallet {selectedKey?.name.get()}
        </p>
      </div>

      <Tabs defaultValue="jettons" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="jettons">Jettons ({jettons.length})</TabsTrigger>
          <TabsTrigger value="nfts">NFTs ({nfts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="jettons" className="space-y-4">
          {jettons.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Jettons Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">This wallet doesn't have any jetton tokens.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {jettons.map((jettonBalance, index) => (
                <Card key={`${jettonBalance.jetton.address}-${index}`} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={jettonBalance.jetton.image}
                          alt={jettonBalance.jetton.name}
                        />
                        <AvatarFallback>{jettonBalance.jetton.symbol.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">{jettonBalance.jetton.name}</h3>
                          {jettonBalance.verification === 'whitelist' && (
                            <FontAwesomeIcon
                              icon={faCheckCircle}
                              className="text-green-500 text-sm"
                              title="Verified jetton"
                            />
                          )}
                          {jettonBalance.verification === 'blacklist' && (
                            <FontAwesomeIcon
                              icon={faExclamationTriangle}
                              className="text-red-500 text-sm"
                              title="Potentially scam jetton"
                            />
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{jettonBalance.jetton.symbol}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatUnits(
                              BigInt(jettonBalance.balance),
                              jettonBalance.jetton.decimals
                            )}{' '}
                            {jettonBalance.jetton.symbol}
                          </span>
                        </div>
                        {jettonBalance.usdValue && jettonBalance.usdValue > 0 && (
                          <div className="text-sm text-muted-foreground">
                            ≈ ${jettonBalance.usdValue.toFixed(2)} USD
                          </div>
                        )}
                      </div>
                    </div>
                    <Button onClick={() => handleJettonTransfer(jettonBalance)} variant="outline">
                      Transfer
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nfts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NFTs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                NFT management functionality will be implemented soon.
              </p>
              {nfts.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm">Found {nfts.length} NFT(s) in this wallet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedJetton && (
        <JettonTransferModal
          jetton={selectedJetton}
          wallet={selectedWallet}
          selectedKey={getPlainKey()}
          open={transferModalOpen}
          onOpenChange={setTransferModalOpen}
          onTransferComplete={() => {
            setTransferModalOpen(false)
            loadAssets() // Reload assets after transfer
          }}
        />
      )}
    </div>
  )
}
