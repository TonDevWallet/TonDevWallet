import { useEffect, useState } from 'react'
import Popup from 'reactjs-popup'
import TonWeb from 'tonweb'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
import { ITonWebWallet } from '../../../types'
import { BlueButton } from '../../UI'
import { WalletMarketplace } from '../../../contracts/WalletMarketpalce'

// const { NftMarketplace } = TonWeb.token.nft

export default function CreateMarketplace({
  seqno,
  wallet,
  updateBalance,
}: {
  seqno: string
  wallet: ITonWebWallet
  updateBalance: () => void
}) {
  const marketplace = new WalletMarketplace(new TonWeb.HttpProvider(), {
    publicKey: wallet.key.publicKey,
  })
  const [marketAddress, setMarketAddress] = useState('')

  useEffect(() => {
    marketplace.getAddress().then((address) => {
      setMarketAddress(address.toString(true, true, true))
    })
  }, [marketplace])

  return (
    <div className="p-4 border rounded shadow">
      <div>Marketplace</div>
      <div>Address: {marketAddress}</div>
      <CreateMarketplaceModal wallet={wallet} seqno={seqno} updateBalance={updateBalance} />
    </div>
  )
}

const CreateMarketplaceModal = ({
  wallet,
  seqno,
  updateBalance,
}: {
  wallet: ITonWebWallet
  seqno: string
  updateBalance: () => void
}) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const sendMoney = async (close: () => void) => {
    const amount = TonWeb.utils.toNano(0.05)
    const marketplace = new WalletMarketplace(new TonWeb.HttpProvider(), {
      publicKey: wallet.key.publicKey,
    })
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
    console.log('send success')

    updateBalance()
    close()
  }

  return (
    <>
      {!open && (
        <BlueButton className="mt-2" onClick={() => setOpen(true)}>
          Create
        </BlueButton>
      )}
      <Popup modal open={open}>
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
      </Popup>
    </>
  )
}
