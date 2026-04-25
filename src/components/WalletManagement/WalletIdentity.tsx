import { cn } from '@/utils/cn'
import { WalletJazzicon } from '../WalletJazzicon'
import {
  getKeyModeLabel,
  getWalletDisplayName,
  getWalletTypeLabel,
  WalletManagementItem,
} from './walletDisplay'

export function WalletIdentity({
  item,
  dense = false,
  showKey = true,
  className,
}: {
  item: WalletManagementItem
  dense?: boolean
  showKey?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <WalletJazzicon wallet={item.wallet} diameter={dense ? 28 : 40} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className={cn('truncate font-medium', dense ? 'text-sm' : 'text-base')}>
            {getWalletDisplayName(item.wallet)}
          </div>
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {showKey && <span className="truncate">{item.keyName}</span>}
          {showKey && <span aria-hidden="true">•</span>}
          <span className="capitalize">{getWalletTypeLabel(item.wallet)}</span>
          <span aria-hidden="true">•</span>
          <span>{getKeyModeLabel(item.hasSecret)}</span>
        </div>
      </div>
    </div>
  )
}
