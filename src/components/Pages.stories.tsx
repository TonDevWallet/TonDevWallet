import type { Meta, StoryObj } from '@storybook/react'
import { beginCell, Dictionary, type Message, type Transaction } from '@ton/core'
import { Buffer } from 'buffer'
import { useLayoutEffect, useState, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { IndexPage } from './IndexPage/IndexPage'
import { WalletPage } from './IndexPage/WalletPage'
import { AssetsPage } from './AssetsPage/AssetsPage'
import { NewWalletPage } from './NewWalletPage/NewWalletPage'
import { SettingsPage } from './SettingsPage/SettingsPage'
import { TracerPage } from './TracerPage/TracerPage'
import { TxInfoPage, type TxInfoPageTab } from './TxInfoPage/TxInfoPage'
import { type RawTransactionFormat } from './TxInfoPage/RawTransactionInfo'
import { WalletsListPage } from './WalletsListPage/WalletsListPage'
import { setTransactionState } from '@/store/txInfo'
import { addTracerItem, clearTracerState, setActiveItem } from '@/store/tracerState'
import type { ParsedTransaction } from '@/utils/ManagedBlockchain'

const mockVmLogs = [
  'stack: [ ]',
  'gas remaining: 1000000',
  'execute PUSHINT 1',
  'code cell hash: 2f1a4b8c',
  'stack: [ 1 ]',
  'gas remaining: 999640',
  'execute PUSHINT 2',
  'code cell hash: 2f1a4b8c',
  'stack: [ 1 2 ]',
  'gas remaining: 999220',
  'execute ADD',
  'code cell hash: 2f1a4b8c',
  'stack: [ 3 ]',
  'gas remaining: 998900',
  'execute ACCEPT',
].join('\n')

const mockBlockchainLogs = JSON.stringify(
  {
    transaction: 'storybook-demo',
    account: 'EQC_storybook_wallet',
    events: [
      { type: 'compute', success: true, gasUsed: 1100 },
      { type: 'action', messages: 1, resultCode: 0 },
    ],
  },
  null,
  2
)

function createMockTransaction(): Transaction {
  const raw = beginCell().endCell()

  return {
    address: 0n,
    lt: 1n,
    prevTransactionHash: 0n,
    prevTransactionLt: 0n,
    now: 1710000000,
    outMessagesCount: 0,
    oldStatus: 'active',
    endStatus: 'active',
    outMessages: Dictionary.empty<number, Message>(),
    totalFees: { coins: 123456789n },
    stateUpdate: {
      oldHash: Buffer.alloc(32),
      newHash: Buffer.alloc(32, 1),
    },
    description: {
      type: 'generic',
      creditFirst: false,
      computePhase: { type: 'skipped', reason: 'no-state' },
      aborted: false,
      destroyed: false,
    },
    raw,
    hash: () => raw.hash(),
  }
}

function createMockTransactionState() {
  return {
    tx: createMockTransaction(),
    vmLogs: mockVmLogs,
    debugLogs: 'Storybook VM debug log\nexecute PUSHINT\nexecute ADD',
    blockchainLogs: mockBlockchainLogs,
  }
}

function createTraceTransaction(overrides: Partial<ParsedTransaction> = {}): ParsedTransaction {
  return {
    ...createMockTransaction(),
    children: [],
    ...overrides,
  } as ParsedTransaction
}

function createMockTraceTransactions(offset = 0): ParsedTransaction[] {
  const root = createTraceTransaction({
    address: BigInt(0x1000 + offset),
    lt: BigInt(10_000 + offset),
    totalFees: { coins: 123_000_000n },
  })
  const child = createTraceTransaction({
    address: BigInt(0x2000 + offset),
    lt: BigInt(10_001 + offset),
    parent: root,
    totalFees: { coins: 64_000_000n },
  })
  const response = createTraceTransaction({
    address: BigInt(0x3000 + offset),
    lt: BigInt(10_002 + offset),
    parent: child,
    totalFees: { coins: 28_000_000n },
    hashMismatch: offset !== 0,
  })

  root.children = [child]
  child.children = [response]

  return [root, child, response]
}

function SeededTxInfoPage({
  defaultTab = 'stack',
  defaultRawFormat = 'yaml',
}: {
  defaultTab?: TxInfoPageTab
  defaultRawFormat?: RawTransactionFormat
}) {
  const [storyState] = useState(() => {
    const state = createMockTransactionState()
    setTransactionState(state)
    return state
  })

  useLayoutEffect(() => {
    setTransactionState(storyState)
  }, [storyState])

  return <TxInfoPage defaultTab={defaultTab} defaultRawFormat={defaultRawFormat} />
}

function SeededTracerPage() {
  const [firstId] = useState(() => {
    clearTracerState()
    const firstId = addTracerItem('Inbound transfer', {
      transactions: createMockTraceTransactions(),
    })
    addTracerItem('Contract deploy', {
      transactions: createMockTraceTransactions(100),
    })
    setActiveItem(firstId)
    return firstId
  })

  useLayoutEffect(() => {
    setActiveItem(firstId)
    return () => clearTracerState()
  }, [firstId])

  return <TracerPage />
}

function PageCanvas({ children }: { children: ReactNode }) {
  return <div className="h-screen min-h-screen bg-window-background p-6">{children}</div>
}

function RoutedPage({ path, element }: { path: string; element: ReactNode }) {
  return (
    <Routes>
      <Route path={path} element={<PageCanvas>{element}</PageCanvas>} />
    </Routes>
  )
}

function PageStories() {
  return <RoutedPage path="/app" element={<IndexPage />} />
}

const meta = {
  title: 'Pages/Views',
  component: PageStories,
  parameters: { route: '/app' },
} satisfies Meta<typeof PageStories>

export default meta
type Story = StoryObj<typeof meta>

export const Dashboard: Story = {
  render: () => <RoutedPage path="/app" element={<IndexPage defaultTab="messages" />} />,
  parameters: { route: '/app' },
}

export const DashboardHistory: Story = {
  render: () => <RoutedPage path="/app" element={<IndexPage defaultTab="history" />} />,
  parameters: { route: '/app' },
}

export const DashboardSessions: Story = {
  render: () => <RoutedPage path="/app" element={<IndexPage defaultTab="sessions" />} />,
  parameters: { route: '/app' },
}

export const WalletsList: Story = {
  render: () => <RoutedPage path="/app/wallets_list" element={<WalletsListPage />} />,
  parameters: { route: '/app/wallets_list' },
}

export const NewWallet: Story = {
  render: () => <RoutedPage path="/app/new_wallet" element={<NewWalletPage />} />,
  parameters: { route: '/app/new_wallet' },
}

export const WalletDetails: Story = {
  render: () => <RoutedPage path="/app/wallets/:walletId" element={<WalletPage />} />,
  parameters: { route: '/app/wallets/1' },
}

export const Assets: Story = {
  render: () => (
    <RoutedPage
      path="/app/wallets/:keyId/:walletId/assets"
      element={<AssetsPage defaultTab="jettons" />}
    />
  ),
  parameters: { route: '/app/wallets/1/101/assets' },
}

export const AssetsNfts: Story = {
  render: () => (
    <RoutedPage
      path="/app/wallets/:keyId/:walletId/assets"
      element={<AssetsPage defaultTab="nfts" />}
    />
  ),
  parameters: { route: '/app/wallets/1/101/assets' },
}

export const Settings: Story = {
  render: () => (
    <RoutedPage path="/app/settings" element={<SettingsPage defaultTab="security" />} />
  ),
  parameters: { route: '/app/settings' },
}

export const SettingsNetworks: Story = {
  render: () => (
    <RoutedPage path="/app/settings" element={<SettingsPage defaultTab="networks" />} />
  ),
  parameters: { route: '/app/settings' },
}

export const SettingsCurrencies: Story = {
  render: () => (
    <RoutedPage path="/app/settings" element={<SettingsPage defaultTab="currencies" />} />
  ),
  parameters: { route: '/app/settings' },
}

export const SettingsAddressBook: Story = {
  render: () => (
    <RoutedPage path="/app/settings" element={<SettingsPage defaultTab="address-book" />} />
  ),
  parameters: { route: '/app/settings' },
}

export const Tracer: Story = {
  render: () => <RoutedPage path="/app/tracer" element={<TracerPage />} />,
  parameters: { route: '/app/tracer' },
}

export const TracerTabs: Story = {
  render: () => <RoutedPage path="/app/tracer" element={<SeededTracerPage />} />,
  parameters: { route: '/app/tracer' },
}

export const TransactionInfo: Story = {
  render: () => <RoutedPage path="/txinfo" element={<SeededTxInfoPage defaultTab="stack" />} />,
  parameters: { route: '/txinfo' },
}

export const TransactionInfoLogs: Story = {
  render: () => <RoutedPage path="/txinfo" element={<SeededTxInfoPage defaultTab="logs" />} />,
  parameters: { route: '/txinfo' },
}

export const TransactionInfoRawYaml: Story = {
  render: () => (
    <RoutedPage
      path="/txinfo"
      element={<SeededTxInfoPage defaultTab="raw" defaultRawFormat="yaml" />}
    />
  ),
  parameters: { route: '/txinfo' },
}

export const TransactionInfoRawJson: Story = {
  render: () => (
    <RoutedPage
      path="/txinfo"
      element={<SeededTxInfoPage defaultTab="raw" defaultRawFormat="json" />}
    />
  ),
  parameters: { route: '/txinfo' },
}

export const AppLayout: Story = {
  render: () => (
    <Routes>
      <Route path="/app" element={<Layout />}>
        <Route index element={<IndexPage />} />
      </Route>
    </Routes>
  ),
  parameters: { route: '/app' },
}
