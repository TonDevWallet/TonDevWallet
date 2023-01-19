import { WalletTransfer } from '@/contracts/utils/HighloadWalletTypes'
import { SignCell } from '@/contracts/utils/SignExternalMessage'
import { useLiteclient } from '@/store/liteClient'
import { useEffect, useState } from 'react'
import Popup from 'reactjs-popup'
import { Address, beginCell, Builder, Cell, storeMessage } from 'ton'
import { ITonHighloadWalletV2 } from '../../../types'
import { BlueButton } from '../../ui/BlueButton'

export default function SendTon({ wallet }: { wallet: ITonHighloadWalletV2 }) {
  const [amount, setAmount] = useState('0')
  const [recepient, setRecepient] = useState('')
  const [message, setMessage] = useState('')
  const liteClient = useLiteclient()

  useEffect(() => {
    setAmount('0')
    setRecepient('')
    setMessage('')
  }, [wallet, liteClient])

  return (
    <div className="flex flex-col p-4 border rounded shadow">
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

      {/* <div className="mt-2 flex flex-col">
        <label htmlFor="amountInput">Message:</label>
        <input
          className="border rounded p-2"
          id="amountInput"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={message}
          onChange={(e: any) => setMessage(e.target.value)}
        />
      </div> */}

      <SendModal amount={amount} recepient={recepient} wallet={wallet} message={message} />
    </div>
  )
}

const SendModal = ({
  amount,
  recepient,
  wallet,
  message: sendMessage,
}: {
  amount: string
  recepient: string
  wallet: ITonHighloadWalletV2
  message: string
}) => {
  const liteClient = useLiteclient()

  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const [status, setStatus] = useState(0) // 0 before send, 1 sending, 2 success, 3 error
  const [seconds, setSeconds] = useState(0)
  const [message, setMessage] = useState('')

  const clearPopup = () => {
    setStatus(0)
    setSeconds(0)
    setMessage('')
  }

  const sendMoney = async () => {
    const params: WalletTransfer = {
      destination: Address.parse(recepient),
      amount: BigInt(parseFloat(amount) * 10 ** 9),
      mode: 3,
      body: sendMessage
        ? new Builder().storeUint(0, 32).storeBuffer(Buffer.from(sendMessage)).endCell()
        : new Cell(),
    }

    try {
      const message = wallet.wallet.CreateTransferMessage([params])
      const signedBody = SignCell(wallet.key.secretKey, message.body)
      message.body = signedBody

      const payload = beginCell().store(storeMessage(message)).endCell()
      const result = await liteClient.sendMessage(payload.toBoc())

      console.log('result:', result)
      if (result.status !== 0) {
        setStatus(3)
        setMessage(`Error occured. Code: ${result.status}. Message:`)
        return
      }
    } catch (e) {
      setStatus(3)
      if (e instanceof Error) {
        setMessage('Error occured: ' + e.message)
      } else {
        setMessage('Unknown Error occured')
      }
      return
    }

    setStatus(2)
  }

  return (
    <>
      {!open && (
        <BlueButton className="mt-2" onClick={() => setOpen(true)}>
          Send
        </BlueButton>
      )}
      <Popup onOpen={clearPopup} onClose={clearPopup} open={open} closeOnDocumentClick modal>
        <div className="p-4">
          {status === 0 && (
            <div className="flex flex-col">
              <div>
                You will send {amount} TON to {recepient}.
              </div>
              <div className="mt-4">Are you sure?</div>
              <div className="flex mt-2">
                <BlueButton onClick={() => sendMoney()}>Yes</BlueButton>
                <BlueButton onClick={() => close()} className="ml-2">
                  Cancel
                </BlueButton>
              </div>
            </div>
          )}
          {status === 1 && <div>Sending {seconds}</div>}
          {status === 2 && (
            <div>
              <div>Success</div>
              <BlueButton className="mt-8" onClick={() => close()}>
                Close
              </BlueButton>
            </div>
          )}
          {status === 3 && (
            <div>
              <div>Error: {message}</div>
              <BlueButton className="mt-8" onClick={() => close()}>
                Close
              </BlueButton>
            </div>
          )}
        </div>
      </Popup>
    </>
  )
}
