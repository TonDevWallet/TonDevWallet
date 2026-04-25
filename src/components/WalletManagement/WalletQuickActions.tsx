import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoins, faPaperPlane, faShareFromSquare } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { useLiteclientState } from '@/store/liteClient'
import TransferButton from '@/components/wallets/tonweb/TransferButton'
import DeleteButton from '@/components/wallets/tonweb/DeleteButton'
import { cn } from '@/utils/cn'
import { buildExplorerLink, getWalletAddress, WalletManagementItem } from './walletDisplay'
import { setSelectedWallet, setWalletKey } from '@/store/walletState'

export function WalletQuickActions({
  item,
  showDelete = true,
  compact = false,
  className,
}: {
  item: WalletManagementItem
  showDelete?: boolean
  compact?: boolean
  className?: string
}) {
  const scannerUrl =
    useLiteclientState().selectedNetwork.scanner_url.get() || 'https://tonviewer.com/'
  const address = getWalletAddress(item.wallet)
  const explorerLink = useMemo(() => buildExplorerLink(scannerUrl, address), [scannerUrl, address])
  const size = compact ? 'sm' : 'default'
  const compactChildButton =
    compact && '[&_button]:h-8 [&_button]:rounded-full [&_button]:px-3 [&_button]:text-xs'

  const rememberWalletContext = () => {
    setWalletKey(item.keyId).catch((error) =>
      console.error('Failed to remember key context:', error)
    )
    setSelectedWallet(item.wallet)
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {item.hasSecret ? (
        <div className={cn(compactChildButton)}>
          <TransferButton wallet={item.wallet} selectedKey={item.key} />
        </div>
      ) : (
        <Button
          variant="outline"
          size={size}
          disabled
          title="Watch-only wallets cannot sign transfers"
          className="rounded-full"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
          Transfer
        </Button>
      )}

      <Button asChild variant="ghost" size={size} className="rounded-full">
        <Link
          to={`/app/wallets/${item.keyId}/${item.wallet.id}/assets`}
          onClick={rememberWalletContext}
        >
          <FontAwesomeIcon icon={faCoins} className="mr-1" />
          Assets
        </Link>
      </Button>

      <Button asChild variant="ghost" size={size} className="rounded-full">
        <a href={explorerLink} target="_blank" rel="noopener noreferrer">
          <FontAwesomeIcon icon={faShareFromSquare} className="mr-1" />
          Explorer
        </a>
      </Button>

      {showDelete && (
        <div className={cn(compactChildButton)}>
          <DeleteButton wallet={item.wallet} />
        </div>
      )}
    </div>
  )
}
