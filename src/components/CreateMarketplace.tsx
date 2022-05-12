import { useEffect, useState } from 'preact/hooks'
import Popup from 'reactjs-popup'
import TonWeb from 'tonweb'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
import { IWallet } from '../types'
import { BlueButton } from './UI'

const { NftMarketplace } = TonWeb.token.nft

export default function CreateMarketplace({
  seqno,
  wallet,
  provider,
  updateBalance,
}: {
  seqno: string
  wallet: IWallet
  testnet: boolean
  provider: HttpProvider
  updateBalance: () => void
}) {
  const marketplace = new NftMarketplace(provider, { ownerAddress: wallet.address })
  const [marketAddress, setMarketAddress] = useState('')

  useEffect(() => {
    marketplace.getAddress().then((address) => {
      setMarketAddress(address.toString(true, true, true))
    })
  }, [marketplace])

  return (
    <div>
      <div>Marketplace</div>
      <div>Address: {marketAddress}</div>
      <CreateMarketplaceModal
        wallet={wallet}
        seqno={seqno}
        provider={provider}
        updateBalance={updateBalance}
      />
    </div>
  )
}

const CreateMarketplaceModal = ({
  wallet,
  seqno,
  provider,
  updateBalance,
}: {
  wallet: IWallet
  seqno: string
  provider: HttpProvider
  updateBalance: () => void
}) => {
  const sendMoney = async (close: () => void) => {
    const amount = TonWeb.utils.toNano(0.05)
    const marketplace = new NftMarketplace(provider, { ownerAddress: wallet.address })
    const marketplaceAddress = await marketplace.getAddress()
    // const nftItem = new NftItem(provider, { address: nftAddress })

    await wallet.wallet.methods
      .transfer({
        secretKey: wallet.key.secretKey,
        toAddress: marketplaceAddress.toString(true, true, false),
        amount: amount,
        seqno: parseInt(seqno),
        payload: undefined,
        sendMode: 3,
        stateInit: (await marketplace.createStateInit()).stateInit,
      })
      .send()

    updateBalance()
    close()
  }

  return (
    <Popup trigger={<BlueButton className="mt-2">Create</BlueButton>} modal close={close}>
      {(close: () => void) => (
        <div className="flex flex-col p-4">
          <div>You will create marketplace.</div>
          <div className="mt-4">Are you sure?</div>
          <div className="flex mt-2">
            <div
              className="bg-highlight rounded px-2 py-2 text-white cursor-pointer"
              onClick={() => sendMoney(close)}
            >
              Yes
            </div>
            <div
              className="bg-highlight rounded px-2 py-2 text-white cursor-pointer ml-8"
              onClick={() => close()}
            >
              Cancel
            </div>
          </div>
        </div>
      )}
    </Popup>
  )
}
