import { createBrowserRouter } from 'react-router-dom'

import { IndexPage } from './components/IndexPage/IndexPage'
import { NewWalletPage } from './components/NewWalletPage/NewWalletPage'
import { WalletPage } from './components/IndexPage/WalletPage'
import { Layout } from './components/Layout'
import { TxInfoPage } from './components/TxInfoPage/TxInfoPage'
import { SettingsPage } from './components/SettingsPage/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/app',
    element: <Layout />,
    children: [
      {
        path: '/app',
        element: <IndexPage />,
      },
      {
        path: '/app/settings',
        element: <SettingsPage />,
      },
      {
        path: '/app/new_wallet',
        element: <NewWalletPage />,
      },

      {
        path: '/app/wallets/:walletId',
        element: <WalletPage />,
      },
    ],
  },
  {
    path: '/',
    children: [
      {
        path: '/txinfo',
        element: <TxInfoPage />,
      },
    ],
  },
])
