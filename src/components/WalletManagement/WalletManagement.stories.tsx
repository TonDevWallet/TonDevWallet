import type { Meta, StoryObj } from '@storybook/react'
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
} from '.'

function WalletManagementDemo() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<WalletFilter>('all')
  const items = useWalletManagementItems()
  const stats = useMemo(() => getWalletManagementStats(items), [items])
  const filteredItems = useMemo(
    () => filterWalletItems(items, query, filter),
    [items, query, filter]
  )
  const groups = useMemo(() => groupWalletItems(filteredItems), [filteredItems])

  return (
    <div className="space-y-4">
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
        <WalletEmptyState hasQuery={Boolean(query) || filter !== 'all'} />
      )}
    </div>
  )
}

const meta = {
  title: 'Wallet Management/Overview',
  component: WalletManagementDemo,
  decorators: [
    (Story) => (
      <div className="bg-window-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WalletManagementDemo>

export default meta
type Story = StoryObj<typeof meta>

export const GroupedWallets: Story = {}

export const EmptyState: Story = {
  render: () => <WalletEmptyState hasQuery={false} />,
}

export const HeaderOnly: Story = {
  render: () => (
    <WalletManagementHeader keyCount={2} walletCount={3} signerCount={2} watchOnlyCount={1} />
  ),
}
