import { Block } from '@/components/ui/Block'
import { useEffect, useState } from 'react'
import { Address } from '@ton/core'
import { ITonHighloadWalletV2, ITonWallet } from '@/types'
import { textToWalletBody } from '@/utils/textToWalletBody'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { addConnectMessage } from '@/store/connectMessages'
import { useSelectedKey } from '@/store/walletState'
import { useNavigate } from 'react-router-dom'

export default function SendTon({ wallet }: { wallet: ITonWallet | ITonHighloadWalletV2 }) {
  const selectedKey = useSelectedKey()
  const navigate = useNavigate()

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

  const addMessageToEmulation = async () => {
    Address.parseFriendly(recepient)

    const keyId = selectedKey?.id.get()
    if (typeof keyId === 'undefined') {
      return
    }

    await addConnectMessage({
      connect_event_id: 0,
      connect_session_id: 0,
      key_id: keyId,
      wallet_id: wallet.id,
      status: 0,
      payload: {
        messages: [
          {
            address: recepient,
            amount: BigInt(Math.floor(parseFloat(amount) * 10 ** 9)).toString(),
            payload: textToWalletBody(message, message64)?.toBoc()?.toString('base64'),
          },
        ],
        valid_until: Date.now(),
      },
      wallet_address: wallet.address.toRawString(),
    })
    navigate('/app')
  }

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
            checked={message64}
            onCheckedChange={(e: any) => {
              console.log('change', e)
              setMessage64((c) => !c)
            }}
            className="ml-2"
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

      <Button className="w-full mt-2" onClick={addMessageToEmulation}>
        Emulate
      </Button>
    </Block>
  )
}
