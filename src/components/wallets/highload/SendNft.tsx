import TonWeb from 'tonweb'
import { useEffect, useState } from 'react'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
import { ITonHighloadWalletV2 } from '../../../types'
import Popup from 'reactjs-popup'
import { BlueButton } from '../../UI'
import { WalletTransfer } from 'ton3-contracts/dist/types/wallet-transfer'
import { Coins, BOC, Address } from 'ton3-core'

const { NftItem } = TonWeb.token.nft

export default function SendNft({
  // seqno,
  wallet,
  provider,
  updateBalance,
}: {
  // seqno: string
  wallet: ITonHighloadWalletV2
  provider: HttpProvider
  updateBalance: () => void
}) {
  const [nft, setNft] = useState('')
  const [nftRecepient, setNftRecepient] = useState('')
  const [nftMessage, setNftMessage] = useState('')

  useEffect(() => {
    setNft('')
    setNftRecepient('')
    setNftMessage('')
  }, [wallet, provider])

  return (
    <div className="flex flex-col mt-4 p-4 border rounded shadow">
      <div className="font-medium text-lg text-accent my-2">Transfer NFT:</div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftAddressInput">NFT Address:</label>
        <input
          className="border rounded p-2"
          id="nftAddressInput"
          type="text"
          value={nft}
          onChange={(e: any) => setNft(e.target.value)}
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftToInput">Recepient:</label>
        <input
          className="border rounded p-2"
          id="nftToInput"
          type="text"
          value={nftRecepient}
          onChange={(e: any) => setNftRecepient(e.target.value)}
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftMessageInput">Message:</label>
        <input
          className="border rounded p-2"
          id="nftMessageInput"
          type="text"
          value={nftMessage}
          onChange={(e: any) => setNftMessage(e.target.value)}
        />
      </div>

      <SendNftModal
        nft={nft}
        recepient={nftRecepient}
        wallet={wallet}
        // seqno={seqno}
        provider={provider}
        nftMessage={nftMessage}
        updateBalance={updateBalance}
      />
    </div>
  )
}

const SendNftModal = ({
  nft,
  recepient,
  wallet,
  // seqno,
  provider,
  nftMessage,
  updateBalance,
}: {
  nft: string
  recepient: string
  wallet: ITonHighloadWalletV2
  // seqno: string
  provider: HttpProvider
  nftMessage: string
  updateBalance: () => void
}) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const sendMoney = async (close: () => void) => {
    const nftAddress = new TonWeb.utils.Address(nft)
    // const amount = TonWeb.utils.toNano(0.05)
    const nftItem = new NftItem(provider, { address: nftAddress })

    const transferPayload = await nftItem.createTransferBody({
      newOwnerAddress: new TonWeb.utils.Address(recepient),
      forwardAmount: TonWeb.utils.toNano(0.02),
      forwardPayload: undefined,
      // new TextEncoder().encode(nftMessage),
      responseAddress: new TonWeb.utils.Address(wallet.address.toString('raw')),
    })
    const boc = await transferPayload.toBoc()

    const cell = BOC.fromStandard(boc)

    const params: WalletTransfer = {
      destination: new Address(nftAddress.toString()),
      amount: new Coins('0.7'),
      mode: 3,
      body: cell,
    }

    const message = wallet.wallet.createTransferMessage([params], true)
    const signed = message.sign(wallet.key.secretKey)
    const payload = Buffer.from(BOC.toBytesStandard(signed))

    await provider.sendBoc(payload.toString('base64'))

    // const nftAddress = new TonWeb.utils.Address(nft)
    // const amount = TonWeb.utils.toNano(0.05)
    // const nftItem = new NftItem(provider, { address: nftAddress })

    // await wallet.wallet.methods
    //   .transfer({
    //     secretKey: wallet.key.secretKey,
    //     toAddress: nftAddress,
    //     amount: amount,
    //     seqno: parseInt(seqno),
    //     payload: await nftItem.createTransferBody({
    //       newOwnerAddress: new TonWeb.utils.Address(recepient),
    //       forwardAmount: TonWeb.utils.toNano(0.02),
    //       forwardPayload: new TextEncoder().encode(nftMessage),
    //       responseAddress: wallet.address,
    //     }),
    //     sendMode: 3,
    //   })
    //   .send()

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
          <div>
            You will send {nft} NFT to {recepient}.
          </div>
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
