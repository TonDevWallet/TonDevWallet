import { useEffect, useMemo, useState } from 'react'
import { Address } from '@ton/core'
import { IWallet } from '@/types'
import { useLiteclient } from '@/store/liteClient'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { formatUnits } from '@/utils/units'

type BalanceState =
  | { status: 'loading'; value?: undefined }
  | { status: 'ready'; value: string }
  | { status: 'error'; value?: undefined }

export function WalletBalance({ wallet, className }: { wallet: IWallet; className?: string }) {
  const liteClient = useLiteclient()
  const [balance, setBalance] = useState<BalanceState>({ status: 'loading' })
  const address = useMemo(
    () => wallet.address.toString({ bounceable: true, urlSafe: true }),
    [wallet]
  )

  useEffect(() => {
    let cancelled = false

    async function updateBalance() {
      setBalance({ status: 'loading' })
      try {
        const masterchainInfo = await liteClient.getMasterchainInfo()
        const state = await liteClient.getAccountState(Address.parse(address), masterchainInfo.last)
        if (!cancelled) {
          setBalance({ status: 'ready', value: state.balance.coins.toString() })
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error)
        if (!cancelled) {
          setBalance({ status: 'error' })
        }
      }
    }

    updateBalance()

    return () => {
      cancelled = true
    }
  }, [address, liteClient])

  if (balance.status === 'loading') {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        Loading balance
      </Badge>
    )
  }

  if (balance.status === 'error') {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        Balance unavailable
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className={cn('font-mono', className)}>
      {formatUnits(balance.value, 9)} TON
    </Badge>
  )
}
