import { ITonHighloadWalletV2 } from '../../../types'
import { AddressRow } from '../../AddressRow'
import { useEffect, useState } from 'react'
import SendTon from '../tonweb/SendTon'
import { useLiteclient } from '@/store/liteClient'
import { useSelectedTonWallet } from '@/utils/wallets'
import { Block } from '@/components/ui/Block'
import { Button } from '@/components/ui/button'

function Wallet() {
  const wallet = useSelectedTonWallet() as ITonHighloadWalletV2

  const [balance, setBalance] = useState('')
  const liteClient = useLiteclient()

  const updateBalance = async () => {
    const state = await liteClient.getAccountState(
      wallet.address,
      (await liteClient.getMasterchainInfo()).last
    )
    setBalance(state.balance.coins.toString())
  }

  useEffect(() => {
    updateBalance()
  }, [wallet, liteClient])

  return (
    <div className="flex flex-col gap-2">
      <Block className="flex flex-col gap-2">
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

        <div className="flex items-center justify-between">
          <div>Balance: {balance && parseFloat(balance) / 10 ** 9}</div>
          <Button onClick={updateBalance} variant={'outline'} className="ml-2 px-2 py-0 w-auto">
            Refresh Balance
          </Button>
        </div>
      </Block>

      <SendTon wallet={wallet} />

      {/* <SendNft wallet={wallet} updateBalance={updateBalance} /> */}
    </div>
  )
}

export default Wallet
