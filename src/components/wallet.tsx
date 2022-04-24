import TonWeb from 'tonweb'

import { useAsync } from 'react-async-hook'
import { IWallet } from '../types'
import { getProvider } from '../utils'
import { AddressRow } from './AddressRow'
import { useEffect, useMemo, useState } from 'preact/hooks'
import SendTon from './SendTon'
import SendNft from './SendNft'

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

  const [seqno, setSeqno] = useState('0')

  useEffect(() => {
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

      <SendTon seqno={seqno} wallet={wallet} testnet={testnet} />

      <SendNft seqno={seqno} wallet={wallet} testnet={testnet} provider={provider} />
    </div>
  )
}

export default Wallet
