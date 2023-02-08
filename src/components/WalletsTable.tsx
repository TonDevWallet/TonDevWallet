import { useLiteclientState } from '@/store/liteClient'
import { DeleteKeyWallet } from '@/store/walletsListState'
import { setSelectedWallet } from '@/store/walletState'
import { useSelectedTonWallet } from '@/utils/wallets'
import { useMemo } from 'react'
import { IWallet } from '../types'
import { AddressRow } from './AddressRow'
import { ReactPopup } from './Popup'
import { Block } from './ui/Block'
import { BlueButton } from './ui/BlueButton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { WalletJazzicon } from './WalletJazzicon'

// const defaultHighloadId = 1
// const defaultTonWalletId = 698983191

const deleteWallet = (walletId: number) => {
  return DeleteKeyWallet(walletId)
}

function WalletRow({ wallet, isSelected }: { wallet: IWallet; isSelected: boolean }) {
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
          </a>{' '}
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
        <AddressRow
          text={<span className="w-32 flex-shrink-0">Bouncable:</span>}
          address={wallet.address.toString({ bounceable: true, urlSafe: true })}
        />
        <AddressRow
          text={<span className="w-32 flex-shrink-0">UnBouncable:</span>}
          address={wallet.address.toString({ urlSafe: true, bounceable: false })}
        />
        <AddressRow
          text={<span className="w-32 flex-shrink-0">Raw:</span>}
          address={wallet.address.toRawString()}
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
        >
          {(close: () => void) => {
            return (
              <div className="flex gap-2">
                <BlueButton
                  className="bg-red-500"
                  onClick={async () => {
                    await deleteWallet(wallet.id)
                    close()
                  }}
                >
                  Confirm
                </BlueButton>
                <BlueButton className="" onClick={close}>
                  Cancel
                </BlueButton>
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
