import { useState } from 'react'
import Popup from 'reactjs-popup'
import TonWeb from 'tonweb'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
// import nacl from 'tweetnacl'
import { IWallet } from '../types'
import { BlueButton } from './UI'

const { NftSale } = TonWeb.token.nft
// const { Cell } = TonWeb.boc

export default function CreateNftSale({
  seqno,
  wallet,
  provider,
  updateBalance,
}: {
  seqno: string
  wallet: IWallet
  provider: HttpProvider
  updateBalance: () => void
}) {
  const [marketAddress, setMarketAddress] = useState('')
  const [nftAddress, setNftAddress] = useState('')
  const [collectionAddress, setCollectionAddress] = useState('')

  return (
    <div className="p-4 border rounded shadow">
      <div>Nft Sale</div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftToInput">Market address:</label>
        <input
          className="border rounded p-2"
          id="nftToInput"
          type="text"
          value={marketAddress}
          onChange={(e: any) => setMarketAddress(e.target.value)}
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftToInput">Nft address:</label>
        <input
          className="border rounded p-2"
          id="nftToInput"
          type="text"
          value={nftAddress}
          onChange={(e: any) => setNftAddress(e.target.value)}
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftToInput">Collection address:</label>
        <input
          className="border rounded p-2"
          id="nftToInput"
          type="text"
          value={collectionAddress}
          onChange={(e: any) => setCollectionAddress(e.target.value)}
        />
      </div>

      {/* <div>Address: {marketAddress}</div> */}
      <CreateSaleModal
        marketAddress={marketAddress}
        nftAddress={nftAddress}
        collectionAddress={collectionAddress}
        wallet={wallet}
        seqno={seqno}
        provider={provider}
        updateBalance={updateBalance}
      />
    </div>
  )
}

const CreateSaleModal = ({
  marketAddress,
  nftAddress,
  collectionAddress,
  wallet,
  seqno,
  provider,
  updateBalance,
}: {
  marketAddress: string
  nftAddress: string
  collectionAddress: string
  wallet: IWallet
  seqno: string
  provider: HttpProvider
  updateBalance: () => void
}) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const sendMoney = async (close: () => void) => {
    const amount = TonWeb.utils.toNano(0.05)

    const sale = new NftSale(provider, {
      marketplaceAddress: new TonWeb.utils.Address(marketAddress),
      nftAddress: new TonWeb.utils.Address(nftAddress),
      fullPrice: TonWeb.utils.toNano('1.1'),
      marketplaceFee: TonWeb.utils.toNano('0.2'),
      royaltyAddress: new TonWeb.utils.Address(collectionAddress),
      royaltyAmount: TonWeb.utils.toNano('0.1'),
    })

    const body = new TonWeb.boc.Cell()
    body.bits.writeUint(1, 32) // OP deploy new auction
    body.bits.writeCoins(amount)
    body.refs.push((await sale.createStateInit()).stateInit)
    body.refs.push(new TonWeb.boc.Cell())

    await wallet.wallet.methods
      .transfer({
        secretKey: wallet.key.secretKey,
        toAddress: new TonWeb.utils.Address(marketAddress),
        amount: amount,
        seqno: parseInt(seqno),
        payload: body,
        sendMode: 3,
      })
      .send()

    updateBalance()
    close()
  }

  return (
    <>
      {!open && (
        <BlueButton className="mt-2" onClick={() => setOpen(true)}>
          Send
        </BlueButton>
      )}

      <Popup open={open} modal>
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
