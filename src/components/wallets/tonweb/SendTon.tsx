import { Block } from '@/components/ui/Block'
import { useEffect, useState } from 'react'
import { Address, Cell, SendMode, internal, loadStateInit } from '@ton/core'
import { ITonWallet, TonWalletTransferArg } from '@/types'
import { decryptWalletData, getPasswordInteractive, usePassword } from '@/store/passwordManager'
import { textToWalletBody } from '@/utils/textToWalletBody'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AddressRow } from '@/components/AddressRow'

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
    <Block className="flex flex-col">
      <div className="font-medium text-lg">Send TON:</div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="toInput">Recepient:</label>
        <Input
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
        <Input
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
          <label htmlFor="base64Check" className="text-sm text-foreground/75 my-1 cursor-pointer">
            Base64 cell?
          </label>
          <Checkbox
            id="base64Check"
            // type="checkbox"
            checked={message64}
            onCheckedChange={(e: any) => {
              console.log('change', e)
              setMessage64((c) => !c)
            }}
            className="ml-2"
            // autoComplete="off"
          />
        </div>
        <Input
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
        <Input
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

  const [status, setStatus] = useState(0) // 0 before send, 1 sending, 2 success, 3 error
  const [seconds, setSeconds] = useState(0)
  const [message, setMessage] = useState('')
  const [storedIntervalId, setIntervalId] = useState(0)
  const passwordState = usePassword()

  // const clearPopup = () => {
  //   setStatus(0)
  //   setSeconds(0)
  //   setMessage('')
  // }
  useEffect(() => {
    if (open) {
      setStatus(0)
      setSeconds(0)
      setMessage('')
      setIntervalId(0)
    } else {
      if (storedIntervalId) {
        clearInterval(storedIntervalId)
      }
    }
  }, [open])

  const close = () => {
    setOpen(false)
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

  const clickOpenModal = async (e) => {
    if (e) {
      e.preventDefault()
    }

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
    const keyPair = secretKeyToED25519(decrypted.seed || Buffer.from([]))
    if (keyPair.secretKey.length === 32) {
      keyPair.secretKey = Buffer.concat([
        Uint8Array.from(keyPair.secretKey),
        Uint8Array.from(keyPair.publicKey),
      ])
    }

    const params: TonWalletTransferArg = {
      seqno: parseInt(seqno),
      secretKey: keyPair.secretKey,
      sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
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

      const retries = 10
      let ok = 0
      let fail = 0
      for (let i = 0; i < retries; i++) {
        wallet.wallet
          .send(query)
          .then(() => ok++)
          .catch(() => fail++)
      }
      setStatus(1)
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

    setIntervalId(intervalId)
    setStatus(1)
    setSeconds(secondsLeft)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full mt-2" onClick={clickOpenModal}>
            Send
          </Button>
        </DialogTrigger>
        <DialogContent>
          {status === 0 && (
            <>
              <DialogHeader>
                <DialogTitle>You will send {amount} TON to:</DialogTitle>
                <DialogDescription>
                  <AddressRow address={recepient} />
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant={'default'} onClick={() => sendMoney()}>
                  Confirm
                </Button>
                <Button variant={'outline'} onClick={() => close()} className="">
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}

          {status === 1 && <div>Message sent, waiting for update on chain... {seconds}</div>}
          {status === 2 && (
            <div>
              <div>Success</div>
              <Button className="mt-8" onClick={() => close()}>
                Close
              </Button>
            </div>
          )}
          {status === 3 && (
            <div className="overflow-hidden">
              <div>Error: {message}</div>
              <Button className="mt-8" onClick={() => close()}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
