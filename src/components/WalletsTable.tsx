import { useLiteclient, useLiteclientState } from '@/store/liteClient'
import { UpdateKeyWalletName } from '@/store/walletsListState'
import { useSelectedKey } from '@/store/walletState'
import { useEffect, useMemo, useState, useRef } from 'react'
import { IWallet } from '@/types'
import { AddressRow } from './AddressRow'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShareFromSquare, faFileEdit, faCoins } from '@fortawesome/free-solid-svg-icons'
import { WalletJazzicon } from './WalletJazzicon'
import { Address, Dictionary, ExtraCurrency } from '@ton/core'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { extractEc } from '@ton/sandbox/dist/utils/ec'
import useExtraCurrencies from '@/hooks/useExtraCurrencies'
import { formatUnits } from '@/utils/units'
import TransferButton from './wallets/tonweb/TransferButton'
import { Key } from '@/types/Key'
import DeleteButton from './wallets/tonweb/DeleteButton'
import { Link } from 'react-router-dom'

function WalletRow({ wallet }: { wallet: IWallet }) {
  const liteClientState = useLiteclientState()
  const isTestnet = liteClientState.selectedNetwork.is_testnet.get()
  const scannerUrl = liteClientState.selectedNetwork.scanner_url.get() || 'https://tonviewer.com/'
  const scanAddress = wallet.address.toString({ bounceable: true, urlSafe: true })
  const scanLink = useMemo(() => {
    const addAddress = scannerUrl.indexOf('tonviewer.com') === -1
    return `${scannerUrl}${addAddress ? 'address/' : ''}${scanAddress}`
  }, [scannerUrl, scanAddress])
  const selectedKey = useSelectedKey()
  const liteClient = useLiteclient()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(wallet.name || '')
  const inputRef = useRef<HTMLInputElement>(null)
  const { currentNetworkCurrencies: currencies } = useExtraCurrencies()

  const handleNameSubmit = async () => {
    await UpdateKeyWalletName(wallet.id, name)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setName(wallet.name || '')
    }
  }

  const [balance, setBalance] = useState('')
  const [extraBalances, setExtraBalances] = useState<ExtraCurrency>({})
  const updateBalance = async () => {
    const state = await liteClient.getAccountState(
      Address.parse(wallet.address.toString({ bounceable: true, urlSafe: true })),
      (await liteClient.getMasterchainInfo()).last
    )
    setBalance(state.balance.coins.toString())
    if (state.balance.other) {
      if (state.balance.other instanceof Dictionary) {
        setExtraBalances(extractEc(state.balance.other))
      } else {
        setExtraBalances(state.balance.other)
      }
    }
  }

  useEffect(() => {
    setBalance('0')
    setExtraBalances({})
    updateBalance().then()
  }, [wallet, liteClient])

  // <Block
  //   className="my-2 flex flex-col border"
  //   bg={isSelected && 'dark:bg-foreground/15 bg-background border-accent dark:border-none'}
  //   key={wallet.address.toString({ bounceable: true, urlSafe: true })}
  // >
  return (
    <Card>
      <CardHeader>
        <CardTitle className={'flex items-center justify-between'}>
          <div className="flex items-center h-9">
            <WalletJazzicon wallet={wallet} className="mr-2" />
            {isEditing ? (
              <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleNameSubmit}
                className="w-48 border-primary"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <span>{name || `Wallet ${wallet.type}`}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 p-0"
                >
                  <FontAwesomeIcon icon={faFileEdit} className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <a href={scanLink} target="_blank" rel="noopener noreferrer" className="ml-2">
            <FontAwesomeIcon icon={faShareFromSquare} />
          </a>
        </CardTitle>
        <CardDescription>
          Balance: {balance ? formatUnits(balance, 9) : 0} TON
          {Object.entries(extraBalances).length > 0 && (
            <div className="mt-1 space-y-1">
              {Object.entries(extraBalances).map(([currency, amount]) => {
                const currencyMeta = currencies[currency]
                const decimals = currencyMeta?.decimals || 0
                const symbol = currencyMeta?.symbol || `Currency #${currency}`
                const formattedAmount = formatUnits(amount, decimals)

                return (
                  <div key={currency} className="text-sm text-muted-foreground">
                    {symbol}: {formattedAmount} {currencyMeta && `(ID: ${currency})`}
                  </div>
                )
              })}
            </div>
          )}
        </CardDescription>
        {'subwalletId' in wallet && (
          <CardDescription>Subwallet ID: {wallet.subwalletId.toString()}</CardDescription>
        )}
        <CardDescription>Workchain: {wallet.workchainId}</CardDescription>
        <CardDescription>Wallet Type: {wallet.type}</CardDescription>
        {wallet.type === 'highload_v3' && (
          <CardDescription>Timeout: {wallet.timeout} seconds</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex flex-col">
          <AddressRow
            text={<span className="w-32 shrink-0">Bouncable:</span>}
            address={wallet.address.toString({
              bounceable: true,
              urlSafe: true,
              testOnly: isTestnet,
            })}
            containerClassName={'hover:text-accent-light'}
          />
          <AddressRow
            text={<span className="w-32 shrink-0">UnBouncable:</span>}
            address={wallet.address.toString({
              urlSafe: true,
              bounceable: false,
              testOnly: isTestnet,
            })}
            containerClassName={'hover:text-accent-light'}
          />
          <AddressRow
            text={<span className="w-32 shrink-0">Raw:</span>}
            address={wallet.address.toRawString()}
            containerClassName={'hover:text-accent-light'}
          />
        </div>
      </CardContent>

      {/* <div className="mt-1"> */}
      <CardFooter className="flex gap-2 flex-col">
        <div className="w-full flex gap-2">
          <TransferButton wallet={wallet} selectedKey={selectedKey?.get() as Key} />
          <Link to={`/app/wallets/${selectedKey?.id.get()}/${wallet.id}/assets`}>
            <Button variant="outline">
              <FontAwesomeIcon icon={faCoins} className="mr-1" />
              Assets
            </Button>
          </Link>
        </div>
        <div className="w-full flex gap-2">
          <DeleteButton wallet={wallet} />
        </div>
      </CardFooter>
    </Card>
  )
}

export function WalletsTable({ walletsToShow }: { walletsToShow?: IWallet[] }) {
  return (
    <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4'}>
      {walletsToShow?.map((wallet) => <WalletRow wallet={wallet} key={wallet.id} />)}
    </div>
  )
}
