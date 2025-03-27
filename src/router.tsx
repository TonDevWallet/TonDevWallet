import { createBrowserRouter } from 'react-router-dom'

import { IndexPage } from './components/IndexPage/IndexPage'
import { NewWalletPage } from './components/NewWalletPage/NewWalletPage'
import { WalletPage } from './components/IndexPage/WalletPage'
import { Layout } from './components/Layout'
import { TxInfoPage } from './components/TxInfoPage/TxInfoPage'
import { SettingsPage } from './components/SettingsPage/SettingsPage'
import { TracerPage } from './components/TracerPage/TracerPage'
import { EditorPage } from './components/EditorPage/EditorPage'

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
        path: '/app/tracer',
        element: <TracerPage />,
      },
      {
        path: '/app/wallets/:walletId',
        element: <WalletPage />,
      },
      {
        path: '/app/editor',
        element: <EditorPage />,
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
