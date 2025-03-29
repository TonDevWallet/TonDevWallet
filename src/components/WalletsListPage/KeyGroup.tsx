import { IWallet } from '@/types'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '../ui/button'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { setWalletKey } from '@/store/walletState'
import { WalletRow } from './WalletRow'

export function KeyGroup({
  keyName,
  keyId,
  wallets,
}: {
  keyName: string
  keyId: number
  wallets: Array<{ wallet: IWallet; keyName: string; keyId: number }>
}) {
  // Handler to set the current wallet key before navigating
  const handleSelectWallet = async () => {
    await setWalletKey(keyId)
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-2 px-4 py-3 bg-muted rounded-lg">
        <h2 className="text-lg font-medium">{keyName}</h2>
        <Link to={`/app/wallets/${keyId}`} onClick={handleSelectWallet}>
          <Button variant="outline" size="sm">
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Create New Wallet
          </Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Wallet Name</TableHead>
            <TableHead>Wallet Version</TableHead>
            <TableHead>Wallet Address</TableHead>
            <TableHead>Wallet Balance</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wallets.map((item) => (
            <WalletRow key={`${keyName}-${item.wallet.id}`} wallet={item.wallet} keyId={keyId} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
