import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faTimes } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'
import { WalletFilter } from './walletDisplay'

const filters: Array<{ value: WalletFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'signer', label: 'Signers' },
  { value: 'watchOnly', label: 'Watch-only' },
]

export function WalletSearchAndFilters({
  query,
  filter,
  resultCount,
  onQueryChange,
  onFilterChange,
}: {
  query: string
  filter: WalletFilter
  resultCount: number
  onQueryChange: (query: string) => void
  onFilterChange: (filter: WalletFilter) => void
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card/60 p-3 backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search wallets, addresses, keys..."
            className="h-10 rounded-full border-0 bg-muted/60 pl-10 pr-10"
            aria-label="Search wallets"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={() => onQueryChange('')}
              aria-label="Clear wallet search"
            >
              <FontAwesomeIcon icon={faTimes} />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filters.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={filter === item.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange(item.value)}
              className={cn('rounded-full', filter === item.value && 'shadow-sm')}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Showing {resultCount} wallet{resultCount === 1 ? '' : 's'}
        {query ? ` for “${query}”` : ''}.
      </div>
    </div>
  )
}
