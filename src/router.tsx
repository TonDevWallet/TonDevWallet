import { createBrowserRouter } from 'react-router-dom'

import { IndexPage } from './components/IndexPage/IndexPage'
import { NewWalletPage } from './components/NewWalletPage/NewWalletPage'
import { WalletPage } from './components/IndexPage/WalletPage'
import { Layout } from './components/Layout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <IndexPage />,
      },
      {
        path: '/new_wallet',
        element: <NewWalletPage />,
      },
      {
        path: '/wallets/:walletId',
        element: <WalletPage />,
      },
    ],
  },
])
