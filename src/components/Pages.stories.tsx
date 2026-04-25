import type { Meta, StoryObj } from '@storybook/react'
import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { IndexPage } from './IndexPage/IndexPage'
import { WalletPage } from './IndexPage/WalletPage'
import { AssetsPage } from './AssetsPage/AssetsPage'
import { NewWalletPage } from './NewWalletPage/NewWalletPage'
import { SettingsPage } from './SettingsPage/SettingsPage'
import { TracerPage } from './TracerPage/TracerPage'
import { TxInfoPage } from './TxInfoPage/TxInfoPage'
import { WalletsListPage } from './WalletsListPage/WalletsListPage'

function PageCanvas({ children }: { children: ReactNode }) {
  return <div className="bg-window-background p-6">{children}</div>
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
  render: () => <RoutedPage path="/app" element={<IndexPage />} />,
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
  render: () => <RoutedPage path="/app/wallets/:keyId/:walletId/assets" element={<AssetsPage />} />,
  parameters: { route: '/app/wallets/1/101/assets' },
}

export const Settings: Story = {
  render: () => <RoutedPage path="/app/settings" element={<SettingsPage />} />,
  parameters: { route: '/app/settings' },
}

export const Tracer: Story = {
  render: () => <RoutedPage path="/app/tracer" element={<TracerPage />} />,
  parameters: { route: '/app/tracer' },
}

export const TransactionInfo: Story = {
  render: () => <RoutedPage path="/txinfo" element={<TxInfoPage />} />,
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
