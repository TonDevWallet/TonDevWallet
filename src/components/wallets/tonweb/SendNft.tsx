import TonWeb from 'tonweb'

import { useEffect, useState } from 'react'

import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
import { ITonWebWallet } from '../../../types'
import Popup from 'reactjs-popup'
import { BlueButton } from './../../UI'
import { useLiteclient } from '@/store/liteClient'

const { NftItem } = TonWeb.token.nft

export default function SendNft({
  seqno,
  wallet,
  updateBalance,
}: {
  seqno: string
  wallet: ITonWebWallet
  updateBalance: () => void
}) {
  const [nft, setNft] = useState('')
  const [nftRecepient, setNftRecepient] = useState('')
  const [nftMessage, setNftMessage] = useState('')
  const [sendAmount, setSendAmount] = useState(0.05)
  const [forwardAmount, setForwardAmount] = useState(0.02)

  const liteClient = useLiteclient()

  useEffect(() => {
    setNft('')
    setNftRecepient('')
    setNftMessage('')
    setSendAmount(0.05)
    setForwardAmount(0.02)
  }, [wallet, liteClient])

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

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftSendInput">SendAmount:</label>
        <input
          className="border rounded p-2"
          id="nftSendInput"
          type="number"
          value={sendAmount}
          onChange={(e: any) => setSendAmount(parseFloat(e.target.value) || e.target.value)}
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftForwardInput">Message:</label>
        <input
          className="border rounded p-2"
          id="nftForwardInput"
          type="text"
          value={forwardAmount}
          onChange={(e: any) => setForwardAmount(parseFloat(e.target.value) || e.target.value)}
        />
      </div>

      {/* <div>
        <div>QR:</div>
        <div>
          <QRCode value={qrText} />
        </div>
      </div> */}

      <SendNftModal
        nft={nft}
        recepient={nftRecepient}
        wallet={wallet}
        seqno={seqno}
        nftMessage={nftMessage}
        updateBalance={updateBalance}
        sendAmount={sendAmount}
        forwardAmount={forwardAmount}
      />
    </div>
  )
}

const SendNftModal = ({
  nft,
  recepient,
  wallet,
  seqno,
  nftMessage,
  sendAmount,
  forwardAmount,
  updateBalance,
}: {
  nft: string
  recepient: string
  wallet: ITonWebWallet
  seqno: string
  nftMessage: string
  sendAmount: number
  forwardAmount: number
  updateBalance: () => void
}) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const sendMoney = async (close: () => void) => {
    const nftAddress = new TonWeb.utils.Address(nft)
    const amount = TonWeb.utils.toNano(sendAmount)
    const nftItem = new NftItem(new TonWeb.HttpProvider(), { address: nftAddress })

    await wallet.wallet.methods
      .transfer({
        secretKey: wallet.key.secretKey,
        toAddress: nftAddress,
        amount: amount,
        seqno: parseInt(seqno),
        payload: await nftItem.createTransferBody({
          newOwnerAddress: new TonWeb.utils.Address(recepient),
          forwardAmount: TonWeb.utils.toNano(forwardAmount),
          forwardPayload: new TextEncoder().encode(nftMessage),
          responseAddress: wallet.address,
        }),
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
