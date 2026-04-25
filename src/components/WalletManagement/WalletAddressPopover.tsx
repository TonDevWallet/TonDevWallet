import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy } from '@fortawesome/free-solid-svg-icons'
import { IWallet } from '@/types'
import { AddressRow } from '@/components/AddressRow'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLiteclientState } from '@/store/liteClient'
import { cn } from '@/utils/cn'
import { getShortAddress, getWalletAddress } from './walletDisplay'

export function WalletAddressPopover({
  wallet,
  className,
}: {
  wallet: IWallet
  className?: string
}) {
  const isTestnet = useLiteclientState().selectedNetwork.is_testnet.get()
  const bounceable = getWalletAddress(wallet, { bounceable: true, testOnly: isTestnet })
  const nonBounceable = getWalletAddress(wallet, { bounceable: false, testOnly: isTestnet })
  const raw = wallet.address.toRawString()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 min-w-0 max-w-full justify-start gap-2 px-2 font-mono text-xs',
            className
          )}
          title="Show address formats"
        >
          <FontAwesomeIcon icon={faCopy} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{getShortAddress(bounceable, 10, 10)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,560px)] space-y-3 p-3">
        <div>
          <div className="text-sm font-medium">Address formats</div>
          <div className="text-xs text-muted-foreground">Click any row to copy.</div>
        </div>
        <div className="space-y-2">
          <AddressRow
            text={<span className="w-28 shrink-0 text-xs text-muted-foreground">Bounceable</span>}
            address={bounceable}
            containerClassName="rounded-md bg-muted/40 px-2 py-2 hover:bg-muted"
            addressClassName="font-mono"
          />
          <AddressRow
            text={
              <span className="w-28 shrink-0 text-xs text-muted-foreground">Non-bounceable</span>
            }
            address={nonBounceable}
            containerClassName="rounded-md bg-muted/40 px-2 py-2 hover:bg-muted"
            addressClassName="font-mono"
          />
          <AddressRow
            text={<span className="w-28 shrink-0 text-xs text-muted-foreground">Raw</span>}
            address={raw}
            containerClassName="rounded-md bg-muted/40 px-2 py-2 hover:bg-muted"
            addressClassName="font-mono"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
