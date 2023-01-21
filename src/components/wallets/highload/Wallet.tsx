import { ITonHighloadWalletV2 } from '../../../types'
import { AddressRow } from '../../AddressRow'
import { useEffect, useState } from 'react'
import SendTon from './SendTon'
// import SendNft from './SendNft'
import { BlueButton } from '../../ui/BlueButton'
import { useLiteclient } from '@/store/liteClient'
import { TonConnect } from '@/components/TonConnect/TonConnect'
import { useSelectedTonWallet } from '@/utils/wallets'
import { Block } from '@/components/ui/Block'

function Wallet() {
  const wallet = useSelectedTonWallet() as ITonHighloadWalletV2

  const [balance, setBalance] = useState('')
  const liteClient = useLiteclient()

  const updateBalance = async () => {
    const state = await liteClient.getAccountState(
      wallet.address,
      (
        await liteClient.getMasterchainInfo()
      ).last
    )
    setBalance(state.balance.coins.toString())
  }

  useEffect(() => {
    updateBalance()
  }, [wallet, liteClient])

  return (
    <div className="flex flex-col gap-2">
      <Block>
        <div className="flex flex-col">
          <div className="font-medium text-lg">Wallet:</div>
          <div>Type: {wallet.type}</div>
          <div>
            <AddressRow
              text="Address:"
              address={wallet.address.toString({ bounceable: true, urlSafe: true })}
            />
          </div>
        </div>

        <div className="flex items-center">
          <div>Balance: {balance && parseFloat(balance) / 10 ** 9}</div>
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
      </Block>

      <TonConnect />

      <SendTon wallet={wallet} />

      {/* <SendNft wallet={wallet} updateBalance={updateBalance} /> */}
    </div>
  )
}

export default Wallet
