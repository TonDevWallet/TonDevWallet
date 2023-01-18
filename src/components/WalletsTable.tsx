import { DeleteKeyWallet } from '@/store/walletsListState'
import { setSelectedWallet } from '@/store/walletState'
import { useSelectedTonWallet } from '@/utils/wallets'
import { ITonHighloadWalletV2, ITonWallet, IWallet } from '../types'
import { AddressRow } from './AddressRow'

// const defaultHighloadId = 1
// const defaultTonWalletId = 698983191

function TonWalletRow({ wallet, isSelected }: { wallet: ITonWallet; isSelected: boolean }) {
  return (
    <div
      className="my-2 flex flex-col border"
      key={wallet.address.toString({ bounceable: true, urlSafe: true })}
    >
      <div className="flex justify-between border-b px-1">
        <div className="">
          Wallet {wallet.type} ({wallet.subwalletId})
          <a
            href={getScanLink(wallet.address.toString({ bounceable: true, urlSafe: true }), false)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2"
          >
            Link
          </a>
        </div>

        {isSelected ? (
          <div>Selected</div>
        ) : (
          <div className="cursor-pointer text-accent" onClick={() => setSelectedWallet(wallet)}>
            Use this wallet
          </div>
        )}
      </div>

      <div className="px-2 mt-2">
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

      <div className="px-2 mt-1">
        <div className="cursor-pointer text-accent" onClick={() => deleteWallet(wallet.id)}>
          Disconnect
        </div>
      </div>
    </div>
  )
}

const deleteWallet = (walletId: number) => {
  // DeleteKeyWallet(walletId)
}

function HighloadWalletRow({
  wallet,
  isSelected,
}: {
  wallet: ITonHighloadWalletV2
  isSelected: boolean
}) {
  return (
    <div
      className="my-2 flex flex-col border"
      key={wallet.address.toString({ bounceable: true, urlSafe: true })}
    >
      <div className="flex justify-between border-b px-1">
        <div className="">
          Wallet {wallet.type} ({wallet.subwalletId})
          <a
            href={getScanLink(wallet.address.toString({ bounceable: true, urlSafe: true }), false)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2"
          >
            Link
          </a>
        </div>

        {isSelected ? (
          <div>Selected</div>
        ) : (
          <div className="cursor-pointer text-accent" onClick={() => setSelectedWallet(wallet)}>
            Use this wallet
          </div>
        )}
      </div>

      <div className="px-2 mt-2 border-b">
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

      <div className="px-2 mt-1">
        <div className="cursor-pointer text-accent" onClick={() => deleteWallet(wallet.id)}>
          Disconnect
        </div>
      </div>
    </div>
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
      <div className="font-medium text-lg text-accent my-2">Wallets:</div>

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

function getScanLink(address: string, testnet: boolean): string {
  return `https://${testnet ? 'testnet.' : ''}tonscan.org/address/${address}`
}
