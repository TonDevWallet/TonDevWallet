import TonWeb from 'tonweb'

import { IWallet } from '../types'
import { getProvider } from '../utils'
import { AddressRow } from './AddressRow'
import { useEffect, useMemo, useState } from 'preact/hooks'
import SendTon from './SendTon'
import SendNft from './SendNft'
import { BlueButton } from './UI'
import CreateMarketplace from './CreateMarketplace'
import CreateNftSale from './CreateNftSale'
import GetSaleInfo from './GetSaleInfo'
import CancelNftSale from './CancelNftSale'

function Wallet({
  wallet,
  testnet,
  apiKey,
}: {
  wallet: IWallet
  testnet: boolean
  apiKey: string
}) {
  const provider = useMemo(() => getProvider(apiKey, testnet), [apiKey, testnet])
  const [balance, setBalance] = useState('')

  const [seqno, setSeqno] = useState('0')

  const getSeqno = async () => {
    const newSeq = await wallet.wallet.methods.seqno().call()
    setSeqno(newSeq ? newSeq.toString() : '0')
  }

  const updateBalance = () => {
    provider
      .getBalance(wallet.address.toString(true, true, true))
      .then((balance) => setBalance(balance))
  }

  useEffect(() => {
    updateBalance()
    getSeqno()
  }, [wallet, testnet])

  return (
    <div>
      <div className="font-medium text-lg text-accent my-2">Wallet:</div>
      <div>Type: {wallet.type}</div>
      <div>
        <AddressRow text="Address:" address={wallet.address.toString(true, true, true)} />
      </div>

      <div className="flex items-center">
        <div>Balance: {balance && TonWeb.utils.fromNano(balance)}</div>
        <BlueButton onClick={updateBalance} className="ml-2 px-2 py-0 w-auto">
          Refresh Balance
        </BlueButton>
      </div>

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
          <BlueButton onClick={getSeqno} className="ml-2">
            Get Seqno
          </BlueButton>
        </div>
      </div>

      <SendTon seqno={seqno} wallet={wallet} testnet={testnet} updateBalance={updateBalance} />

      <SendNft
        seqno={seqno}
        wallet={wallet}
        testnet={testnet}
        provider={provider}
        updateBalance={updateBalance}
      />

      <CreateMarketplace
        seqno={seqno}
        wallet={wallet}
        testnet={testnet}
        provider={provider}
        updateBalance={updateBalance}
      />

      <CreateNftSale
        seqno={seqno}
        wallet={wallet}
        testnet={testnet}
        provider={provider}
        updateBalance={updateBalance}
      />

      <CancelNftSale
        seqno={seqno}
        wallet={wallet}
        testnet={testnet}
        provider={provider}
        updateBalance={updateBalance}
      />

      <GetSaleInfo provider={provider} />
    </div>
  )
}

export default Wallet
