import { useLiteclient, useLiteclientState } from '@/store/liteClient'
import { DeleteKeyWallet } from '@/store/walletsListState'
import { setSelectedWallet } from '@/store/walletState'
import { useSelectedTonWallet } from '@/utils/wallets'
import { useEffect, useMemo, useState } from 'react'
import { IWallet } from '@/types'
import { AddressRow } from './AddressRow'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan, faArrowRight, faShareFromSquare } from '@fortawesome/free-solid-svg-icons'
import { WalletJazzicon } from './WalletJazzicon'
import { Address } from '@ton/core'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/utils/cn'

// const defaultHighloadId = 1
// const defaultTonWalletId = 698983191

const deleteWallet = (walletId: number) => {
  return DeleteKeyWallet(walletId)
}

function WalletRow({ wallet, isSelected }: { wallet: IWallet; isSelected: boolean }) {
  const isTestnet = useLiteclientState().testnet.get()
  const liteClient = useLiteclient()

  const [balance, setBalance] = useState('')
  const updateBalance = async () => {
    const state = await liteClient.getAccountState(
      Address.parse(wallet.address.toString({ bounceable: true, urlSafe: true })),
      (await liteClient.getMasterchainInfo()).last
    )
    setBalance(state.balance.coins.toString())
  }

  useEffect(() => {
    setBalance('0')
    updateBalance().then()
  }, [wallet, liteClient])

  // <Block
  //   className="my-2 flex flex-col border"
  //   bg={isSelected && 'dark:bg-foreground/15 bg-background border-accent dark:border-none'}
  //   key={wallet.address.toString({ bounceable: true, urlSafe: true })}
  // >
  return (
    <Card className={cn(isSelected && 'bg-accent')}>
      <CardHeader>
        <CardTitle className={'flex items-center justify-between'}>
          <a
            href={getScanLink(wallet.address.toString({ bounceable: true, urlSafe: true }))}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center h-9"
          >
            <WalletJazzicon wallet={wallet} className="mr-2" />
            Wallet {wallet.type}
            <FontAwesomeIcon icon={faShareFromSquare} className="ml-2" />
          </a>

          {!isSelected && (
            <Button
              // className="cursor-pointer text-primary"
              onClick={() => setSelectedWallet(wallet)}
              variant={'ghost'}
            >
              Use this wallet
              <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Balance: {balance ? parseFloat(balance) / 10 ** 9 : 0} TON
        </CardDescription>
        <CardDescription>Subwallet ID: {wallet.subwalletId}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col">
          <AddressRow
            text={<span className="w-32 flex-shrink-0">Bouncable:</span>}
            address={wallet.address.toString({
              bounceable: true,
              urlSafe: true,
              testOnly: isTestnet,
            })}
            containerClassName={'hover:text-accent-light'}
          />
          <AddressRow
            text={<span className="w-32 flex-shrink-0">UnBouncable:</span>}
            address={wallet.address.toString({
              urlSafe: true,
              bounceable: false,
              testOnly: isTestnet,
            })}
            containerClassName={'hover:text-accent-light'}
          />
          <AddressRow
            text={<span className="w-32 flex-shrink-0">Raw:</span>}
            address={wallet.address.toRawString()}
            containerClassName={'hover:text-accent-light'}
          />
        </div>
      </CardContent>

      {/* <div className="mt-1"> */}
      <CardFooter className="flex justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">
              <FontAwesomeIcon icon={faTrashCan} className="mr-1" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                Wallet will be deleted from. You can add it back later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteWallet(wallet.id)}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}

export function WalletsTable({ walletsToShow }: { walletsToShow?: IWallet[] }) {
  const currentWallet = useSelectedTonWallet()

  return (
    <div className={'flex flex-col gap-4 py-4'}>
      {walletsToShow?.map((wallet) =>
        wallet.type === 'highload' ? (
          <WalletRow wallet={wallet} isSelected={currentWallet?.id === wallet.id} key={wallet.id} />
        ) : (
          <WalletRow wallet={wallet} isSelected={currentWallet?.id === wallet.id} key={wallet.id} />
        )
      )}
    </div>
  )
}

function getScanLink(address: string): string {
  const isTestnet = useLiteclientState().testnet.get()
  return useMemo(
    () => `https://${isTestnet ? 'testnet.' : ''}tonscan.org/address/${address}`,
    [isTestnet]
  )
}
