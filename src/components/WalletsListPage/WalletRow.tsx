import { useState, useEffect } from 'react'
import { useLiteclient } from '@/store/liteClient'
import { IWallet } from '@/types'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatUnits } from '@/utils/units'
import { Address } from '@ton/core'
import { AddressRow } from '../AddressRow'
import TransferButton from '../wallets/tonweb/TransferButton'

export function WalletRow({ wallet }: { wallet: IWallet; keyId?: number }) {
  const [balance, setBalance] = useState('0')
  const liteClient = useLiteclient()

  const updateBalance = async () => {
    try {
      const state = await liteClient.getAccountState(
        Address.parse(wallet.address.toString({ bounceable: true, urlSafe: true })),
        (await liteClient.getMasterchainInfo()).last
      )
      setBalance(state.balance.coins.toString())
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  useEffect(() => {
    updateBalance()
  }, [wallet])

  return (
    <TableRow>
      <TableCell className="w-48">{wallet.name || `Wallet ${wallet.type}`}</TableCell>
      <TableCell className="w-48">{wallet.type}</TableCell>
      <TableCell className="w-48">
        <AddressRow address={wallet.address} />
      </TableCell>
      <TableCell className="w-48">{formatUnits(balance, 9)} TON</TableCell>
      <TableCell>
        <TransferButton wallet={wallet} />
      </TableCell>
    </TableRow>
  )
}
