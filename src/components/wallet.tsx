import TonWeb from 'tonweb'

import { useAsync } from 'react-async-hook'
import { IWallet } from '../types'
import { getProvider } from '../utils'
import { AddressRow } from './AddressRow'
import Popup from 'reactjs-popup'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'

const { NftItem } = TonWeb.token.nft

function Wallet({
  wallet,
  testnet,
  apiKey,
}: {
  wallet?: IWallet
  testnet: boolean
  apiKey: string
}) {
  const provider = useMemo(() => getProvider(apiKey, testnet), [apiKey, testnet])

  const [amount, setAmount] = useState('0')
  const [recepient, setRecepient] = useState('')
  const [seqno, setSeqno] = useState('0')
  const [nft, setNft] = useState('')
  const [nftRecepient, setNftRecepient] = useState('')
  const [nftMessage, setNftMessage] = useState('')

  useEffect(() => {
    setAmount('0')
    setRecepient('')
    setSeqno('0')
  }, [wallet, testnet])

  const walletBalance = useAsync(async () => {
    if (!wallet) {
      return 0
    }

    // const w = new TonWeb.Wallets.all[wallet.type](provider, { publicKey: key.result?.publicKey })
    const balance = await provider.getBalance(wallet.address.toString(true, true, true))
    return balance
  }, [wallet, testnet])

  if (!wallet) {
    return <div>Click 'Use this wallet' on wallet you want to use</div>
  }

  const getSeqno = async () => {
    const newSeq = await wallet.wallet.methods.seqno().call()
    setSeqno(newSeq ? newSeq.toString() : '0')
  }

  return (
    <div>
      <div className="font-medium text-lg text-accent my-2">Wallet:</div>
      <div>Type: {wallet.type}</div>
      <div>
        <AddressRow text="Address:" address={wallet.address.toString(true, true, true)} />
      </div>
      <div>Balance: {walletBalance.result && TonWeb.utils.fromNano(walletBalance.result)}</div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="amountInput">Seqno:</label>
        <div>
          <input
            className="border rounded p-2"
            id="amountInput"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={seqno}
            onChange={(e: any) => setSeqno(e.target.value)}
          />
          <button onClick={getSeqno} className="ml-2">
            Get Seqno
          </button>
        </div>
      </div>

      {/* Send ton */}
      <div className="flex flex-col">
        <div className="font-medium text-lg text-accent my-2">Send TON:</div>

        <div className="mt-2 flex flex-col">
          <label htmlFor="toInput">Recepient:</label>
          <input
            className="border rounded p-2"
            id="toInput"
            type="text"
            value={recepient}
            onChange={(e: any) => setRecepient(e.target.value)}
          />
        </div>

        <div className="mt-2 flex flex-col">
          <label htmlFor="amountInput">Amount:</label>
          <input
            className="border rounded p-2"
            id="amountInput"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(e: any) => setAmount(e.target.value)}
          />
        </div>

        <SendModal amount={amount} recepient={recepient} wallet={wallet} seqno={seqno} />
      </div>

      {/* Send nft */}
      <div className="flex flex-col mt-4">
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
          seqno={seqno}
          provider={provider}
          nftMessage={nftMessage}
        />
      </div>
    </div>
  )
}

const SendModal = ({
  amount,
  recepient,
  wallet,
  seqno,
}: {
  amount: string
  recepient: string
  wallet: IWallet
  seqno: string
}) => {
  const sendMoney = async (close: () => void) => {
    const params = {
      amount: TonWeb.utils.toNano(amount),
      seqno: parseInt(seqno),
      secretKey: wallet.key.secretKey,
      toAddress: recepient,
      sendMode: 3,
    }

    const result = await wallet.wallet.methods.transfer(params).send()

    console.log('result', result)
    close()
  }

  return (
    <Popup
      trigger={
        <button className="bg-highlight rounded px-2 py-2 w-48 text-white mt-2">Send</button>
      }
      modal
      close={close}
    >
      {(close: () => void) => (
        <div className="flex flex-col p-4">
          <div>
            You will send {amount} TON to {recepient}.
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
      )}
    </Popup>
  )
}

const SendNftModal = ({
  nft,
  recepient,
  wallet,
  seqno,
  provider,
  nftMessage,
}: {
  nft: string
  recepient: string
  wallet: IWallet
  seqno: string
  provider: HttpProvider
  nftMessage: string
}) => {
  const sendMoney = async (close: () => void) => {
    const nftAddress = new TonWeb.utils.Address(nft)
    const amount = TonWeb.utils.toNano(0.05)
    const nftItem = new NftItem(provider, { address: nftAddress })

    const result = await wallet.wallet.methods
      .transfer({
        secretKey: wallet.key.secretKey,
        toAddress: nftAddress,
        amount: amount,
        seqno: parseInt(seqno),
        payload: await nftItem.createTransferBody({
          newOwnerAddress: new TonWeb.utils.Address(recepient),
          forwardAmount: TonWeb.utils.toNano(0.02),
          forwardPayload: new TextEncoder().encode(nftMessage),
          responseAddress: wallet.address,
        }),
        sendMode: 3,
      })
      .send()

    console.log('result', result)
    close()
  }

  return (
    <Popup
      trigger={
        <button className="bg-highlight rounded px-2 py-2 w-48 text-white mt-2">Send</button>
      }
      modal
      close={close}
    >
      {(close: () => void) => (
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
      )}
    </Popup>
  )
}

export default Wallet
