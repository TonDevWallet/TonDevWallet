import { useLiteclient, useLiteclientState } from '@/store/liteClient'
import { DeleteKeyWallet } from '@/store/walletsListState'
import { setSelectedWallet } from '@/store/walletState'
import { useSelectedTonWallet } from '@/utils/wallets'
import { useEffect, useMemo, useState } from 'react'
import { IWallet } from '@/types'
import { AddressRow } from './AddressRow'
import { ReactPopup } from './Popup'
import { Block } from './ui/Block'
import { BlueButton } from './ui/BlueButton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan, faArrowRight, faShareFromSquare } from '@fortawesome/free-solid-svg-icons'
import { WalletJazzicon } from './WalletJazzicon'
import { Address } from '@ton/core'

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

  return (
    <Block
      className="my-2 flex flex-col border"
      bg={isSelected && 'dark:bg-foreground/15 bg-background border-accent dark:border-none'}
      key={wallet.address.toString({ bounceable: true, urlSafe: true })}
    >
      <div className="flex justify-between items-center">
        <div className="">
          <a
            href={getScanLink(wallet.address.toString({ bounceable: true, urlSafe: true }))}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <WalletJazzicon wallet={wallet} className="mr-2" />
            Wallet {wallet.type}
            <FontAwesomeIcon icon={faShareFromSquare} className="ml-2" />
          </a>
        </div>

        {!isSelected && (
          <div
            className="cursor-pointer text-accent dark:text-accent-light hover:text-accent"
            onClick={() => setSelectedWallet(wallet)}
          >
            Use this wallet
            <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col">
        <div className="flex">
          <span className="w-32 flex-shrink-0">Subwallet ID: </span>
          <span>{wallet.subwalletId}</span>
        </div>

        <div className="flex">
          <span className="w-32 flex-shrink-0">Balance: </span>
          <span>{balance ? parseFloat(balance) / 10 ** 9 : 0} TON</span>
        </div>
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

      <div className="mt-1">
        <ReactPopup
          trigger={
            <button className="cursor-pointer text-accent dark:text-accent-light flex items-center hover:text-accent">
              <FontAwesomeIcon icon={faTrashCan} className="mr-1" />
              Delete
            </button>
          }
          position={'bottom left'}
        >
          {(close: () => void) => {
            return (
              <div className="flex flex-col gap-2 p-2">
                Are you sure?
                <div className="flex gap-2">
                  <BlueButton className="" onClick={close}>
                    Cancel
                  </BlueButton>
                  <BlueButton
                    className="bg-red-500"
                    onClick={async () => {
                      await deleteWallet(wallet.id)
                      close()
                    }}
                  >
                    Delete
                  </BlueButton>
                </div>
              </div>
            )
          }}
        </ReactPopup>
      </div>
    </Block>
  )
}

export function WalletsTable({ walletsToShow }: { walletsToShow?: IWallet[] }) {
  const currentWallet = useSelectedTonWallet()

  return (
    <>
      {walletsToShow?.map((wallet) =>
        wallet.type === 'highload' ? (
          <WalletRow wallet={wallet} isSelected={currentWallet?.id === wallet.id} key={wallet.id} />
        ) : (
          <WalletRow wallet={wallet} isSelected={currentWallet?.id === wallet.id} key={wallet.id} />
        )
      )}
    </>
  )
}

function getScanLink(address: string): string {
  const isTestnet = useLiteclientState().testnet.get()
  return useMemo(
    () => `https://${isTestnet ? 'testnet.' : ''}tonscan.org/address/${address}`,
    [isTestnet]
  )
}
