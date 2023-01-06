import TonWeb from 'tonweb'

import { ITonWebWallet } from '../../../types'
import { AddressRow } from '../../AddressRow'
import { useEffect, useState } from 'react'
import SendTon from './SendTon'
import SendNft from './SendNft'
import { BlueButton } from '../../UI'
import CreateMarketplace from './CreateMarketplace'
import CreateNftSale from './CreateNftSale'
import GetSaleInfo from './GetSaleInfo'
import CancelNftSale from './CancelNftSale'
import SendTonMarketplace from './SendTonMarketplace'
import GetNftInfo from './GetNftInfo'
import { Address } from 'ton'
import { useWallet } from '@/store/walletState'
// import { useTonClient } from '@/store/tonClient'
import { useLiteclient } from '@/store/liteClient'

function Wallet() {
  const currentWallet = useWallet()
  const wallet = currentWallet.selectedWallet.get() as ITonWebWallet

  // const tonClient = useTonClient()
  // const liteClient = useLiteclient()
  const [balance, setBalance] = useState('')

  const [seqno, setSeqno] = useState('0')

  const getSeqno = async () => {
    const newSeq = await wallet.wallet.methods.seqno().call()
    setSeqno(newSeq ? newSeq.toString() : '0')
  }

  const liteClient = useLiteclient()
  const updateBalance = async () => {
    const state = await liteClient.getAccountState(
      Address.parse(wallet.address.toFriendly({ bounceable: true, urlSafe: true })),
      (
        await liteClient.getMasterchainInfo()
      ).last
    )
    setBalance(state.balance.coins.toString())
    console.log('updateBalance')
    // tonClient
    //   .get()
    //   .getBalance(Address.parse(wallet.address.toFriendly({ bounceable: true, urlSafe: true })))
    //   .then((balance) => setBalance(balance.toString()))
    // .catch(e)
  }

  useEffect(() => {
    updateBalance()
    getSeqno()
  }, [wallet, liteClient])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <div className="font-medium text-lg text-accent my-2">Wallet:</div>
        <div>Type: {wallet.type}</div>
        <div>
          <AddressRow
            text="Address:"
            address={wallet.address.toFriendly({ bounceable: true, urlSafe: true })}
          />
        </div>
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

      <SendTon seqno={seqno} wallet={wallet} updateBalance={updateBalance} />

      <SendNft seqno={seqno} wallet={wallet} updateBalance={updateBalance} />

      <CreateMarketplace
        seqno={seqno}
        wallet={wallet}
        // provider={provider}
        updateBalance={updateBalance}
      />

      <SendTonMarketplace
        seqno={seqno}
        wallet={wallet}
        // provider={provider}
        updateBalance={updateBalance}
      />

      <CreateNftSale
        seqno={seqno}
        wallet={wallet}
        // provider={provider}
        updateBalance={updateBalance}
      />

      <CancelNftSale seqno={seqno} wallet={wallet} updateBalance={updateBalance} />

      <GetNftInfo />
      <GetSaleInfo />
    </div>
  )
}

export default Wallet
