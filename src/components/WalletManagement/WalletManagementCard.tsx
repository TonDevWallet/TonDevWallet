import { WalletAddressPopover } from './WalletAddressPopover'
import { WalletBalance } from './WalletBalance'
import { WalletIdentity } from './WalletIdentity'
import { WalletQuickActions } from './WalletQuickActions'
import { getWalletMetadata, WalletManagementItem } from './walletDisplay'

function MetadataLine({ item }: { item: WalletManagementItem }) {
  const metadata = getWalletMetadata(item.wallet)

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {metadata.map((meta) => (
        <span key={`${item.wallet.id}-${meta.label}`} className="inline-flex items-baseline gap-1">
          <span>{meta.label}</span>
          <span className="font-mono tabular-nums text-foreground/75">{meta.value}</span>
        </span>
      ))}
      {!item.hasSecret && <span className="text-amber-600 dark:text-amber-300">Watch-only</span>}
    </div>
  )
}

export function WalletManagementCard({ item }: { item: WalletManagementItem }) {
  return (
    <div className="group px-4 py-3 transition-colors hover:bg-muted/30 sm:px-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <WalletIdentity item={item} dense showKey={false} className="min-w-0" />
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <WalletBalance wallet={item.wallet} className="w-fit shrink-0 rounded-full border-0" />
          <WalletQuickActions item={item} compact />
        </div>
      </div>

      <div className="mt-2 flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <WalletAddressPopover
          wallet={item.wallet}
          className="max-w-full rounded-full sm:max-w-[420px]"
        />
        <MetadataLine item={item} />
      </div>
    </div>
  )
}
