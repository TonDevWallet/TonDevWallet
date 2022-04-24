import { useEffect, useState } from 'preact/hooks'
import Popup from 'reactjs-popup'
import TonWeb from 'tonweb'
import { IWallet } from '../types'

export default function SendTon({
  seqno,
  wallet,
  testnet,
}: {
  seqno: string
  wallet: IWallet
  testnet: boolean
}) {
  const [amount, setAmount] = useState('0')
  const [recepient, setRecepient] = useState('')

  useEffect(() => {
    setAmount('0')
    setRecepient('')
  }, [wallet, testnet])

  return (
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
