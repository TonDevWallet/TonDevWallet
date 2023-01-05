import TonWeb from 'tonweb'

import { ITonHighloadWalletV2 } from '../../../types'
// import { useProvider } from '../../../utils'
import { AddressRow } from '../../AddressRow'
import { useEffect, useState } from 'react'
import SendTon from './SendTon'
import SendNft from './SendNft'
import { BlueButton } from '../../UI'
import { useWallet } from '@/store/walletState'
// import { useTonClient } from '@/store/tonClient'
import { Address } from 'ton'
import { useLiteclient } from '@/store/liteClient'
// import CreateMarketplace from './CreateMarketplace'
// import CreateNftSale from './CreateNftSale'
// import GetSaleInfo from './GetSaleInfo'
// import CancelNftSale from './CancelNftSale'
// import SendTonMarketplace from './SendTonMarketplace'
// import GetNftInfo from './GetNftInfo'

function Wallet() {
  const currentWallet = useWallet()
  const wallet = currentWallet.selectedWallet.get() as ITonHighloadWalletV2

  // const provider = useProvider()
  // const tonClient = useTonClient()
  const [balance, setBalance] = useState('')
  const liteClient = useLiteclient()

  // const [seqno, setSeqno] = useState('0')

  // const getSeqno = async () => {
  //   const newSeq = await wallet.wallet.methods.seqno().call()
  //   setSeqno(newSeq ? newSeq.toString() : '0')
  // }

  const updateBalance = async () => {
    const state = await liteClient.getAccountState(
      Address.parse(wallet.address.toString('base64', { urlSafe: true, bounceable: true })),
      (
        await liteClient.getMasterchainInfo()
      ).last
    )
    setBalance(state.balance.coins.toString())

    // tonClient
    //   .get()
    //   .getBalance(
    //     Address.parse(wallet.address.toString('base64', { bounceable: true, urlSafe: true }))
    //   )
    //   .then((balance) => setBalance(balance.toString()))
    // .catch(e)
  }

  useEffect(() => {
    updateBalance()
    // getSeqno()
  }, [wallet, liteClient])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <div className="font-medium text-lg text-accent my-2">Wallet:</div>
        <div>Type: {wallet.type}</div>
        <div>
          <AddressRow
            text="Address:"
            address={wallet.address.toString('base64', { bounceable: true, urlSafe: true })}
          />
        </div>
      </div>

      <div className="flex items-center">
        <div>Balance: {balance && TonWeb.utils.fromNano(balance)}</div>
        <BlueButton onClick={updateBalance} className="ml-2 px-2 py-0 w-auto">
          Refresh Balance
        </BlueButton>
      </div>

      {/* <div className="mt-2 flex flex-col">
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
      </div> */}

      <SendTon
        wallet={wallet}
        // provider={provider}
        // updateBalance={updateBalance}
      />

      <SendNft wallet={wallet} updateBalance={updateBalance} />

      {/*

      <CreateMarketplace
        seqno={seqno}
        wallet={wallet}
        provider={provider}
        updateBalance={updateBalance}
      />

      <SendTonMarketplace
        seqno={seqno}
        wallet={wallet}
        provider={provider}
        updateBalance={updateBalance}
      />

      <CreateNftSale
        seqno={seqno}
        wallet={wallet}
        provider={provider}
        updateBalance={updateBalance}
      />

      <CancelNftSale
        seqno={seqno}
        wallet={wallet}
        provider={provider}
        updateBalance={updateBalance}
      />

      <GetNftInfo provider={provider} />
      <GetSaleInfo provider={provider} /> */}
    </div>
  )
}

export default Wallet
