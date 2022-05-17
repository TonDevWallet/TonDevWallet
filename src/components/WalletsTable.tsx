import { IWallet } from '../types'
import { AddressRow } from './AddressRow'

export function WalletsTable({
  walletsToShow,
  currentWallet,

  setWallet,
}: {
  walletsToShow?: IWallet[]
  currentWallet?: IWallet

  setWallet: (wallet: IWallet) => void
}) {
  return (
    <>
      <div className="font-medium text-lg text-accent my-2">Wallets:</div>

      {walletsToShow?.map((wallet) => (
        <div className="my-2 flex flex-col border" key={wallet.address.toString(true, true, true)}>
          <div className="flex justify-between border-b px-1">
            <div className="">
              Wallet {wallet.type}
              <a
                href={getScanLink(wallet.address.toString(true, true, true), false)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2"
              >
                Link
              </a>
            </div>

            {currentWallet && currentWallet.address.toString() === wallet.address.toString() ? (
              <div>Selected</div>
            ) : (
              <div className="cursor-pointer text-highlight" onClick={() => setWallet(wallet)}>
                Use this wallet
              </div>
            )}
          </div>

          <div className="px-2 my-2">
            <AddressRow text="Bouncable:" address={wallet.address.toString(true, true, true)} />
            <AddressRow text="UnBouncable:" address={wallet.address.toString(true, true, false)} />
            <AddressRow text="Raw:" address={wallet.address.toString(false)} />
          </div>
        </div>
      ))}
    </>
  )
}

function getScanLink(address: string, testnet: boolean): string {
  return `https://${testnet ? 'testnet.' : ''}tonscan.org/address/${address}`
}
