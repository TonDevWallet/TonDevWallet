import { Block } from '@/components/ui/Block'
import { useEffect, useState } from 'react'
import Popup from 'reactjs-popup'
import { Address, Cell, internal, loadStateInit } from 'ton-core'
import { ITonWallet, TonWalletTransferArg } from '@/types'
import { BlueButton } from '@/components/ui/BlueButton'
import { decryptWalletData, getPasswordInteractive, usePassword } from '@/store/passwordManager'
import { keyPairFromSeed } from 'ton-crypto'
import { textToWalletBody } from '@/utils/textToWalletBody'

export default function SendTon({
  seqno,
  wallet,
  updateBalance,
}: {
  seqno: string
  wallet: ITonWallet
  updateBalance: () => void
}) {
  const [amount, setAmount] = useState('0')
  const [recepient, setRecepient] = useState('')
  const [message, setMessage] = useState('')
  const [stateInit, setStateInit] = useState('')
  const [message64, setMessage64] = useState(false)

  useEffect(() => {
    setAmount('0')
    setRecepient('')
    setMessage('')
    setStateInit('')
    setMessage64(false)
  }, [wallet])

  return (
    <Block className="flex flex-col p-4 border rounded shadow">
      <div className="font-medium text-lg">Send TON:</div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="toInput">Recepient:</label>
        <input
          className="border rounded p-2"
          id="toInput"
          type="text"
          value={recepient}
          onChange={(e: any) => setRecepient(e.target.value)}
          autoComplete="off"
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
          autoComplete="off"
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="amountInput">Message:</label>
        <div className="flex items-center">
          <label htmlFor="base64Check" className="text-sm text-foreground/75 my-1">
            Base64 cell?
          </label>
          <input
            id="base64Check"
            type="checkbox"
            checked={message64}
            onChange={(e: any) => {
              console.log('change', e)
              setMessage64((c) => !c)
            }}
            className="ml-2"
            autoComplete="off"
          />
        </div>
        <input
          className="border rounded p-2"
          id="amountInput"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={message}
          onChange={(e: any) => setMessage(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="amountInput">StateInit:</label>
        <p className="text-foreground/75 text-sm my-1">Base64 encoded state init cell</p>
        <input
          className="border rounded p-2"
          id="amountInput"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={stateInit}
          onChange={(e: any) => setStateInit(e.target.value)}
          autoComplete="off"
        />
      </div>

      <SendModal
        amount={amount}
        recepient={recepient}
        wallet={wallet}
        seqno={seqno}
        message={message}
        stateInit={stateInit}
        updateBalance={updateBalance}
        isBase64={message64}
      />
    </Block>
  )
}

const SendModal = ({
  amount,
  recepient,
  wallet,
  seqno,
  stateInit,
  message: sendMessage,
  isBase64,
  updateBalance,
}: {
  amount: string
  recepient: string
  wallet: ITonWallet
  seqno: string
  message: string
  stateInit: string
  isBase64: boolean
  updateBalance: () => void
}) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const [status, setStatus] = useState(0) // 0 before send, 1 sending, 2 success, 3 error
  const [seconds, setSeconds] = useState(0)
  const [message, setMessage] = useState('')
  const passwordState = usePassword()
  // const liteClient = useLiteclient()

  const clearPopup = () => {
    setStatus(0)
    setSeconds(0)
    setMessage('')
  }

  const checkSeqno = async (oldSeqno: number, seqs: number, interval: number) => {
    const newSeq = await wallet.wallet.getSeqno()
    const seqnoUpdated = newSeq && newSeq === oldSeqno + 1
    console.log('seqno check', newSeq, oldSeqno)

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

  const clickOpenModal = async () => {
    const password = await getPasswordInteractive()
    if (password) {
      setOpen(true)
    }
  }

  const sendMoney = async () => {
    const { address: rAddress, isBounceable: bounce } = Address.parseFriendly(recepient)
    const password = passwordState.password.get()

    if (!password) {
      throw new Error(`Invalid password`)
    }

    const decrypted = await decryptWalletData(password, wallet.key)
    const keyPair = keyPairFromSeed(decrypted.seed || Buffer.from([]))

    const params: TonWalletTransferArg = {
      seqno: parseInt(seqno),
      secretKey: keyPair.secretKey,
      sendMode: 3,
      messages: [
        internal({
          body: textToWalletBody(sendMessage, isBase64),
          bounce,
          value: BigInt(Math.floor(parseFloat(amount) * 10 ** 9)),
          to: rAddress,
        }),
      ],
    }

    if (stateInit) {
      const parsed = Cell.fromBoc(Buffer.from(stateInit, 'base64'))[0] // TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(stateInit))
      if (parsed) {
        const init = loadStateInit(parsed.asSlice())
        params.messages[0].init = init
      }
    }

    try {
      const query = await wallet.wallet.createTransfer(params)
      await wallet.wallet.send(query)
      // const transfer = external({
      //   to: wallet.address,
      //   body: query,
      // })
      // const pkg = beginCell().store(storeMessage(transfer)).endCell().toBoc()
      // // const liteClient = useLiteclient()
      // const result = await liteClient.sendMessage(pkg)

      // if (result.status !== 1) {
      //   setStatus(3)
      //   setMessage(`Error occured. Code: ${result}. Message: ${result}`)
      //   return
      // }
    } catch (e) {
      console.log(e)
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
    const intervalId = window.setInterval(() => {
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
    <>
      <BlueButton className="mt-2" onClick={() => clickOpenModal()}>
        Send
      </BlueButton>

      <Popup
        onOpen={clearPopup}
        onClose={() => {
          setOpen(false)
          clearPopup()
        }}
        open={open}
        closeOnDocumentClick
        modal
      >
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
