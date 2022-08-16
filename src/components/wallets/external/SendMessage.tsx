import { useEffect, useState } from 'react'
import Popup from 'reactjs-popup'
import TonWeb from 'tonweb'
// import TonWeb from 'tonweb'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
import { BlueButton } from '../../UI'

export default function SendMessage({ provider }: { provider: HttpProvider }) {
  const [amount, setAmount] = useState('0')
  const [recepient, setRecepient] = useState('')

  const [stateInit, setStateInit] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    setAmount('0')
    setRecepient('')
    setBody('')
  }, [provider])

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

      <div className="mt-2 flex flex-col">
        <label htmlFor="amountInput">StateInit:</label>
        <p className="text-gray-600 text-sm my-1">Base64 encoded state init cell</p>
        <input
          className="border rounded p-2"
          id="amountInput"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={stateInit}
          onChange={(e: any) => setStateInit(e.target.value)}
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="amountInput">Body:</label>
        <p className="text-gray-600 text-sm my-1">Base64 encoded body cell</p>
        <input
          className="border rounded p-2"
          id="amountInput"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={body}
          onChange={(e: any) => setBody(e.target.value)}
        />
      </div>

      <SendModal
        amount={amount}
        recepient={recepient}
        // seqno={seqno}
        provider={provider}
        stateInit={stateInit}
        body={body}
        // updateBalance={updateBalance}
      />
    </div>
  )
}

const SendModal = ({
  amount,
  recepient,
  body: bodyString,
  provider,
  stateInit: stateInitString,
}: // updateBalance,
{
  amount: string
  recepient: string
  stateInit: string
  body: string
  provider: HttpProvider
  // updateBalance: () => void
}) => {
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
    try {
      const header = TonWeb.Contract.createExternalMessageHeader(recepient)

      const stateInit = TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(stateInitString))
      const body = TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(bodyString))

      const commonMsgInfo = TonWeb.Contract.createCommonMsgInfo(header, stateInit, body)

      const msg = Buffer.from(await commonMsgInfo.toBoc(false))
      const result = await provider.sendBoc(msg.toString('base64'))

      if (result['@type'] === 'error') {
        setStatus(3)
        setMessage(`Error occured. Code: ${result.code}. Message: ${result.message}`)
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
      <BlueButton className="mt-2" onClick={() => setOpen(true)}>
        Send
      </BlueButton>

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
