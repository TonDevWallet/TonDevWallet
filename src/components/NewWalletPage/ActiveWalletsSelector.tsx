import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTon } from '@/utils/units'
import { AddressRow } from '../AddressRow'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { Button } from '../ui/button'
import { ActiveWallet } from '@/hooks/useFindActiveWallets'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface ActiveWalletsSelectorProps {
  activeWallets: ActiveWallet[]
  totalWallets: number
  isSearching: boolean
  selectedWallets: string[]
  onSelectWallet: (walletId: string, selected: boolean) => void
  onRefresh: () => Promise<void>
}

export function ActiveWalletsSelector({
  activeWallets,
  totalWallets,
  isSearching,
  selectedWallets,
  onSelectWallet,
  onRefresh,
}: ActiveWalletsSelectorProps) {
  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Active Wallets</CardTitle>
        <CardDescription>Select wallets to import based on the provided public key</CardDescription>
      </CardHeader>
      <CardContent>
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-8">
            <FontAwesomeIcon icon={faSearch} spin className="text-2xl text-primary mb-4" />
            <p>Searching for active wallets on the blockchain...</p>
            <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
          </div>
        ) : activeWallets.length > 0 ? (
          <div>
            <div className="flex justify-between mb-3 px-1 text-sm text-muted-foreground">
              <div className="flex gap-2 items-center">
                <span className="font-semibold">Checked:</span>
                <span className="bg-secondary px-2 py-0.5 rounded-md">{totalWallets}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="font-semibold">Found:</span>
                <span className="bg-secondary px-2 py-0.5 rounded-md">{activeWallets.length}</span>
              </div>
            </div>
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%]"></TableHead>
                  <TableHead className="w-[25%]">Version</TableHead>
                  <TableHead className="w-[45%]">Wallet Address</TableHead>
                  <TableHead className="w-[25%]">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeWallets.map((wallet, i) => {
                  //   const walletId = wallet.wallet.id.toString()
                  const isSelected = selectedWallets.includes(i.toString())
                  return (
                    <TableRow key={i} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => onSelectWallet(i.toString(), !!checked)}
                        />
                      </TableCell>
                      <TableCell className="truncate">{wallet.wallet.type}</TableCell>
                      <TableCell className="font-mono text-xs truncate">
                        <div className="truncate">
                          <AddressRow address={wallet.wallet.address} />
                        </div>
                      </TableCell>
                      <TableCell className="truncate">{formatTon(wallet.balance)} TON</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p>No active wallets found for this public key.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try checking another key or creating a new wallet.
            </p>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" disabled={isSearching} onClick={onRefresh} size="sm">
            <FontAwesomeIcon icon={faSearch} className="mr-2" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
