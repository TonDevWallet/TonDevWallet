import { ITonWallet } from '@/types'
import { AddressRow } from '../../AddressRow'
import { useEffect, useState } from 'react'
import SendTon from './SendTon'
import { Address } from '@ton/core'
import { useLiteclient } from '@/store/liteClient'
import { useSelectedTonWallet } from '@/utils/wallets'
import { Block } from '@/components/ui/Block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function Wallet() {
  const wallet = useSelectedTonWallet() as ITonWallet
  const liteClient = useLiteclient()

  const [balance, setBalance] = useState('')

  const [seqno, setSeqno] = useState('0')

  const getSeqno = async () => {
    const newSeq = await wallet?.wallet.getSeqno()
    setSeqno(newSeq ? newSeq.toString() : '0')
  }

  const updateBalance = async () => {
    const state = await liteClient.getAccountState(
      Address.parse(wallet.address.toString({ bounceable: true, urlSafe: true })),
      (await liteClient.getMasterchainInfo()).last
    )
    setBalance(state.balance.coins.toString())
  }

  useEffect(() => {
    setSeqno('0')
    setBalance('0')
    updateBalance().then()
    getSeqno().then()
  }, [wallet, liteClient])

  return (
    <div className="flex flex-col gap-2">
      <Block className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <div className="font-medium text-lg">Wallet:</div>
          <div>Type: {wallet.type}</div>
          <div>
            <AddressRow
              text="Address:"
              address={wallet.address.toString({ bounceable: true, urlSafe: true })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>Balance: {balance && parseFloat(balance) / 10 ** 9}</div>
          <Button onClick={updateBalance} variant={'outline'} className="ml-2 px-2 py-0 w-auto">
            Refresh Balance
          </Button>
        </div>

        <div className="flex flex-col">
          <label htmlFor="amountInput">Seqno:</label>
          <div className="flex">
            <Input
              className="border rounded p-2"
              id="amountInput"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={seqno}
              onChange={(e: any) => setSeqno(e.target.value)}
            />
            <Button variant={'outline'} onClick={getSeqno} className="ml-2">
              Refresh Seqno
            </Button>
          </div>
        </div>
      </Block>

      <SendTon seqno={seqno} wallet={wallet} updateBalance={updateBalance} />

      {/* <SendNft seqno={seqno} wallet={wallet} updateBalance={updateBalance} /> */}
    </div>
  )
}

export default Wallet
