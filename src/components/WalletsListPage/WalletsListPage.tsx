import { useMemo, useState } from 'react'
import {
  filterWalletItems,
  getWalletManagementStats,
  groupWalletItems,
  useWalletManagementItems,
  WalletEmptyState,
  WalletFilter,
  WalletGroupCard,
  WalletManagementHeader,
  WalletSearchAndFilters,
} from '@/components/WalletManagement'

export function WalletsListPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<WalletFilter>('all')
  const items = useWalletManagementItems()

  const stats = useMemo(() => getWalletManagementStats(items), [items])

  const filteredItems = useMemo(
    () => filterWalletItems(items, query, filter),
    [items, query, filter]
  )

  const groups = useMemo(() => groupWalletItems(filteredItems), [filteredItems])
  const hasActiveQuery = Boolean(query.trim()) || filter !== 'all'

  return (
    <div className="space-y-4 pb-8">
      <WalletManagementHeader {...stats} />
      <WalletSearchAndFilters
        query={query}
        filter={filter}
        resultCount={filteredItems.length}
        onQueryChange={setQuery}
        onFilterChange={setFilter}
      />

      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <WalletGroupCard key={group.keyId} group={group} />
          ))}
        </div>
      ) : (
        <WalletEmptyState hasQuery={hasActiveQuery} />
      )}
    </div>
  )
}
