import type { Meta, StoryObj } from '@storybook/react'
import { Address } from '@ton/core'
import { ActiveWalletsSelector } from './ActiveWalletsSelector'

const meta = {
  title: 'New Wallet/Active Wallets Selector',
  component: ActiveWalletsSelector,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[840px] max-w-[calc(100vw-32px)]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onSelectWallet: { control: false },
    onRefresh: { control: false },
  },
} satisfies Meta<typeof ActiveWalletsSelector>

export default meta
type Story = StoryObj<typeof meta>

const wallet = {
  type: 'v5R1',
  address: Address.parse('UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ'),
} as any

const foundWalletsProps = {
  activeWallets: [
    { wallet, balance: 123_456_789n },
    { wallet: { ...wallet, type: 'v4R2' }, balance: 987_654_321n },
  ],
  totalWallets: 24,
  isSearching: false,
  selectedWallets: ['0'],
  onSelectWallet: () => undefined,
  onRefresh: async () => undefined,
}

export const FoundWallets: Story = {
  args: {
    activeWallets: [],
    totalWallets: 24,
    isSearching: false,
    selectedWallets: ['0'],
    onSelectWallet: () => undefined,
    onRefresh: async () => undefined,
  },
  render: () => <ActiveWalletsSelector {...foundWalletsProps} />,
}

export const Searching: Story = {
  args: {
    activeWallets: [],
    totalWallets: 0,
    isSearching: true,
    selectedWallets: [],
    onSelectWallet: () => undefined,
    onRefresh: async () => undefined,
  },
}

export const Empty: Story = {
  args: {
    activeWallets: [],
    totalWallets: 24,
    isSearching: false,
    selectedWallets: [],
    onSelectWallet: () => undefined,
    onRefresh: async () => undefined,
  },
}
