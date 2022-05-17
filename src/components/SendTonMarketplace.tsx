import { useEffect, useState } from 'react'
import Popup from 'reactjs-popup'
import TonWeb from 'tonweb'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
import { WalletMarketplace } from '../contracts/WalletMarketpalce'
import { IWallet } from '../types'
import { BlueButton } from './UI'

export default function SendTonMarketplace({
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
  const [amount, setAmount] = useState('0')
  const [recepient, setRecepient] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setAmount('0')
    setRecepient('')
    setMessage('')
  }, [wallet, provider])

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

      <div className="mt-2 flex flex-col">
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
      </div>

      <SendModal
        amount={amount}
        recepient={recepient}
        wallet={wallet}
        seqno={seqno}
        message={message}
        updateBalance={updateBalance}
      />
    </div>
  )
}

const SendModal = ({
  amount,
  recepient,
  wallet,
  seqno,
  message: sendMessage,
  updateBalance,
}: {
  amount: string
  recepient: string
  wallet: IWallet
  seqno: string
  message: string
  updateBalance: () => void
}) => {
  const [status, setStatus] = useState(0) // 0 before send, 1 sending, 2 success, 3 error
  const [seconds, setSeconds] = useState(0)
  const [message, setMessage] = useState('')

  const clearPopup = () => {
    setStatus(0)
    setSeconds(0)
    setMessage('')
  }

  const checkSeqno = async (oldSeqno: number, seqs: number, interval: number) => {
    const newSeq = await wallet.wallet.methods.seqno().call()
    const seqnoUpdated = newSeq && newSeq === oldSeqno + 1

    if (seqnoUpdated) {
      setStatus(2)
      if (interval) {
        clearInterval(interval)
      }
      updateBalance()
      return
    }

    if (seqs === 0) {
      setStatus(3)
      if (interval) {
        clearInterval(interval)
      }
      setMessage('Send Timeout, seqno not increased')
    }
  }

  const sendMoney = async () => {
    const params = {
      amount: TonWeb.utils.toNano(amount),
      seqno: parseInt(seqno),
      secretKey: wallet.key.secretKey,
      toAddress: recepient,
      sendMode: 3,
      payload: sendMessage || undefined,
    }

    try {
      const marketplace = new WalletMarketplace(wallet.wallet.provider, {
        publicKey: wallet.key.publicKey,
      })

      // const r2w = new TonWeb.Wallets.all.v3R2(wallet.wallet.provider, {
      //   address: await (await marketplace.getAddress()).toString(true, true, false),
      // })

      const result = await marketplace.methods.transfer(params).send()

      // const result = await wallet.wallet.methods.transfer(params).send()
      // const result = await r2w.methods.transfer(params).send()

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

    let secondsLeft = 30
    const oldSeqno = parseInt(seqno)
    const intervalId = setInterval(() => {
      setSeconds(--secondsLeft)

      if (secondsLeft % 5 === 0) {
        checkSeqno(oldSeqno, secondsLeft, intervalId)
      }

      if (secondsLeft === 0 && intervalId) {
        clearInterval(intervalId)
      }
    }, 1000)

    setStatus(1)
    setSeconds(secondsLeft)
  }

  return (
    <Popup
      onOpen={clearPopup}
      onClose={clearPopup}
      closeOnDocumentClick
      trigger={<BlueButton className="mt-2">Send</BlueButton>}
      modal
      close={close}
    >
      {(close: () => void) => (
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
      )}
    </Popup>
  )
}
