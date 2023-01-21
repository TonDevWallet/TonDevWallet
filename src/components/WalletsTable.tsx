import { useLiteclientState } from '@/store/liteClient'
import { DeleteKeyWallet } from '@/store/walletsListState'
import { setSelectedWallet } from '@/store/walletState'
import { useSelectedTonWallet } from '@/utils/wallets'
import { useMemo } from 'react'
import { ITonHighloadWalletV2, ITonWallet, IWallet } from '../types'
import { AddressRow } from './AddressRow'
import { ReactPopup } from './Popup'
import { Block } from './ui/Block'
import { BlueButton } from './ui/BlueButton'

// const defaultHighloadId = 1
// const defaultTonWalletId = 698983191

const deleteWallet = (walletId: number) => {
  return DeleteKeyWallet(walletId)
}

function TonWalletRow({ wallet, isSelected }: { wallet: ITonWallet; isSelected: boolean }) {
  return (
    <Block
      className="my-2 flex flex-col border"
      bg={isSelected && 'dark:bg-foreground/15 bg-background border-accent dark:border-none'}
      key={wallet.address.toString({ bounceable: true, urlSafe: true })}
    >
      <div className="flex justify-between">
        <div className="">
          Wallet {wallet.type} ({wallet.subwalletId})
          <a
            href={getScanLink(wallet.address.toString({ bounceable: true, urlSafe: true }))}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2"
          >
            Link
          </a>
        </div>

        {!isSelected && (
          <div
            className="cursor-pointer text-accent dark:text-accent-light"
            onClick={() => setSelectedWallet(wallet)}
          >
            Use this wallet
          </div>
        )}
      </div>

      <div className="mt-2">
        <AddressRow
          text="Bouncable:"
          address={wallet.address.toString({ bounceable: true, urlSafe: true })}
        />
        <AddressRow
          text="UnBouncable:"
          address={wallet.address.toString({ urlSafe: true, bounceable: false })}
        />
        <AddressRow text="Raw:" address={wallet.address.toRawString()} />
      </div>

      <div className="mt-1">
        <ReactPopup
          trigger={
            <button className="cursor-pointer text-accent dark:text-accent-light">Delete</button>
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

function HighloadWalletRow({
  wallet,
  isSelected,
}: {
  wallet: ITonHighloadWalletV2
  isSelected: boolean
}) {
  return (
    <Block
      className="my-2 flex flex-col border"
      bg={isSelected && 'dark:bg-foreground/15 bg-background border-accent dark:border-none'}
      key={wallet.address.toString({ bounceable: true, urlSafe: true })}
    >
      <div className="flex justify-between">
        <div className="">
          Wallet {wallet.type} ({wallet.subwalletId})
          <a
            href={getScanLink(wallet.address.toString({ bounceable: true, urlSafe: true }))}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2"
          >
            Link
          </a>
        </div>

        {!isSelected && (
          <div
            className="cursor-pointer text-accent dark:text-accent-light"
            onClick={() => setSelectedWallet(wallet)}
          >
            Use this wallet
          </div>
        )}
      </div>

      <div className="mt-2">
        <AddressRow
          text="Bouncable:"
          address={wallet.address.toString({ bounceable: true, urlSafe: true })}
        />
        <AddressRow
          text="UnBouncable:"
          address={wallet.address.toString({ bounceable: false, urlSafe: true })}
        />
        <AddressRow text="Raw:" address={wallet.address.toRawString()} />
      </div>

      <div className="mt-1">
        <ReactPopup
          trigger={
            <button className="cursor-pointer text-accent dark:text-accent-light">Delete</button>
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

// function ExternalWalletRow({
//   wallet,
//   isSelected,

//   setWallet,
// }: {
//   wallet: ITonExternalWallet
//   isSelected: boolean
//   setWallet: (wallet: IWallet) => void
// }) {
//   return (
//     <div className="my-2 flex flex-col border" key={wallet.id}>
//       <div className="flex justify-between border-b px-1">
//         <div className="">Wallet {wallet.type}</div>

//         {isSelected ? (
//           <div>Selected</div>
//         ) : (
//           <div className="cursor-pointer text-accent" onClick={() => setWallet(wallet.id)}>
//             Use this wallet
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

export function WalletsTable({
  walletsToShow,
}: // currentWallet,

// setWallet,
{
  walletsToShow?: IWallet[]
  // currentWallet?: IWallet

  // setWallet: (wallet: IWallet) => void
}) {
  // const currentWallet = useMemo(() => wallet.selectedWallet.get(), [wallet.selectedWallet])
  const currentWallet = useSelectedTonWallet()

  return (
    <>
      {/* <div className="font-medium text-lg text-accent my-2">Wallets:</div> */}

      {walletsToShow?.map((wallet) =>
        wallet.type === 'highload' ? (
          <HighloadWalletRow
            wallet={wallet}
            isSelected={currentWallet?.id === wallet.id}
            // setWallet={setSelectedWallet}
            key={wallet.id}
          />
        ) : (
          // : wallet.type === 'external' ? (
          //   <ExternalWalletRow
          //     wallet={wallet}
          //     isSelected={currentWallet?.id === wallet.id}
          //     setWallet={setSelectedWallet}
          //     key={wallet.id}
          //   />
          // )
          <TonWalletRow
            wallet={wallet}
            isSelected={currentWallet?.id === wallet.id}
            // setWallet={setSelectedWallet}
            key={wallet.id}
          />
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
