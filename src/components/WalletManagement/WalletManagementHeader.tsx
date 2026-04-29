import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faPlus, faShieldHalved, faWallet } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'

export function WalletManagementHeader({
  keyCount,
  walletCount,
  signerCount,
  watchOnlyCount,
}: {
  keyCount: number
  walletCount: number
  signerCount: number
  watchOnlyCount: number
}) {
  return (
    <div className="flex flex-col gap-4 px-1 py-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight">Wallets</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
            <FontAwesomeIcon icon={faKey} /> {keyCount} keys
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
            <FontAwesomeIcon icon={faWallet} /> {walletCount} wallets
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
            <FontAwesomeIcon icon={faShieldHalved} /> {signerCount} signers
          </span>
          {watchOnlyCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
              {watchOnlyCount} watch-only
            </span>
          )}
        </div>
      </div>

      <Button asChild className="w-full shrink-0 rounded-full lg:w-auto">
        <Link to="/app/new_wallet">
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          New wallet
        </Link>
      </Button>
    </div>
  )
}
