import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  setSelectedWallet as setGlobalSelectedWallet,
  setWalletKey,
  useSelectedKey,
} from '@/store/walletState'
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
import {
  faCheckCircle,
  faExclamationTriangle,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons'
import { IWallet } from '@/types'
import { WalletJazzicon } from '@/components/WalletJazzicon'
import {
  WalletAddressPopover,
  getWalletDisplayName,
  getWalletMetadata,
  getWalletTypeLabel,
} from '@/components/WalletManagement'

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
  walletAddress: string
  usdValue?: number
}

function jettonVerificationFromApi(v: unknown): 'whitelist' | 'blacklist' | 'none' {
  if (v === 'whitelist' || v === 'blacklist' || v === 'none') {
    return v
  }
  return 'none'
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
  const [selectedWallet, setSelectedWalletForPage] = useState<IWallet | null>(null)

  useEffect(() => {
    if (!keyId || !walletId || walletsList.get().length === 0) return

    const parsedKeyId = parseInt(keyId)
    const parsedWalletId = parseInt(walletId)
    const keyData = walletsList.get().find((k) => k.id === parsedKeyId)
    if (!keyData) {
      setLoading(false)
      return
    }

    if (selectedKey?.id.get() !== parsedKeyId) {
      setWalletKey(parsedKeyId).catch((error) =>
        console.error('Failed to set assets page key context:', error)
      )
    }

    const walletData = keyData.wallets?.find((w) => w.id === parsedWalletId)
    if (!walletData) {
      setLoading(false)
      return
    }

    const wallet = getWalletFromKey(liteClient, keyData, walletData)
    if (!wallet) {
      setLoading(false)
      return
    }

    setSelectedWalletForPage(wallet)
    setGlobalSelectedWallet(wallet)
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
          verification: jettonVerificationFromApi(balance.jetton.verification),
          usdValue,
          walletAddress: balance.wallet_address.address,
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

  const walletMetadata = selectedWallet ? getWalletMetadata(selectedWallet) : []
  const walletHeader = selectedWallet ? (
    <div className="mb-6 rounded-[28px] border border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <WalletJazzicon wallet={selectedWallet} diameter={44} className="shrink-0" />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">Assets</h1>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {getWalletTypeLabel(selectedWallet)}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {getWalletDisplayName(selectedWallet)} · {selectedKey?.name.get() || 'Key'}
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/app/wallets_list">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Wallets
          </Link>
        </Button>
      </div>
      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <WalletAddressPopover
          wallet={selectedWallet}
          className="max-w-full rounded-full sm:max-w-[460px]"
        />
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {walletMetadata.map((meta) => (
            <span key={meta.label} className="inline-flex items-baseline gap-1">
              <span>{meta.label}</span>
              <span className="font-mono tabular-nums text-foreground/75">{meta.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
      <p className="text-muted-foreground">Loading wallet context...</p>
    </div>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        {walletHeader}
        <div className="flex h-48 items-center justify-center rounded-[28px] border border-border/70 bg-card/60">
          <div className="text-sm text-muted-foreground">Loading assets...</div>
        </div>
      </div>
    )
  }

  if (!selectedWallet) {
    return (
      <div className="container mx-auto p-6">
        {walletHeader}
        <div className="rounded-[28px] border border-border/70 bg-card/60 p-6 text-sm text-muted-foreground">
          Wallet context is unavailable. Return to All Wallets and open Assets from a wallet row.
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {walletHeader}

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
                <Card key={`${jettonBalance.jetton.address}-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={jettonBalance.jetton.image}
                              alt={jettonBalance.jetton.name}
                            />
                            <AvatarFallback>{jettonBalance.jetton.symbol.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {jettonBalance.verification === 'whitelist' && (
                            <FontAwesomeIcon
                              icon={faCheckCircle}
                              className="absolute -bottom-1 -right-1 text-green-500 text-sm bg-white rounded-full"
                              title="Verified jetton"
                            />
                          )}
                          {jettonBalance.verification === 'blacklist' && (
                            <FontAwesomeIcon
                              icon={faExclamationTriangle}
                              className="absolute -bottom-1 -right-1 text-red-500 text-sm bg-white rounded-full"
                              title="Potentially scam jetton"
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-lg">{jettonBalance.jetton.name}</h3>
                            <Badge variant="secondary">{jettonBalance.jetton.symbol}</Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm mb-1">
                              {formatUnits(
                                BigInt(jettonBalance.balance),
                                jettonBalance.jetton.decimals
                              )}{' '}
                              {jettonBalance.jetton.symbol}
                            </div>
                            {jettonBalance.usdValue && jettonBalance.usdValue > 0 && (
                              <div className="text-sm font-medium text-muted-foreground">
                                ≈ ${jettonBalance.usdValue.toFixed(2)} USD
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => handleJettonTransfer(jettonBalance)} variant="outline">
                        Transfer
                      </Button>
                    </div>
                  </CardContent>
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
              <p className="text-muted-foreground mb-2">
                You can use Getgems to view and transfer your NFTs.
              </p>

              {/* getgems link */}
              <a
                href={`https://getgems.io/user/${selectedWallet.address.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className=""
              >
                <Button variant="outline">View on Getgems</Button>
              </a>
              {/* {nfts.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm">Found {nfts.length} NFT(s) in this wallet.</p>
                </div>
              )} */}
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
