import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faPlus } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { FindActiveWalletsModal } from '@/components/WalletsListPage/FindActiveWalletsModal'
import { setWalletKey } from '@/store/walletState'
import { WalletKeyInfoDialog } from './WalletKeyInfoDialog'
import { WalletManagementCard } from './WalletManagementCard'
import { WalletGroup } from './walletDisplay'

export function WalletGroupCard({ group }: { group: WalletGroup }) {
  const handleSelectKey = async () => {
    await setWalletKey(group.keyId)
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card/75 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <FontAwesomeIcon icon={faKey} className="text-muted-foreground" />
            <h2 className="truncate text-base font-semibold">{group.keyName}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {group.items.length} wallet{group.items.length === 1 ? '' : 's'}
            </span>
            {!group.hasSecret && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                Watch-only
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Key #{group.keyId} · {group.key.sign_type || 'ton'} signing mode
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <WalletKeyInfoDialog group={group} />
          <FindActiveWalletsModal
            keyName={group.keyName}
            keyId={group.keyId}
            existingWallets={group.items.map((item) => ({
              wallet: item.wallet,
              keyName: item.keyName,
              keyId: item.keyId,
            }))}
          />
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to={`/app/wallets/${group.keyId}`} onClick={handleSelectKey}>
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add wallet
            </Link>
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border/70 border-t border-border/70">
        {group.items.map((item) => (
          <WalletManagementCard key={`${group.keyId}-${item.wallet.id}`} item={item} />
        ))}
      </div>
    </section>
  )
}
