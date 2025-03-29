import { useState, useEffect, useMemo } from 'react'
import { useLiteclient, useLiteclientState } from '@/store/liteClient'
import { IWallet } from '@/types'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatUnits } from '@/utils/units'
import { Address } from '@ton/core'
import { AddressRow } from '../AddressRow'
import TransferButton from '../wallets/tonweb/TransferButton'
import { useWalletListState } from '@/store/walletsListState'
import { Key } from '@/types/Key'
import DeleteButton from '../wallets/tonweb/DeleteButton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShareFromSquare } from '@fortawesome/free-solid-svg-icons'

export function WalletRow({ wallet, keyId }: { wallet: IWallet; keyId: number }) {
  const [balance, setBalance] = useState('0')
  const liteClient = useLiteclient()
  const walletsList = useWalletListState()
  const selectedKey = useMemo(() => {
    return walletsList.find((k) => k.id.get() === keyId)
  }, [keyId, walletsList])

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
      <TableCell className="w-48">
        {wallet.name || `Wallet ${wallet.type}`}
        <a
          href={getScanLink(wallet.address.toString({ bounceable: true, urlSafe: true }))}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2"
        >
          <FontAwesomeIcon icon={faShareFromSquare} />
        </a>
      </TableCell>
      <TableCell className="w-48">{wallet.type}</TableCell>
      <TableCell className="w-24 max-w-48">
        <AddressRow address={wallet.address} />
      </TableCell>
      <TableCell className="w-48">{formatUnits(balance, 9)} TON</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <TransferButton wallet={wallet} selectedKey={selectedKey?.get() as Key} />
          <DeleteButton wallet={wallet} />
        </div>
      </TableCell>
    </TableRow>
  )
}

function getScanLink(address: string): string {
  const scannerUrl =
    useLiteclientState().selectedNetwork.scanner_url.get() || 'https://tonviewer.com/'

  const addAddress = scannerUrl.indexOf('tonviewer.com') === -1

  return useMemo(() => `${scannerUrl}${addAddress ? 'address/' : ''}${address}`, [scannerUrl])
}
